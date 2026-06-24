import { describe, test, expect, expectTypeOf, beforeAll, afterAll, afterEach, assert } from 'vitest'
import mongoose from 'mongoose'
import { testClient } from 'hono/testing'

import { connectMemoryDb, disconnectMemoryDb, clearDb } from './helpers/mongo.ts'
import { signToken } from '../app/helper/common.helper.ts'
import { profileRoutes } from '../app/routes/profile.route.ts'
import Setting from '../app/model/setting.model.ts'
import Message from '../app/model/message.model.ts'

// End-to-end tests of the only two routes that use the count virtuals (`getProfiles`/`getProfile`): they `.populate()`
// `messageCount`/`totalCount`, so this is where we prove (a) the virtuals serialize as the numbers our `SettingDoc`
// claims and (b) ObjectId/Date come across as strings -- through the real controller + auth + `c.json`, no stubs.

const client = testClient(profileRoutes)
const userId = new mongoose.Types.ObjectId().toString()
let auth: { headers: { token: string } }

beforeAll(async () => {
  await connectMemoryDb()
  auth = { headers: { token: await signToken(userId, 'Test User') } }
})
afterAll(disconnectMemoryDb)
afterEach(clearDb)

describe('GET /api/profile -- list with populated count virtuals', () => {
  test('messageCount = this profile\'s unread; totalCount = the user\'s unread (read msgs excluded)', async () => {
    const mine = await Setting.create({ user: userId, profile: 'Work', type: 'twilio' })
    const other = await Setting.create({ user: userId, profile: 'Side', type: 'telnyx' })
    await Message.create({ setting: mine._id, user: userId, isview: 'false' })
    await Message.create({ setting: mine._id, user: userId, isview: 'false' })
    await Message.create({ setting: other._id, user: userId, isview: 'false' })
    await Message.create({ setting: mine._id, user: userId, isview: 'true' }) // read -> excluded by the populate match

    const res = await client.index.$get({}, auth)
    expect(res.status).toBe(200)
    if (res.status !== 200) return
    const body = await res.json()

    const work = body.data.find(p => p.profile === 'Work')
    assert(work)
    expect(work.messageCount).toBe(2) // unread for this setting only
    expect(work.totalCount).toBe(3)   // unread across all the user's settings
    expect(typeof work._id).toBe('string')
    expect(typeof work.created_at).toBe('string')
    expect(new Date(work.created_at).toISOString()).toBe(work.created_at)

    // ...and the RPC-inferred type matches that runtime shape (compile-time assertions)
    expectTypeOf(work.messageCount).toEqualTypeOf<number>()
    expectTypeOf(work.totalCount).toEqualTypeOf<number>()
    expectTypeOf(work._id).toEqualTypeOf<string>()
    expectTypeOf(work.created_at).toEqualTypeOf<string>()
  })

  test('a user with no profiles gets 200 and an empty list, not a 404', async () => {
    const res = await client.index.$get({}, auth)
    expect(res.status).toBe(200)
    if (res.status !== 200) return
    const body = await res.json()
    expect(body.data).toEqual([])
  })
})

describe('GET /api/profile/:id -- single profile detail', () => {
  test('returns the populated count for one owned profile', async () => {
    const mine = await Setting.create({ user: userId, profile: 'Work', type: 'twilio' })
    await Message.create({ setting: mine._id, user: userId, isview: 'false' })

    const res = await client[':id'].$get({ param: { id: mine._id.toString() } }, auth)
    expect(res.status).toBe(200)
    if (res.status !== 200) return
    const body = await res.json()
    expect(body.data.messageCount).toBe(1)
    expect(body.data._id).toBe(mine._id.toString())
  })

  test('404s for an id the user does not own', async () => {
    const res = await client[':id'].$get({ param: { id: new mongoose.Types.ObjectId().toString() } }, auth)
    expect(res.status).toBe(404)
  })
})

describe('POST /api/profile -- create returns a profile without counts', () => {
  test('count virtuals are absent on the create response (not populated)', async () => {
    const res = await client.index.$post({ json: { profile: 'Fresh' } }, auth)
    expect(res.status).toBe(201)
    if (res.status !== 201) return
    const body = await res.json()
    expect(body.data.profile).toBe('Fresh')
    expect('messageCount' in body.data).toBe(false)
    expect('totalCount' in body.data).toBe(false)
  })
})
