import { describe, test, expect, expectTypeOf, beforeAll, afterAll, afterEach, assert } from 'vitest'
import { testClient } from 'hono/testing'
import mongoose from 'mongoose'
import { signToken } from '../app/middleware/auth.ts'
import { TextMessage } from '../app/model/message.model.ts'
import Setting from '../app/model/setting.model.ts'
import { profileRoutes } from '../app/routes/profile.route.ts'
import { connectMemoryDb, disconnectMemoryDb, clearDb } from './helpers/mongo.ts'

// End-to-end tests of the only two routes that use the count virtuals (`getProfiles`/`getProfile`): they `.populate()`
// `messageCount`/`totalCount`, so this is where we prove (a) the virtuals serialize as the numbers our `SettingDoc`
// claims and (b) ObjectId/Date come across as strings -- through the real controller + auth + `c.json`, no stubs.

const client = testClient(profileRoutes)
const userId = new mongoose.Types.ObjectId().toString()
let auth: { headers: { Authorization: string } }

beforeAll(async () => {
  await connectMemoryDb()
  auth = { headers: { Authorization: `Bearer ${await signToken(userId, 'Test User')}` } }
})
afterAll(disconnectMemoryDb)
afterEach(clearDb)

/** Seed one message for a profile (the count virtuals only care about setting/user/isview; the rest are just required). */
const seedMessage = (setting: mongoose.Types.ObjectId, isview: boolean) =>
  TextMessage.create({
    sid: 'sid',
    number: '+10000000000',
    telnyx_number: '+19999999999',
    type: 'receive',
    setting,
    user: userId,
    isview,
  })

describe('GET /api/profile -- list with populated count virtuals', () => {
  test("messageCount = this profile's unread; totalCount = the user's unread (read msgs excluded)", async () => {
    const mine = await Setting.create({ user: userId, profile: 'Work', type: 'twilio' })
    const other = await Setting.create({ user: userId, profile: 'Side', type: 'telnyx' })
    await seedMessage(mine._id, false)
    await seedMessage(mine._id, false)
    await seedMessage(other._id, false)
    await seedMessage(mine._id, true) // read -> excluded by the populate match

    const res = await client.index.$get({}, auth)
    expect(res.status).toBe(200)
    if (res.status !== 200) return
    const body = await res.json()

    const work = body.data.find((p) => p.profile === 'Work')
    assert(work)
    expect(work.messageCount).toBe(2) // unread for this setting only
    expect(work.totalCount).toBe(3) // unread across all the user's settings
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
    await seedMessage(mine._id, false)

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

describe('PATCH /api/profile/:id -- rename', () => {
  test('renames an owned profile and returns the updated doc', async () => {
    const mine = await Setting.create({ user: userId, profile: 'Work', type: 'twilio' })
    const res = await client[':id'].$patch({ param: { id: mine._id.toString() }, json: { profile: 'Biz' } }, auth)
    expect(res.status).toBe(200)
    if (res.status !== 200) return
    const body = await res.json()
    expect(body.data.profile).toBe('Biz')
    const saved = await Setting.findById(mine._id).orFail()
    expect(saved.profile).toBe('Biz')
  })

  test("404s for an id the user does not own; 409s on a duplicate name", async () => {
    const foreign = await Setting.create({ user: new mongoose.Types.ObjectId().toString(), profile: 'Their', type: 'twilio' })
    const notMine = await client[':id'].$patch({ param: { id: foreign._id.toString() }, json: { profile: 'X' } }, auth)
    expect(notMine.status).toBe(404)

    const a = await Setting.create({ user: userId, profile: 'A', type: 'twilio' })
    await Setting.create({ user: userId, profile: 'B', type: 'twilio' })
    const dup = await client[':id'].$patch({ param: { id: a._id.toString() }, json: { profile: 'B' } }, auth)
    expect(dup.status).toBe(409)
  })
})

describe('POST /api/profile/provider -- per-provider required credentials', () => {
  test('422s when provider credentials are blank (the old silent rename fallback)', async () => {
    const mine = await Setting.create({ user: userId, profile: 'Work', type: 'telnyx' })
    const res = await client.provider.$post(
      { json: { type: 'telnyx', profile: 'Renamed', setting: mine._id.toString(), override: false, api_key: '', number: '', sid: '' } },
      auth,
    )
    expect(res.status).toBe(422)
    const saved = await Setting.findById(mine._id).orFail()
    expect(saved.profile).toBe('Work') // no rename side effect
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
