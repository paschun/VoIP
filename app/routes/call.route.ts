import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as call from '../controller/call.controller.ts'

// Routes for `/api/call`. The webhook paths (make-call, status, incoming, telnyx, status/telnyx) are wired into the
// Twilio/Telnyx provider config (see the webhook URLs in provider.controller), so they are fixed and unauthenticated --
// the provider calls them and expects TwiML/XML back. Only `/token` is frontend-facing and authenticated.
export const callRoutes = new Hono<Env>()
  .post('/token', ...call.token)
  .post('/make-call', ...call.makeCall)
  .post('/status', ...call.status)
  .post('/incoming', ...call.incoming)
  .post('/telnyx', ...call.telnyx)
  .post('/status/telnyx', ...call.statusTelnyx)
