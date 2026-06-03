import { test, expect } from 'vitest'
import mongoose, { Schema, model } from 'mongoose'

import Media, { mediaSchema } from '../app/model/media.model.zod.ts'

// The EXACT schema definition the model used before the Zod migration. This is the regression baseline: the
// Zod-derived schema must be functionally identical so we never silently change what gets persisted.
//
// We compile it into a throwaway model so it goes through the *same* mongoose processing as the real `Media` model
// (which adds the `__v` version path and the `id` virtual at compile time) — otherwise we'd be comparing a compiled
// schema against a raw one and flag those compile-time additions as false diffs.

const origMediaSchema = new Schema({
  media: String,
  user: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
})
console.log(origMediaSchema.path('_id'))
const OrigMedia = model('OrigMedia', origMediaSchema)
console.log(new OrigMedia().user)

// Reduce a Schema to the structural facts we care about for DB parity. `required: false` (what zod-mongoose emits for
// `.optional()`) and an absent `required` validator (the original) behave identically, so we normalise `isRequired`
// to a boolean rather than comparing raw options objects.
function describePaths(schema: Schema) {
  const out: Record<string, unknown> = {}
  for (const [name, st] of Object.entries(schema.paths)) {
    const type = st as mongoose.SchemaType & { enumValues?: unknown[]; defaultValue?: unknown }
    out[name] = {
      instance: type.instance,
      required: Boolean(type.isRequired),
      ref: type.options?.ref ?? null,
      enum: Array.isArray(type.enumValues) && type.enumValues.length ? type.enumValues : null,
      hasDefault: typeof type.defaultValue !== 'undefined',
    }
  }
  return out
}

test('generated paths match the original hand-written schema exactly', () => {
  expect(describePaths(mediaSchema)).toEqual(describePaths(origMediaSchema))
})

test('schema-level options match the original (versionKey / id / minimize / typeKey)', () => {
  const keys = ['versionKey', 'id', 'minimize', 'typeKey', '_id'] as const
  for (const key of keys) {
    expect(mediaSchema.options[key], `schema option "${key}" diverged`).toEqual(origMediaSchema.options[key])
  }
})

test('virtuals match the original (no unexpected extras)', () => {
  expect(Object.keys(mediaSchema.virtuals).sort()).toEqual(Object.keys(origMediaSchema.virtuals).sort())
})

test('runtime casting/validation behaves like the original', () => {
  // String ObjectId is cast to a real ObjectId, plain string stays a string.
  const oid = '507f1f77bcf86cd799439011'
  const doc = new Media({ media: 'uploads/x.png', user: oid })
  expect(doc.media).toBe('uploads/x.png')
  expect(doc.user).toBeInstanceOf(mongoose.Types.ObjectId)
  expect(doc.user?.toString()).toBe(oid)

  // Nothing is required — an empty document validates.
  expect(new Media({}).validateSync()).toBeUndefined()
})
