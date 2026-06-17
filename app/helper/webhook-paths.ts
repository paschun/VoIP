/**
 * Provider webhook paths -- one object, two views of each path. `WEBHOOKS` is the single source of truth shared by the
 * route files (which register `route`, the group-relative path) and the provider-URL builders in twilio.helper /
 * telnyx.helper / provider.controller / setting.controller (which hand the provider `full`, the absolute URL). `full`
 * is *derived* from `route` (same subpath, group prefix prepended), so the two can never drift; each absolute value is
 * also fed through `combineURLs`, which trims the leading slash at the seam.
 *
 *   WEBHOOKS.call.twilioVoice.route -> '/make-call'            (registered under the /api/call group)
 *   WEBHOOKS.call.twilioVoice.full  -> '/api/call/make-call'   (URL handed to Twilio)
 *   WEBHOOKS.sms.receiveSms.route   -> '/receive-sms/:type'    (one route; the handler validates :type per provider)
 *   WEBHOOKS.sms.receiveSms.full    -> { twilio: '/api/setting/receive-sms/twilio', telnyx: '.../telnyx' }
 */

/** A call webhook: a fixed route under the /api/call group, plus the absolute URL handed to the provider. */
const callHook = <S extends string>(route: S) => ({ route, full: `/api/call${route}` }) as const

/**
 * An SMS webhook: a single `:type` route under the /api/setting group (the handler validates `:type` and branches on
 * it -- Twilio sends form bodies, Telnyx sends JSON), plus the concrete per-provider URLs (`:type` resolved to
 * `twilio` / `telnyx`) handed to each provider.
 *
 * `:type` is validated in the route handler as either 'telnyx' | 'twilio'
 */
const smsHook = <S extends string>(base: S) =>
  ({ route: `${base}/:type`, full: { twilio: `/api/setting${base}/twilio`, telnyx: `/api/setting${base}/telnyx` } }) as const

export const WEBHOOKS = {
  call: {
    twilioVoice: callHook('/make-call'),
    twilioStatus: callHook('/status'),
    twilioIncoming: callHook('/incoming'),
    telnyxVoice: callHook('/telnyx'),
    telnyxStatus: callHook('/status/telnyx'),
  },
  sms: {
    receiveSms: smsHook('/receive-sms'),
    smsStatus: smsHook('/sms-status'),
  },
} as const
