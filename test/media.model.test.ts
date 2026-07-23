import { test, expect, assert } from 'vitest'
import mongoose from 'mongoose'
import Media from '../app/model/media.model.ts'
import { mediaSchema } from '../shared/schema/media.ts'

// The Media schema now lives in `shared/schema/media.ts` (single source of truth) and both fields are `required`,
// since the controller always sets them on `Media.create({ media, user })`. These tests pin that contract.

test('media and user are both required', async () => {
  const mediaDoc = new Media({ media: '' })
  const err = await mediaDoc.validate().then(() => undefined, (e: unknown) => e)
  assert.instanceOf(err, mongoose.Error.ValidationError)
  expect(err.errors.media).toBeDefined()
  expect(err.errors.media?.kind).toBe('required')
  expect(err.errors.user).toBeDefined()
})

test('casts a string user id to an ObjectId and keeps media as a string', async () => {
  const oid = '507f1f77bcf86cd799439011'
  const doc = new Media({ media: 'uploads/x.png', user: oid })
  expect(doc.media).toBe('uploads/x.png')
  expect(doc.user).toBeInstanceOf(mongoose.Types.ObjectId)
  expect(doc.user?.toString()).toBe(oid)
  await expect(doc.validate()).resolves.toBeUndefined()
})

test('user references the User model', () => {
  expect(mediaSchema.path('user').options.ref).toBe('User')
})
