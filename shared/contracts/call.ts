import { z } from 'zod'

// `/token` issues a provider access token for the caller's chosen profile (setting). The 200 body (a Twilio JWT, or the
// Telnyx Setting carrying SIP creds) is RPC-inferred at the call site, not hand-typed here.
export const getTokenBody = z.object({ setting_id: z.string().min(1) })
export type GetTokenRequest = z.infer<typeof getTokenBody>

// Provider webhook payloads. These are unauthenticated provider callbacks, and a webhook must never reject a provider
// with 422, so `.partial()` makes every field optional in one shot -- validation here exists only to TYPE the handful
// of fields we read (catching field-name typos at compile time), not to gate the request. Form values are always
// strings. (`.partial()`, not `.optional()` on the whole object: the body is always present, it's the *fields* that
// may be absent; `.optional()` would type the whole object as possibly-`undefined`.)
export const twilioVoiceWebhook = z
  .object({
    CallSid: z.string(),
    twilio_number: z.string(), // our number (custom param the frontend Device sends)
    number: z.string(), // the number being dialed (custom param)
  })
  .partial()
export type TwilioVoiceWebhook = z.infer<typeof twilioVoiceWebhook>

export const twilioStatusWebhook = z
  .object({
    CallSid: z.string(),
    CallDuration: z.string(),
    CallStatus: z.string(),
  })
  .partial()
export type TwilioStatusWebhook = z.infer<typeof twilioStatusWebhook>

export const twilioInboundWebhook = z
  .object({
    CallSid: z.string(),
    To: z.string(), // our number
    From: z.string(), // the caller
  })
  .partial()
export type TwilioInboundWebhook = z.infer<typeof twilioInboundWebhook>

// Telnyx native Call Control events (sent as JSON, no CallSid). Only the fields we act on are modelled.
export const telnyxCallEvent = z.object({
  data: z.object({
    event_type: z.string(),
    payload: z.object({
      direction: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      call_session_id: z.string().optional(),
      start_time: z.string().optional(),
      end_time: z.string().optional(),
    }),
  }),
})
export type TelnyxCallEvent = z.infer<typeof telnyxCallEvent>
