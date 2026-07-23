import { test, expect, assert } from 'vitest'
import mongoose from 'mongoose'
import Contact from '../app/model/contact.model.ts'

// The contact schema's string fields use the custom `EmptyString` SchemaType (shared/schema/contact.ts)
// its `checkRequired` returns true for any string, accepting empty string '', triggered on `required`
// a plain `required: String` rejects empty string
const userId = new mongoose.Types.ObjectId()

test('required EmptyString fields accept empty strings', async () => {
  const doc = new Contact({ first_name: '', last_name: '', number: '', note: '', user: userId })
  await expect(doc.validate()).resolves.toBeUndefined()
})

test('required EmptyString fields accept normal strings', async () => {
  const doc = new Contact({
    first_name: 'Ada',
    last_name: 'Lovelace',
    number: '+15551234567',
    note: 'hi',
    user: userId,
  })
  await expect(doc.validate()).resolves.toBeUndefined()
})

test('a missing (undefined) required string field fails the required validator', async () => {
  const doc = new Contact({ last_name: '', number: '', note: '', user: userId }) // first_name omitted
  const err = await doc.validate().catch((e: unknown) => e)
  assert.instanceOf(err, mongoose.Error.ValidationError)
  expect(err.errors.first_name?.kind).toBe('required')
})

test('null fails the required validator (not a string)', async () => {
  const doc = new Contact({ first_name: null, last_name: '', number: '', note: '', user: userId })
  const err = await doc.validate().catch((e: unknown) => e)
  assert.instanceOf(err, mongoose.Error.ValidationError)
  expect(err.errors.first_name?.kind).toBe('required')
})

test('user (a plain required ObjectId) is still required', async () => {
  const doc = new Contact({ first_name: '', last_name: '', number: '', note: '' })
  const err = await doc.validate().catch((e: unknown) => e)
  assert.instanceOf(err, mongoose.Error.ValidationError)
  expect(err.errors.user?.kind).toBe('required')
})

// Contrast: a plain `required: String` rejects '' -- the exact behaviour EmptyString overrides.
test('a plain required String rejects empty string (control)', async () => {
  const Plain = mongoose.model('PlainReqString', new mongoose.Schema({ name: { type: String, required: true } }))
  const err = await new Plain({ name: '' }).validate().catch((e: unknown) => e)
  assert.instanceOf(err, mongoose.Error.ValidationError)
  expect(err.errors.name?.kind).toBe('required')
})
