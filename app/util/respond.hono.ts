import type { Context } from 'hono'

/**
 * Acknowledge a provider webhook with a bare 2xx and no body. For callbacks that don't consume a reply (Twilio/Telnyx
 * status callbacks, Telnyx event webhooks) -- a non-2xx makes the provider retry, but they ignore any body we send.
 *
 * todo: change this to 204 "no content"?
 */
export const ack = (c: Context) => c.body(null, 200)
