import { z } from 'zod'
import type { Ok } from '../api-contracts.ts'
import type { SettingDoc } from '../schema/setting.ts'

// Which Setting (profile) the provider config belongs to; carried in the path.
export const settingIdParam = z.object({ settingId: z.string().min(1) })
export type SettingIdParam = z.infer<typeof settingIdParam>

// PATCH body for the webhook config: the base origin the provider should use for its fallback callbacks (the controller
// appends the concrete webhook paths).
export const webhookFallbackBody = z.object({ fallbackUrl: z.string().min(1) })
export type WebhookFallbackRequest = z.infer<typeof webhookFallbackBody>

// number-lookup probes provider credentials and returns the number's provider-side record. Telnyx and Twilio carry
// different credential fields, hence the discriminated union on `type`. (twilio_number is required for parity with the
// original even though only the sid/token/sid are used downstream.)
export const numberLookupBody = z.discriminatedUnion('type', [
  z.object({ type: z.literal('telnyx'), api_key: z.string().min(1), number: z.string().min(1), sid: z.string().min(1) }),
  z.object({
    type: z.literal('twilio'),
    twilio_sid: z.string().min(1), twilio_token: z.string().min(1), twilio_number: z.string().min(1), sid: z.string().min(1),
  }),
])
export type NumberLookupRequest = z.infer<typeof numberLookupBody>

export type WebhookUpdateResponse = Ok<SettingDoc>
// Provider passthrough payloads (Twilio/Telnyx SDK or REST shapes); the frontend reads them via dotted paths, so they
// stay loose here rather than mirroring each SDK's response type.
export type WebhookConfigResponse = Ok<unknown>
export type NumberLookupResponse = Ok<unknown>
