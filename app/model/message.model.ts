import { Schema, model, type InferSchemaType, type Types } from 'mongoose'
import type { OutboundMessagePayload } from 'telnyx/resources/messages/messages.js'
import type { CallStatus as TwilioCallStatus } from 'twilio/lib/rest/api/v2010/account/call.js'
import type { MessageStatus as TwilioMessageStatus } from 'twilio/lib/rest/api/v2010/account/message.js'

/**
 * Every value `status` can hold. 'sent'/'received' are ours, mirroring `type` on messages we originate; everything
 * else arrives verbatim from a provider webhook, so those parts come from the SDK types: Twilio message delivery
 * (https://www.twilio.com/docs/messaging/api/message-resource#message-status-values), Telnyx message delivery -- no
 * named alias, our webhook reads `payload.to[0].status`
 * (https://developers.telnyx.com/docs/messaging/messages/message-status) -- and the call lifecycle
 * (https://www.twilio.com/docs/voice/api/call-resource#call-status-values). This is the type of what we store, NOT a
 * runtime allow-list -- a mongoose `enum` here would make `.save()` throw on any status a provider adds, and our
 * best-effort webhook handlers would then silently drop the update.
 *
 * sent/received is also in TwilioMessageStatus
 */
type MessageStatus = 'sent' | 'received' | TwilioMessageStatus | NonNullable<OutboundMessagePayload.To['status']> | TwilioCallStatus

// Fields common to every conversation entry. `datatype` is the discriminator KEY (not declared as a field): the two
// discriminators below stamp it ('message' / 'call') and each adds the fields unique to its kind. Reads go through the
// base `Message` model -- a query on it scans the whole `messages` collection and hydrates each doc as its
// discriminator type -- while writes go through `TextMessage` / `Call` so the right `datatype` + field set is enforced.
export const messageSchema = new Schema(
  {
    sid: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // user that this message belongs to
    number: { type: String, required: true }, // the other party's number
    // TODO: `telnyx_number` is a misnomer -- it holds *our* provider number for BOTH Twilio and Telnyx calls (there is
    // no separate twilio field). Rename to provider-neutral `provider_number`. Needs a data migration, so left as-is.
    telnyx_number: { type: String, required: true },
    type: {
      type: String,
      enum: ['send', 'receive'],
      required: true,
    },
    isview: { type: Boolean, required: true }, // read flag: false = unread, true = read
    status: { type: String, default: null }, // provider state from webhook, see MessageStatus above
    contact: { type: Schema.Types.ObjectId, ref: 'Contact' },
    setting: { type: Schema.Types.ObjectId, ref: 'Setting', required: true }, // profile this message belongs to
    created_at: { type: Date, default: Date.now },
  },
  {
    discriminatorKey: 'datatype',
    strict: 'throw',
    strictQuery: 'throw',
  },
)

// Discriminators inherit the base schema's options, so `strict`/`strictQuery: 'throw'` already to these two as well
export const textMessageSchema = new Schema({
  message: String, // used for texts. a media-only MMS has empty text
  media: [String], // MMS media URLs, e.g. ['https://example.com/uploads/20260601/cf55....png']
})

export const callSchema = new Schema({
  duration: { type: Number, default: null }, // in seconds. set on call.hangup, null until then
})

export const Message = model('Message', messageSchema)
/** SMS/MMS text entries (`datatype: 'message'`): a text body plus an optional array of MMS media URLs. */
export const TextMessage = Message.discriminator('TextMessage', textMessageSchema, 'message')
/** Call-log entries (`datatype: 'call'`): a call duration in seconds instead of a message body. */
export const Call = Message.discriminator('Call', callSchema, 'call')

// Raw lean doc shapes composed from the schemas. `InferSchemaType` reads the schema DEFINITION, and the discriminator
// key is injected via schema OPTIONS (not declared as a path), so `datatype` never appears in the inferred base type --
// no `Omit` needed; the per-branch literal below is its sole source. That literal is what makes `MessageDoc` a
// discriminated union narrowable on `datatype`, end to end through RPC inference.
/**
 * Fields shared by every message (the base `messageSchema`), before the `datatype` discriminator adds its branch.
 * `status` is a plain `String` path in the schema, so it's narrowed to the {@link MessageStatus} union here.
 *
 * status is overwritten here, we store enum in type but not in mongoose, explain in {@link MessageStatus}
 */
export type CommonFields = InferSchemaType<typeof messageSchema> & { _id: Types.ObjectId; status: MessageStatus | null }
export type TextMessageDoc = CommonFields & InferSchemaType<typeof textMessageSchema> & { datatype: 'message' }
export type CallDoc = CommonFields & InferSchemaType<typeof callSchema> & { datatype: 'call' }
export type MessageDoc = TextMessageDoc | CallDoc
