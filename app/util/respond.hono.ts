import type { Context } from 'hono'

/**
 * Bare 204 with no body, for endpoints whose caller doesn't consume a response: provider webhooks that ignore any
 * reply (Twilio/Telnyx status callbacks, Telnyx event webhooks), and actions with nothing to return (e.g. a password
 * change). The instruction-fetch legs (TwiML/TeXML voice, inbound-SMS reply) return a real body, so they don't use this.
 */
export const ack = (c: Context) => c.body(null, 204)
