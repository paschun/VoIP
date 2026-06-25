import { describe, test, expect, expectTypeOf, beforeAll, afterAll, afterEach, assert } from 'vitest'
import mongoose from 'mongoose'
import { testClient } from 'hono/testing'

import { connectMemoryDb, disconnectMemoryDb, clearDb } from './helpers/mongo.ts'
import { signToken } from '../app/helper/common.helper.ts'
import { hardwarekeyRoutes } from '../app/routes/hardwarekey.route.ts'
import HardwareKey from '../app/model/hardwarekey.model.ts'

// `credentials` is a `string[]` schema field -- this proves it survives the `c.json` boundary as a plain array of
// strings (not stringified, not mangled) on the real `GET /api/hardwarekey` route.

const client = testClient(hardwarekeyRoutes)
const userId = new mongoose.Types.ObjectId().toString()
let auth: { headers: { token: string } }

beforeAll(async () => {
  await connectMemoryDb()
  auth = { headers: { token: await signToken(userId, 'Test User') } }
})
afterAll(disconnectMemoryDb)
afterEach(clearDb)

describe('GET /api/hardwarekey -- list the caller\'s keys', () => {
  test('lists title + stringified id for completed keys', async () => {
    await HardwareKey.create({ user: userId, title: 'YubiKey', userHandle: 'uh-yubikey', credentialId: 'credA', registrationComplete: true })

    const res = await client.index.$get({}, auth)
    expect(res.status).toBe(200)
    if (res.status !== 200) return
    const body = await res.json()

    const [key] = body.data
    assert(key)
    expect(key.title).toBe('YubiKey')
    expect(typeof key._id).toBe('string')
    expectTypeOf(key.title).toEqualTypeOf<string>()
  })

  test('only completed registrations are listed', async () => {
    await HardwareKey.create({ user: userId, title: 'Pending', userHandle: 'uh-pending', registrationComplete: false })
    const res = await client.index.$get({}, auth)
    if (res.status !== 200) return
    const body = await res.json()
    expect(body.data).toHaveLength(0)
  })
})
