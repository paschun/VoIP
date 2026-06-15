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
  email: String,
  password: String,
  to_email: String,
  host: String,
  port: String,
  secure: Boolean,
  sender_email: String,
  pgpPublicKey: { type: String, default: null },
  pgpEncryptEnabled: { type: Boolean, default: false },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now },
})

/** Full JSON shape of an Email document as the frontend receives it (ObjectId/Date already stringified, `__v` present). */
export type EmailDoc = WireDoc<typeof emailSchema>
