import { Schema } from 'mongoose'
import type { WireDoc } from '../wire.ts'

/**
 * A user's messaging/calling profile (Twilio or Telnyx). Many docs per user; `profile` is the display name.
 */
export const settingSchema = new Schema({
  api_key: String,
  number: String,
  setting: String,
  sid: String,
  twilio_sid: String,
  twilio_token: String,
  profile: String,
  emailnotification: { type: String, enum: ['false', 'true'], default: 'false' },
  type: { type: String, enum: ['telnyx', 'twilio'], default: 'telnyx' },
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  app_key: { type: String, default: null },
  app_secret: { type: String, default: null },
  twiml_app: { type: String, default: null },
  sip_id: { type: String, default: null },
  sip_username: { type: String, default: null },
  sip_password: { type: String, default: null },
  telnyx_twiml: { type: String, default: null },
  telnyx_outbound: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
}, {
  // Populated count virtuals (not persisted). Declared here + `toJSON.virtuals` so `.populate()` fills them and they
  // serialize; their value type is not inferable from the schema -- see `SettingCounts` below.
  virtuals: {
    // Count where settingSchema._id is equal to Message.setting
    messageCount: { options: { ref: 'Message', localField: '_id', foreignField: 'setting', count: true } },
    // Count where settingSchema.user is equal to Message.user
    totalCount: { options: { ref: 'Message', localField: 'user', foreignField: 'user', count: true } },
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})

/**
 * The populated count virtuals. Mongoose cannot infer a `{ count: true }` populate virtual's value type -- there's no
 * getter to read, and its own `InferSchemaType`/`ObtainSchemaGeneric` (like our `WireDoc`) yield `unknown` -- so the
 * `number` is declared here. Present only on the list/detail reads that `.populate()` them (`getProfiles`/`getProfile`),
 * absent on create/delete, hence optional. Verified end-to-end against the real routes in `test/profile.route.test.ts`.
 */
type SettingCounts = { messageCount?: number; totalCount?: number }

/** Full JSON shape of a Setting/profile as the frontend receives it (ObjectId/Date stringified, counts when populated). */
export type SettingDoc = WireDoc<typeof settingSchema> & SettingCounts
