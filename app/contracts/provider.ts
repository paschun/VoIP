import { z } from 'zod'

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
  z.object({
    type: z.literal('telnyx'),
    api_key: z.string().min(1),
    number: z.string().min(1),
    sid: z.string().min(1),
  }),
  z.object({
    type: z.literal('twilio'),
    twilio_sid: z.string().min(1),
    twilio_token: z.string().min(1),
    twilio_number: z.string().min(1),
    sid: z.string().min(1),
  }),
])
export type NumberLookupRequest = z.infer<typeof numberLookupBody>
