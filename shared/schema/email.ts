import { Schema } from 'mongoose'
import type { WireDoc } from '../wire.ts'

/**
 * SMTP / PGP email-notification settings, one document per user. Source of truth for both the Mongoose model
 * (`app/model/email.model.ts` builds `model('Email', emailSchema)`) and the wire contract (`EmailDoc` below, used by the
 * response types in `shared/contracts/email.ts` and the form in `EmailSetting.vue`). Email has no virtuals; if one is
 * added, declare it in the `virtuals` constructor option and set `toJSON: { virtuals: true }` so `WireDoc` and the
 * actual response stay in sync.
 */
export const emailSchema = new Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
  to_email: { type: String, required: true },
  host: { type: String, required: true },
  port: { type: String, required: true },
  sender_email: { type: String, required: true },
  secure: { type: Boolean, required: true },
  pgpEncryptEnabled: { type: Boolean, required: true },
  pgpPublicKey: { type: String, default: '' }, // nullable since required: false
  // `unique` tells Mongoose to issue a `createIndex` on model creation (when `autoIndex` is on by default)
  //  which causes MongoDB to build & enforces the unique index, limits one Email doc per user.
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  created_at: { type: Date, default: Date.now },
}, { strict: 'throw', strictQuery: 'throw' })
// console.dir(emailSchema.toJSONSchema(), { depth: 5 })

/** Full JSON shape of an Email document as the frontend receives it (ObjectId/Date already stringified, `__v` present). */
export type EmailDoc = WireDoc<typeof emailSchema>
