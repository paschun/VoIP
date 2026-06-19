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
  profile: String, // display name
  emailnotification: { type: String, enum: ['false', 'true'], default: 'false' },
  type: { type: String, enum: ['telnyx', 'twilio'], default: 'telnyx' },
  user: { type: Schema.Types.ObjectId, ref: 'User' }, // user that owns this profile
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
  virtuals: {
    // Count where settingSchema._id is equal to Message.setting
    messageCount: { options: { ref: 'Message', localField: '_id', foreignField: 'setting', count: true } },
    // Count where settingSchema.user is equal to Message.user
    totalCount: { options: { ref: 'Message', localField: 'user', foreignField: 'user', count: true } },
  },
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false, // mongoose by default creates an `id` virtual which is `_id` stringified.
})

/** Full JSON shape of a Setting/profile over the wire. The intersection adds what `WireDoc` can't infer -- see `wire.md`. */
export type SettingDoc = WireDoc<typeof settingSchema> & {
  // id: string // mongoose `id` virtual; on the wire via toJSON:{virtuals:true}, read by the frontend
  messageCount?: number // count virtuals; uninferable, populated only by getProfiles/getProfile
  totalCount?: number
}
