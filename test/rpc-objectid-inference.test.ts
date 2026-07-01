import { describe, test, expect, expectTypeOf, assert } from 'vitest'
import { Hono } from 'hono'
import type { InferResponseType } from 'hono/client'
import { testClient } from 'hono/testing'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { Types } from 'mongoose'

// Question: if a handler hands `c.json()` an object whose `_id` is a `Types.ObjectId` (e.g. a raw `.lean()` row that
// wasn't `.toString()`-ed), what does the RPC client infer for `_id`?
//
// Answer: `string`. hono's response-type transform models JSON serialization, and honors `toJSON`. bson's `ObjectId`
// declares `toJSON(): string`, so the client sees `_id: string` -- which matches runtime, where `JSON.stringify` calls
// `toJSON` and emits the 24-char hex string. (Even so, `listMessages` calls `.toString()` explicitly: clearer, and it
// doesn't lean on hono knowing about bson.)

const app = new Hono().get('/thing', (c) => {
  const _id = new Types.ObjectId()
  return c.json({ _id, nested: { id: _id }, list: [{ _id }] })
})

const client = testClient(app)
type Body = InferResponseType<typeof client.thing.$get, SuccessStatusCode>

describe('hono RPC infers Types.ObjectId as string (via toJSON)', () => {
  test('the client sees ObjectId fields as string, at any nesting depth (compile-time)', () => {
    expectTypeOf<Body['_id']>().toEqualTypeOf<string>()
    expectTypeOf<Body['nested']['id']>().toEqualTypeOf<string>()
    expectTypeOf<Body['list'][number]['_id']>().toEqualTypeOf<string>()
  })

  test('and the runtime value really is the 24-char hex string', async () => {
    const res = await client.thing.$get()
    assert(res.status === 200)
    const body = await res.json()
    expect(typeof body._id).toBe('string')
    expect(body._id).toMatch(/^[a-f0-9]{24}$/)
  })
})
