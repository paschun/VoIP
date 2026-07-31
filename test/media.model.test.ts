import { test, expect, assert, beforeAll, afterAll, afterEach } from 'vitest'
import mongoose from 'mongoose'
import Media, { mediaSchema } from '../app/model/media.model.ts'
import { UPLOAD_RETENTION_DAYS } from '../app/helper/common.helper.ts'
import { clearDb, connectMemoryDb, disconnectMemoryDb } from './helpers/mongo.ts'

beforeAll(connectMemoryDb)
afterEach(clearDb)
afterAll(disconnectMemoryDb)

// Both fields are `required`,
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

test('createdAt expires on the same window the on-disk uploads are pruned with', () => {
  const ttl = mediaSchema.indexes().find(([fields]) => 'createdAt' in fields)
  assert.isDefined(ttl)
  const [fields, options] = ttl
  expect(fields).toEqual({ createdAt: 1 })
  expect(options.expireAfterSeconds).toBe(UPLOAD_RETENTION_DAYS * 24 * 60 * 60)
})

// The TTL indexes a field `timestamps` owns; without the stamp nothing would ever expire.
test('stamps createdAt on create', async () => {
  const doc = await Media.create({ media: 'uploads/x.png', user: new mongoose.Types.ObjectId() })
  expect(doc.createdAt).toBeInstanceOf(Date)
})
