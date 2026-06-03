import mongoose from 'mongoose'
import { z } from 'zod'
import { toMongooseSchema, zObjectId } from './zod-mongoose.ts'

// Source of truth: a Zod schema. The Mongoose schema below is derived from it.
//
// Parity with the previous hand-written model is intentional and verified by media.model.test.ts:
//   { media: String, user: { type: ObjectId, ref: 'User' } }
// Both fields are `.optional()` because the original schema declared neither as required (Mongoose fields are
// optional unless `required` is set).
export const mediaZodSchema = z.object({
  media: z.string().optional(),
  user: zObjectId({ ref: 'User' }).optional(),
})

// Document shape inferred straight from the Zod schema — no hand-maintained interface to drift out of sync.
export type IMedia = z.infer<typeof mediaZodSchema>

export const mediaSchema = toMongooseSchema(mediaZodSchema)

const Media = mongoose.model('Media', mediaSchema)

export default Media
