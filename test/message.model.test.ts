import { describe, test, expect, expectTypeOf, assert, beforeAll, afterAll, afterEach } from 'vitest'
import mongoose, { type InferSchemaType, type Types } from 'mongoose'

import { connectMemoryDb, disconnectMemoryDb, clearDb } from './helpers/mongo.ts'
import {
  Message, TextMessage, Call,
  type messageSchema, type textMessageSchema, type callSchema,
  type MessageDoc, type CallDoc, type TextMessageDoc,
} from '../app/model/message.model.ts'

// Type-only locks (validated by `tsc`; no-ops at runtime) for the Message/Call discriminator typing. These guard the
// exact mistake of mis-handling `datatype` in the composed doc types: `InferSchemaType` reads the schema DEFINITION,
// while the discriminator key is injected via schema OPTIONS (`discriminatorKey`), so `datatype` is NEVER in the
// inferred base type -- meaning no `Omit<..., 'datatype'>` is needed and the per-branch literal is its only source. If a
// mongoose change ever started leaking `datatype` into `InferSchemaType`, the first test below fails loudly.

describe('message model discriminator types', () => {
  test('InferSchemaType of the base schema does NOT include the discriminatorKey `datatype`', () => {
    type Base = InferSchemaType<typeof messageSchema>
    expectTypeOf<Base>().not.toHaveProperty('datatype')
    // ...but it does include the declared base paths, typed from the schema:
    expectTypeOf<Base>().toHaveProperty('sid').toEqualTypeOf<string>()
    expectTypeOf<Base>().toHaveProperty('type').toEqualTypeOf<'send' | 'receive'>()
  })

  test('discriminator schemas contribute ONLY their own extra fields (no datatype, no base fields)', () => {
    expectTypeOf<InferSchemaType<typeof textMessageSchema>>().not.toHaveProperty('datatype')
    expectTypeOf<InferSchemaType<typeof textMessageSchema>>().toHaveProperty('message')
    expectTypeOf<InferSchemaType<typeof textMessageSchema>>().toHaveProperty('media')
    expectTypeOf<InferSchemaType<typeof textMessageSchema>>().not.toHaveProperty('sid')
    expectTypeOf<InferSchemaType<typeof callSchema>>().toHaveProperty('duration')
    expectTypeOf<InferSchemaType<typeof callSchema>>().not.toHaveProperty('message')
  })

  test('composed doc types are a discriminated union with the literal datatype per branch', () => {
    expectTypeOf<MessageDoc>().toEqualTypeOf<TextMessageDoc | CallDoc>()

    // datatype is the literal discriminant on each branch (proof the per-branch stamp supplies it, not InferSchemaType).
    expectTypeOf<CallDoc>().toHaveProperty('datatype').toEqualTypeOf<'call'>()
    expectTypeOf<TextMessageDoc>().toHaveProperty('datatype').toEqualTypeOf<'message'>()

    // branch-specific fields land only on their branch...
    expectTypeOf<CallDoc>().toHaveProperty('duration')
    expectTypeOf<CallDoc>().not.toHaveProperty('message')
    expectTypeOf<TextMessageDoc>().toHaveProperty('message')
    expectTypeOf<TextMessageDoc>().not.toHaveProperty('duration')

    // ..._id is present on both (InferSchemaType omits it; CommonFields adds it back).
    expectTypeOf<CallDoc>().toHaveProperty('_id').toEqualTypeOf<Types.ObjectId>()
    expectTypeOf<TextMessageDoc>().toHaveProperty('_id').toEqualTypeOf<Types.ObjectId>()

    // number is present on both
    expectTypeOf<CallDoc>().toHaveProperty('number').toEqualTypeOf<string>()
    expectTypeOf<TextMessageDoc>().toHaveProperty('number').toEqualTypeOf<string>()
  })
})

// The flip side of the type lock: `datatype` is absent from the inferred TYPE but mongoose DOES write it onto every
// record (that's what the discriminatorKey is for). This is exactly why MessageDoc stamps the literal back on -- so the
// static type matches what's really stored. Here we assert the value is genuinely persisted at runtime.
describe('the discriminatorKey IS stored on the actual record (runtime)', () => {
  beforeAll(connectMemoryDb)
  afterAll(disconnectMemoryDb)
  afterEach(clearDb)

  const baseFields = () => ({
    sid: `s-${new mongoose.Types.ObjectId().toString()}`,
    user: new mongoose.Types.ObjectId(),
    number: '+15555555555',
    telnyx_number: '+19990000000',
    isview: false,
    setting: new mongoose.Types.ObjectId(),
  })

  test('TextMessage / Call records carry datatype even though InferSchemaType omits it', async () => {
    const textSid = (await TextMessage.create({ ...baseFields(), type: 'receive', message: 'hi' })).sid
    const callSid = (await Call.create({ ...baseFields(), type: 'send' })).sid

    // Read via the union type: the stored value is really there.
    const text = await Message.findOne({ sid: textSid }).lean<MessageDoc>()
    const call = await Message.findOne({ sid: callSid }).lean<MessageDoc>()
    assert(text)
    assert(call)
    expect(text.datatype).toBe('message')
    expect(call.datatype).toBe('call')
    expectTypeOf(text).toHaveProperty('datatype') // union type has discriminator property 
    expectTypeOf(text.datatype).toEqualTypeOf<'message' | 'call'>()
    expectTypeOf(call.datatype).toEqualTypeOf<'message' | 'call'>()

    // And via the BASE `.lean()` (whose inferred type has no `datatype`): the key is still on the raw object at runtime.
    const raw = await Message.findOne({ sid: textSid }).lean()
    assert(raw)
    expectTypeOf(raw).not.toHaveProperty('datatype') // compile-time: base lean type omits it
    expect(raw).toHaveProperty('datatype') // runtime: the record has it anyway
  })
})
