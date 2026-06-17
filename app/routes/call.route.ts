import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as call from '../controller/call.controller.ts'
import { WEBHOOKS } from '../helper/webhook-paths.ts'

// Routes for `/api/call`. The webhook `route`s come from `WEBHOOKS.call` (the same source the provider-facing `full`
// URLs derive from, so the route and the URL we register with the provider can't drift). They're fixed and
// unauthenticated -- the provider calls them and expects TwiML/XML back. Only `/token` is frontend-facing and authed.
export const callRoutes = new Hono<Env>()
  .post('/token', ...call.token)
  .post(WEBHOOKS.call.twilioVoice.route, ...call.makeCall)
  .post(WEBHOOKS.call.twilioStatus.route, ...call.status)
  .post(WEBHOOKS.call.twilioIncoming.route, ...call.incoming)
  .post(WEBHOOKS.call.telnyxVoice.route, ...call.telnyx)
  .post(WEBHOOKS.call.telnyxStatus.route, ...call.statusTelnyx)
