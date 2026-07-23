import { z } from 'zod'
import type { Ok } from './envelope.ts'
import { OUTBOUND_MMS_MAX_ATTACHMENTS, TWILIO_INBOUND_CONTENT_TYPES } from './media.ts'
import { e164Phone } from '../../shared/phone.ts'
import { profileIdParam, type ProfileIdParam } from './profile.ts'

// --- requests ---

/** Fields common to both provider-config variants. `setting` is the target profile's id; renames go through `PATCH /profile/:id`. */
const settingBase = z.object({
  profile: z.string().min(1),
  setting: z.string(),
  override: z.boolean(),
})

/**
 * Create or (re)provision a profile's provider config. `user` is taken from the auth token, not the body.
 * Discriminated on `type` so each provider's full credential set is required. Telnyx's `sid` (the number's provider
 * id) stays lenient: a hand-typed number has no lookup match, and the Telnyx leg tolerates that.
 */
export const createSettingBody = z.discriminatedUnion('type', [
  settingBase.extend({
    type: z.literal('telnyx'),
    api_key: z.string().min(1),
    number: z.string().min(1),
    sid: z.string(),
  }),
  settingBase.extend({
    type: z.literal('twilio'),
    twilio_sid: z.string().min(1),
    twilio_token: z.string().min(1),
    twilio_number: z.string().min(1),
    sid: z.string().min(1),
  }),
])
export type CreateSettingRequest = z.infer<typeof createSettingBody>

// `profileIdParam` (`GET /profiles/:id`, `DELETE /profiles/:id/provider`) is shared with the profile routes, and also
// types the `:id` (a `Setting._id`) on `PATCH /setting/:id/notification`.
export { profileIdParam, type ProfileIdParam }

/** Body of `PATCH /setting/:id/notification` (`:id` = `Setting._id`): the boolean stored on `Setting.emailnotification`. */
// TODO: derive zod validator (status/emailnotification) from Setting schema
export const notificationBody = z.object({ status: z.boolean() })
export type NotificationRequest = z.infer<typeof notificationBody>

// --- provider SMS webhook payloads ---
// Unauthenticated provider callbacks (field sets: webhook/telephony-webhook-reference.md §7-§8). A webhook must never
// be answered with a non-2xx, so the controllers validate these via `webhookForm` (log + success-shaped reply on
// failure). Required fields are the ones the handler cannot work without; the rest stay optional -- same rationale as
// the voice webhooks in call.ts. Only Twilio's form posts are described here (all values strings) -- Twilio publishes
// no webhook schema, so the contract is zod authored against its docs. Telnyx JSON events are instead validated
// against Telnyx's own OpenAPI spec in app/helper/telnyx-events.helper.ts.

/**
 * Twilio inbound SMS/MMS form post (https://www.twilio.com/docs/messaging/guides/webhook-request). `.catchall` covers
 * the indexed `MediaUrl0`/`MediaContentType0`/... MMS keys; the refinement requires each of the `NumMedia` pairs to be
 * a URL with a content type Twilio could actually deliver. A malformed `NumMedia` degrades to 0 (attachments dropped,
 * message kept); there is no upper bound -- Twilio documents no receive-side media cap.
 */
export const twilioInboundSms = z
  .object({
    Body: z.string().optional(), // may be empty/absent on MMS
    To: z.string().min(1), // our number
    From: z.string().min(1), // the sender
    SmsSid: z.string().min(1),
    NumMedia: z.string().regex(/^\d+$/).transform(Number).catch(0),
  })
  .catchall(z.string())
  .superRefine((form, ctx) => {
    for (let i = 0; i < form.NumMedia; i++) {
      if (!z.url().safeParse(form[`MediaUrl${i}`]).success)
        ctx.addIssue({ code: 'custom', path: [`MediaUrl${i}`], message: 'Expected a media URL' })
      if (!TWILIO_INBOUND_CONTENT_TYPES.includes(form[`MediaContentType${i}`] ?? ''))
        ctx.addIssue({ code: 'custom', path: [`MediaContentType${i}`], message: 'Unexpected media content type' })
    }
  })
export type TwilioInboundSms = z.infer<typeof twilioInboundSms>

/**
 * Twilio SMS status callback form post. Twilio guarantees no field, so this reflects handler need, not the docs:
 * status + sid are required (nothing works without them); `From` (our number) is optional -- best-effort profile
 * lookup for cleanup, so its absence must not fail validation and trigger a provider retry.
 * https://www.twilio.com/docs/messaging/guides/track-outbound-message-status (only MessageStatus/ErrorCode added to a
 * "subset" of https://www.twilio.com/docs/messaging/guides/webhook-request#request-parameters, an evolving set).
 */
export const twilioSmsStatus = z.object({
  MessageStatus: z.string().min(1),
  MessageSid: z.string().min(1),
  From: z.string().optional(),
})
export type TwilioSmsStatus = z.infer<typeof twilioSmsStatus>

/** Public: list a provider's phone numbers from caller-supplied credentials (discriminated so each branch is required). */
export const getNumberBody = z.discriminatedUnion('type', [
  z.object({ type: z.literal('telnyx'), api_key: z.string().min(1) }),
  z.object({ type: z.literal('twilio'), twilio_sid: z.string().min(1), twilio_token: z.string().min(1) }),
])
export type GetNumberRequest = z.infer<typeof getNumberBody>

/** Provider number listing, discriminated by `type` so the client narrows each branch's element shape. */
export type ProviderNumbers =
  | { type: 'telnyx'; numbers: { id: string; phone_number: string }[] }
  | { type: 'twilio'; numbers: { sid: string; phoneNumber: string }[] }
export type GetNumberResponse = Ok<ProviderNumbers>

export const sendSmsBody = z.object({
  numbers: z.array(e164Phone).min(1),
  profile: z.object({ _id: z.string() }),
  message: z.string().optional().default(''),
  media: z.array(z.string()).max(OUTBOUND_MMS_MAX_ATTACHMENTS).optional().default([]),
})
export type SendSmsRequest = z.infer<typeof sendSmsBody>

/** Conversation list is read by profile (Setting) id. */
export const conversationsQuery = z.object({ profile: z.string().min(1) })
export type ConversationsQuery = z.infer<typeof conversationsQuery>

/**
 * `number` is a conversation object from the `sms-number-list` result. That list is a `$group` keyed by `$number`, so
 * each item's `_id` is the OTHER PARTY's phone number string (the group key), NOT a Mongo ObjectId. `telnyx_number` is
 * our provider number for the conversation.
 */
export const messageListBody = z.object({
  number: z.object({ telnyx_number: z.string().nullish(), _id: z.string() }),
  profile: z.string().min(1),
})
export type MessageListRequest = z.infer<typeof messageListBody>

/** A conversation is identified by the other party's phone number (the `conversations` group key), URL-encoded in the path. */
export const conversationParam = z.object({ number: z.string().min(1) })
export type ConversationParam = z.infer<typeof conversationParam>
