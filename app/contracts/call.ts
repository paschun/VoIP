import { z } from 'zod'
import { e164Phone } from '../../shared/phone.ts'

// `/token` issues a provider access token for the caller's chosen profile (setting). The 200 body (a Twilio JWT, or the
// Telnyx Setting carrying SIP creds) is RPC-inferred at the call site, not hand-typed here.
export const getTokenBody = z.object({ setting_id: z.string().min(1) })
export type GetTokenRequest = z.infer<typeof getTokenBody>

// Provider voice-webhook form payloads (field sets: webhook/telephony-webhook-reference.md §1-§4; the §5 TeXML
// status callback is instead AJV-validated against Telnyx's TeXML spec in app/helper/texml-events.helper.ts).
// Unauthenticated
// provider callbacks that must never be answered with a non-2xx, so the controllers validate them via `webhookForm`
// (log + success-shaped reply on failure), never a 422-ing validator. Required fields are exactly the ones a handler
// cannot work without -- a missing `CallSid` used to fall back to `sid: ''` and no-op silently; now it's a logged
// rejection. Fields a handler merely defaults stay optional. `CallStatus` stays `z.string()` at runtime: providers add
// values, and a runtime enum would drop real updates (see MESSAGE_STATUSES in app/model/message.model.ts). All form
// values are strings; unknown keys are ignored.

/** Digits-only string; when malformed it drops to `undefined` instead of failing the payload (prevents NaN writes). */
const numericString = z.string().regex(/^\d+$/).optional().catch(undefined)

/** §1 Twilio outbound voice (TwiML app voice URL). `twilio_number`/`number` are custom params our Device sends. */
export const twilioVoiceWebhook = z.object({
  CallSid: z.string().min(1),
  twilio_number: z.string().min(1), // our number
  number: e164Phone, // the number being dialed
})
export type TwilioVoiceWebhook = z.infer<typeof twilioVoiceWebhook>

/** §2 Twilio voice status callback. */
export const twilioStatusWebhook = z.object({
  CallSid: z.string().min(1),
  CallDuration: numericString,
  CallStatus: z.string().optional(),
})
export type TwilioStatusWebhook = z.infer<typeof twilioStatusWebhook>

/** §3 Twilio inbound voice. */
export const twilioInboundWebhook = z.object({
  CallSid: z.string().min(1),
  To: z.string().min(1), // our number
  From: z.string().min(1), // the caller
})
export type TwilioInboundWebhook = z.infer<typeof twilioInboundWebhook>

/** §4 Telnyx TeXML inbound voice. Twilio-shaped but its own schema: the TeXML field set differs from Twilio's. */
export const texmlInboundWebhook = z.object({
  CallSid: z.string().min(1),
  To: z.string().min(1), // our number
  From: z.string().min(1), // the caller
})
export type TexmlInboundWebhook = z.infer<typeof texmlInboundWebhook>
