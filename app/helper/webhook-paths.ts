/**
 * Absolute paths the telephony providers (Twilio/Telnyx) call back on. One `as const` source of truth shared by the
 * provider-URL builders in twilio.helper / telnyx.helper and provider.controller, so a mistyped path is a compile error
 * rather than a silently dead webhook. (The Hono route files declare these same endpoints with group-relative paths,
 * e.g. '/make-call'; these are the full paths we hand to a provider. TODO: drive the route registrations off these too.)
 * Each value is fed through `combineURLs`, which trims the leading slash at the seam, so the leading '/' is cosmetic.
 */
export const WEBHOOK_PATHS = {
  twilioVoice: '/api/call/make-call',
  twilioStatus: '/api/call/status',
  twilioIncoming: '/api/call/incoming',
  twilioReceiveSms: '/api/setting/receive-sms/twilio',
  telnyxVoice: '/api/call/telnyx',
  telnyxStatus: '/api/call/status/telnyx',
  telnyxReceiveSms: '/api/setting/receive-sms/telnyx',
} as const
