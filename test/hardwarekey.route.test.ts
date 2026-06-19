import { describe, test, expect, expectTypeOf, beforeAll, afterAll, afterEach } from 'vitest'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { testClient } from 'hono/testing'

import { connectMemoryDb, disconnectMemoryDb, clearDb } from './helpers/mongo.ts'
import { signToken } from './helpers/auth.ts'
import { hardwarekeyRoutes } from '../app/routes/hardwarekey.route.ts'
import Hardwarekey from '../app/model/hardwarekey.model.ts'

// `credentials` is a `string[]` schema field -- this proves it survives the `c.json` boundary as a plain array of
// strings (not stringified, not mangled) on the real `GET /api/hardwarekey` route.

const client = testClient(hardwarekeyRoutes)
const userId = new mongoose.Types.ObjectId().toString()
let auth: { headers: { token: string } }

beforeAll(async () => {
  await connectMemoryDb()
  auth = { headers: { token: await signToken(userId) } }
})
afterAll(disconnectMemoryDb)
afterEach(clearDb)

describe('GET /api/hardwarekey -- list the caller\'s keys', () => {
  test('credentials round-trips as string[]; ObjectId -> string', async () => {
    await Hardwarekey.create({ user: userId, title: 'YubiKey', credentials: ['credA', 'credB'], registrationComplete: true })

    const res = await client.index.$get({}, auth)
    expect(res.status).toBe(200)
    if (res.status !== 200) return
    const body = await res.json()

    const [key] = body.data
    assert(key)
    expect(key.credentials).toEqual(['credA', 'credB'])
    expect(typeof key._id).toBe('string')
    expectTypeOf(key.credentials).toEqualTypeOf<string[]>()
  })

  test('only completed registrations are listed', async () => {
    await Hardwarekey.create({ user: userId, title: 'Pending', credentials: [], registrationComplete: false })
    const res = await client.index.$get({}, auth)
    if (res.status !== 200) return
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })
})
