import { describe, test, expect, expectTypeOf, assert, beforeAll, afterAll, afterEach } from 'vitest'
import mongoose from 'mongoose'
import { testClient } from 'hono/testing'
import type { InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'

import { connectMemoryDb, disconnectMemoryDb, clearDb } from './helpers/mongo.ts'
import { signToken } from '../app/helper/common.helper.ts'
import { settingRoutes } from '../app/routes/setting.route.ts'
import { TextMessage, Call } from '../app/model/message.model.ts'

// Proves the Message/Call discriminator flows all the way to the RPC client as a DISCRIMINATED UNION: `listMessages`
// reads the base model as `MessageDoc` and shapes each row by `datatype`, so the inferred client row is
// `{ datatype:'call', duration } | { datatype:'message', message, media }`, not one flattened all-optional object.
//
// Two layers: the `expectTypeOf<...>()` assertions are pure COMPILE-TIME checks (no-ops at runtime -- they only bite
// when `tsc` type-checks this file), proving the static union shape; the runtime test hits the real route and narrows
// with `assert(...)` to prove the values + narrowing match the types.

const client = testClient(settingRoutes)
const userId = new mongoose.Types.ObjectId().toString()
const profileId = new mongoose.Types.ObjectId().toString()
let auth: { headers: { token: string } }

beforeAll(async () => {
  await connectMemoryDb()
  auth = { headers: { token: await signToken(userId, 'Test User') } }
})
afterAll(disconnectMemoryDb)
afterEach(clearDb)

// The row type the RPC client infers for the conversation-messages endpoint.
type Row = InferResponseType<typeof client.conversations.messages.$post, SuccessStatusCode>['data'][number]
type CallRow = Extract<Row, { datatype: 'call' }>
type TextRow = Extract<Row, { datatype: 'message' }>

describe('listMessages surfaces a discriminated union over RPC', () => {
  test('the inferred row type partitions keys by datatype (compile-time)', () => {
    // Both branches exist => `Row` is a real union keyed on `datatype`, not a single merged object.
    expectTypeOf<CallRow>().not.toBeNever()
    expectTypeOf<TextRow>().not.toBeNever()

    // `duration` lives only on the call branch...
    expectTypeOf<CallRow>().toHaveProperty('duration')
    expectTypeOf<TextRow>().not.toHaveProperty('duration')

    // ...and `message`/`media` only on the text branch.
    expectTypeOf<TextRow>().toHaveProperty('message')
    expectTypeOf<TextRow>().toHaveProperty('media')
    expectTypeOf<CallRow>().not.toHaveProperty('message')
    expectTypeOf<CallRow>().not.toHaveProperty('media')

    // datatype is the literal discriminant on each branch.
    expectTypeOf<CallRow>().toHaveProperty('datatype').toEqualTypeOf<'call'>()
    expectTypeOf<TextRow>().toHaveProperty('datatype').toEqualTypeOf<'message'>()
  })

  test('the real route returns rows the client narrows on datatype (runtime + types)', async () => {
    const common = { user: userId, number: '+15555555555', telnyx_number: '+19990000000', setting: profileId }
    await TextMessage.create({ ...common, sid: 't1', type: 'receive', isview: false, message: 'hello', media: ['https://x/a.png'] })
    await Call.create({ ...common, sid: 'c1', type: 'send', isview: true, duration: 42 })

    const res = await client.conversations.messages.$post(
      { json: { number: { telnyx_number: '+19990000000', _id: '+15555555555' }, profile: profileId } },
      auth,
    )
    assert(res.status === 200) // narrows res so res.json() is the success body
    const body = await res.json()
    expect(body.data).toHaveLength(2)

    const callRow = body.data.find((r) => r.datatype === 'call') // type narrows here by array methods' "inferred type predicates"
    expectTypeOf(callRow).toEqualTypeOf<CallRow | undefined>()
    assert(callRow, 'expected a call row') // strips `undefined`
    expectTypeOf(callRow).toEqualTypeOf<CallRow>()
    expectTypeOf(callRow).toHaveProperty('duration')
    expectTypeOf(callRow).not.toHaveProperty('message')
    expect(callRow.duration).toBe(42)

    const textRow = body.data.find((r) => r.datatype === 'message')
    expectTypeOf(textRow).toEqualTypeOf<TextRow | undefined>()
    assert(textRow, 'expected a text row')
    expectTypeOf(textRow).toEqualTypeOf<TextRow>()
    expectTypeOf(textRow).not.toHaveProperty('duration')
    expectTypeOf(textRow).toHaveProperty('message')
    expect(textRow.message).toBe('hello')
    expect(textRow.media).toEqual(['https://x/a.png'])
  })
})
