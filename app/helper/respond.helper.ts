import type { Context } from 'hono'

/**
 * Bare responses with no body, for endpoints whose caller doesn't consume one. `ack` (204) suits Twilio webhooks and
 * app actions with nothing to return (e.g. a password change); Telnyx webhooks must use `ok` instead -- its spec
 * requires exactly 200, and a non-200 2xx triggers failover redelivery. The instruction-fetch legs (TwiML/TeXML voice,
 * inbound-SMS reply) return a real body -- the TwiML helpers below.
 */
export const ok = (c: Context) => c.body(null, 200)
export const created = (c: Context) => c.body(null, 201)
export const ack = (c: Context) => c.body(null, 204)

/** A TwiML/TeXML instruction reply: XML body at 200. */
export const xmlResponse = (c: Context, xml: string) => c.body(xml, 200, { 'Content-Type': 'text/xml' })

/** Empty `<Response/>` document -- "no instructions" to a voice webhook, "no auto-reply" to inbound SMS. */
export const emptyTwiml = '<?xml version="1.0" encoding="UTF-8"?><Response/>'

/** Empty-TwiML reply: the inbound-SMS response and the TwiML/TeXML webhooks' invalid-payload fallback. */
export const emptyTwimlReply = (c: Context) => xmlResponse(c, emptyTwiml)
