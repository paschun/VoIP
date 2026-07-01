import { describe, test, expect, expectTypeOf, assert, beforeAll, afterAll, afterEach } from 'vitest'
import type { InferResponseType } from 'hono/client'
import { testClient } from 'hono/testing'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import mongoose from 'mongoose'
import { conversationsForProfile, type ConversationRow } from '../app/controller/setting.controller.ts'
import { signToken } from '../app/helper/common.helper.ts'
import Contact from '../app/model/contact.model.ts'
import { TextMessage, Call } from '../app/model/message.model.ts'
import { settingRoutes } from '../app/routes/setting.route.ts'
import { connectMemoryDb, disconnectMemoryDb, clearDb } from './helpers/mongo.ts'

// Exercises the `aggregateConversations` pipeline (via the extracted `conversationsForProfile`): the $group collapse,
// the unread $sum, the newest-first ordering (which $group does NOT preserve -- the post-group $sort does), and what
// `Contact.populate` does to a row whose grouped `contact` is null. Data is seeded with insertMany.
//
// The `GET /conversations` block drives the same pipeline through the real RPC handler (auth + `c.json`): it proves the
// wire shape (ObjectId/Date as strings, `contact` WITHOUT `_id`) and that the RPC-inferred client type matches it.

const userId = new mongoose.Types.ObjectId()
const profileId = new mongoose.Types.ObjectId()

const client = testClient(settingRoutes)
let auth: { headers: { token: string } }

// The RPC-inferred wire row: `ConversationRow` after JSON serialization (Date -> ISO string).
type WireRow = InferResponseType<typeof client.conversations.$get, SuccessStatusCode>['data'][number]

beforeAll(async () => {
  await connectMemoryDb()
  auth = { headers: { token: await signToken(userId.toString(), 'Test User') } }
})
afterAll(disconnectMemoryDb)
afterEach(clearDb)

/** A valid text-message row for `profileId`/`userId`; override `number`/`created_at`/etc. per case. */
const msg = (over: Record<string, unknown>) => ({
  sid: 'sid',
  user: userId,
  telnyx_number: '+19990000000',
  type: 'receive' as const,
  isview: false,
  setting: profileId,
  ...over,
})

describe('conversationsForProfile', () => {
  test('one row per number, the latest message per conversation, ordered newest-first', async () => {
    await TextMessage.insertMany([
      msg({ number: '+11111111111', message: 'old', created_at: new Date('2026-01-01') }),
      msg({ number: '+11111111111', message: 'newest', created_at: new Date('2026-03-01') }),
      msg({ number: '+12222222222', message: 'middle', created_at: new Date('2026-02-01') }),
    ])

    const rows = await conversationsForProfile(userId.toString(), profileId.toString())

    expect(rows).toHaveLength(2)
    // $group keys on the other-party number; rows come back newest-first thanks to the post-group $sort.
    expect(rows.map((r) => r._id)).toEqual(['+11111111111', '+12222222222'])
    assert(rows[0])
    assert(rows[1])
    expect(rows[0].message).toBe('newest') // $first after the pre-group sort = latest message in the conversation
    expect(rows[0].created_at.getTime()).toBe(new Date('2026-03-01').getTime())
    expect(rows[1].message).toBe('middle')
  })

  test('isview sums only the unread (isview:false) messages in the conversation', async () => {
    await TextMessage.insertMany([
      msg({ number: '+13333333333', message: 'a', isview: false, created_at: new Date('2026-01-01') }),
      msg({ number: '+13333333333', message: 'b', isview: false, created_at: new Date('2026-01-02') }),
      msg({ number: '+13333333333', message: 'c', isview: true, created_at: new Date('2026-01-03') }),
    ])

    const rows = await conversationsForProfile(userId.toString(), profileId.toString())
    assert(rows[0])
    expect(rows[0].unread).toBe(2)
  })

  test('a call row carries datatype "call"; the grouped message field is null (calls have no body)', async () => {
    await Call.insertMany([msg({ number: '+14444444444', duration: 42, created_at: new Date('2026-01-01') })])

    const rows = await conversationsForProfile(userId.toString(), profileId.toString())
    assert(rows[0])
    expect(rows[0].message_type).toBe('call')
    expect(rows[0].message).toBeNull()
  })

  test('Contact.populate leaves a null grouped contact as null, and fills a set one with the selected fields', async () => {
    const contact = await Contact.create({
      user: userId,
      number: '+15555555555',
      first_name: 'Ada',
      last_name: 'Lovelace',
      note: '',
    })
    await TextMessage.insertMany([
      msg({ number: '+15555555555', message: 'has contact', contact: contact._id, created_at: new Date('2026-02-01') }),
      msg({ number: '+16666666666', message: 'no contact', created_at: new Date('2026-01-01') }),
    ])

    const rows = await conversationsForProfile(userId.toString(), profileId.toString())
    const withContact = rows.find((r) => r._id === '+15555555555')
    const without = rows.find((r) => r._id === '+16666666666')

    assert(withContact)
    assert(without)

    expect(withContact.contact).toStrictEqual({ first_name: 'Ada', last_name: 'Lovelace' })
    expect(withContact.contact).not.toHaveProperty('_id')
    expect(withContact.contact).not.toBeInstanceOf(mongoose.Document) // check if it's lean
    // populate on a null path is a no-op -> the row's contact stays null (not undefined, not a thrown error)
    expect(without.contact).toBeNull()
  })

  test('the full row is exactly the ConversationRow shape -- no leaked keys, contact is a POJO not a hydrated doc', async () => {
    const contact = await Contact.create({
      user: userId,
      number: '+15555555555',
      first_name: 'Ada',
      last_name: 'Lovelace',
      note: '',
    })
    await TextMessage.insertMany([
      msg({
        number: '+15555555555',
        message: 'has contact',
        contact: contact._id,
        isview: false,
        created_at: new Date('2026-02-01'),
      }),
    ])

    const rows = await conversationsForProfile(userId.toString(), profileId.toString())
    const row = rows[0]
    assert(row)
    // toStrictEqual: any extra key (e.g. a leaked `_id`) OR a non-POJO prototype (a hydrated Contact doc from a
    // lean-less populate) fails this. It pins the whole runtime row to exactly what ConversationRow claims.
    expect(row).toStrictEqual({
      _id: '+15555555555',
      message: 'has contact',
      created_at: new Date('2026-02-01'),
      contact: { first_name: 'Ada', last_name: 'Lovelace' },
      message_type: 'message',
      type: 'receive',
      telnyx_number: '+19990000000',
      unread: 1,
    })
    expectTypeOf(row).toEqualTypeOf<ConversationRow>()
  })
})

describe('GET /conversations -- RPC route (aggregateConversations)', () => {
  test('returns the collapsed rows for the authed user/profile through the real handler', async () => {
    await TextMessage.insertMany([
      msg({ number: '+11111111111', message: 'old', isview: true, created_at: new Date('2026-01-01') }),
      msg({ number: '+11111111111', message: 'newest', isview: false, created_at: new Date('2026-03-01') }),
      msg({ number: '+12222222222', message: 'middle', isview: false, created_at: new Date('2026-02-01') }),
    ])

    const res = await client.conversations.$get({ query: { profile: profileId.toString() } }, auth)
    assert(res.status === 200)
    const body = await res.json()

    expect(body.data.map((r) => r._id)).toEqual(['+11111111111', '+12222222222'])
    assert(body.data[0])
    expect(body.data[0].message).toBe('newest')
    expect(body.data[0].unread).toBe(1)

    // Date serializes to an ISO string over the wire, and the RPC client type agrees.
    expect(new Date(body.data[0].created_at).toISOString()).toBe(body.data[0].created_at)
    expectTypeOf(body.data[0]._id).toEqualTypeOf<string>()
    expectTypeOf(body.data[0].created_at).toEqualTypeOf<string>()
  })

  test('the contact subset is exactly first_name/last_name -- no _id leaks over the wire', async () => {
    const contact = await Contact.create({
      user: userId,
      number: '+15555555555',
      first_name: 'Ada',
      last_name: 'Lovelace',
      note: '',
    })
    await TextMessage.insertMany([
      msg({ number: '+15555555555', message: 'has contact', contact: contact._id, created_at: new Date('2026-02-01') }),
    ])

    const res = await client.conversations.$get({ query: { profile: profileId.toString() } }, auth)
    assert(res.status === 200)
    const body = await res.json()

    assert(body.data[0])
    expect(body.data[0].contact).toStrictEqual({ first_name: 'Ada', last_name: 'Lovelace' })
    // The RPC-inferred type promises no `_id` on `contact`; the runtime must match it.
    expectTypeOf(body.data[0].contact).toEqualTypeOf<{ first_name: string; last_name: string } | null>()
  })

  test('the full wire-serialized row is exactly the expected shape (created_at as an ISO string)', async () => {
    const contact = await Contact.create({
      user: userId,
      number: '+15555555555',
      first_name: 'Ada',
      last_name: 'Lovelace',
      note: '',
    })
    await TextMessage.insertMany([
      msg({
        number: '+15555555555',
        message: 'has contact',
        contact: contact._id,
        isview: false,
        created_at: new Date('2026-02-01'),
      }),
    ])

    const res = await client.conversations.$get({ query: { profile: profileId.toString() } }, auth)
    assert(res.status === 200)
    const body = await res.json()

    // The inferred client type is exactly ConversationRow after JSON serialization: `created_at` is a `string` and
    // `contact` carries no `_id`. (Spelled as a flat literal because `toEqualTypeOf` is strict about the optional/
    // mapped-type form of `Omit<ConversationRow, ...> & { created_at: string }`, even though they're equivalent.)
    expectTypeOf<WireRow>().toEqualTypeOf<{
      type: 'send' | 'receive'
      message: string | null
      created_at: string
      telnyx_number: string
      _id: string
      contact: { first_name: string; last_name: string } | null
      message_type: 'message' | 'call'
      unread: number
    }>()

    // Pins the post-`c.json` shape: `created_at` is an ISO string (Date serialized), and nothing else leaked.
    assert(body.data[0])
    expect(body.data[0]).toStrictEqual({
      _id: '+15555555555',
      message: 'has contact',
      created_at: '2026-02-01T00:00:00.000Z',
      contact: { first_name: 'Ada', last_name: 'Lovelace' },
      message_type: 'message',
      type: 'receive',
      telnyx_number: '+19990000000',
      unread: 1,
    })
    expectTypeOf(body.data[0]).toEqualTypeOf<WireRow>()
  })

  test("a different user sees none of this profile's conversations", async () => {
    await TextMessage.create(msg({ number: '+11111111111', message: 'mine', created_at: new Date('2026-01-01') }))
    const otherAuth = { headers: { token: await signToken(new mongoose.Types.ObjectId().toString(), 'Other') } }

    const res = await client.conversations.$get({ query: { profile: profileId.toString() } }, otherAuth)
    assert(res.status === 200)
    expect((await res.json()).data).toEqual([])
  })
})
