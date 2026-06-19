import { z } from 'zod'
import type { Ok } from '../api-contracts.ts'

// --- requests ---

/**
 * Create or (re)provision a profile's provider config. `user` is taken from the auth token, not the body. Provider
 * credentials are optional: supply the full set to provision Twilio/Telnyx, or just `profile` to rename an existing one.
 */
export const createSettingBody = z.object({
  type: z.enum(['telnyx', 'twilio']),
  profile: z.string().min(1),
  setting: z.string().optional(),
  override: z.string().optional(),
  api_key: z.string().optional(),
  number: z.string().optional(),
  sid: z.string().optional(),
  twilio_sid: z.string().optional(),
  twilio_token: z.string().optional(),
  twilio_number: z.string().optional(),
})
export type CreateSettingRequest = z.infer<typeof createSettingBody>

/** A profile (Setting) id in the path -- shared by `GET /profiles/:id` and `DELETE /profiles/:id/provider`. */
export const profileIdParam = z.object({ id: z.string().min(1) })
export type ProfileIdParam = z.infer<typeof profileIdParam>

/** The `:type` provider segment on the SMS webhook routes (`/receive-sms/:type`, `/sms-status/:type`). */
export const smsTypeParam = z.object({ type: z.enum(['telnyx', 'twilio']) })
export type SmsTypeParam = z.infer<typeof smsTypeParam>

/** Public: list a provider's phone numbers from caller-supplied credentials (discriminated so each branch is required). */
export const getNumberBody = z.discriminatedUnion('type', [
  z.object({ type: z.literal('telnyx'), api_key: z.string().min(1) }),
  z.object({ type: z.literal('twilio'), twilio_sid: z.string().min(1), twilio_token: z.string().min(1) }),
])
export type GetNumberRequest = z.infer<typeof getNumberBody>

export const sendSmsBody = z.object({
  numbers: z.array(z.string()).min(1),
  profile: z.object({ _id: z.string() }),
  message: z.string().optional().default(''),
  media: z.array(z.string()).optional().default([]),
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

// --- responses ---

/** `get-number` is a provider-shaped passthrough: Telnyx nests `{ data }`, Twilio returns a flat list. */
export type ProviderNumbersResponse = Ok<{ data: unknown[] } | unknown[]>
