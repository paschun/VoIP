import { Hono } from 'hono'
import * as provider from '../controller/provider.controller.ts'
import type { Env } from '../core/factory.ts'

// Routes for `/api/provider`: a Setting's Twilio/Telnyx webhook config (nothing in Mongo is modified -- the Setting is
// just the credential source). GET reads the provider-side config; PATCH updates the fallback webhook URL.
// `number-lookup` probes raw credentials to fetch a number's provider record, so it POSTs.
export const providerRoutes = new Hono<Env>()
  .get('/twilio/webhook/:settingId', ...provider.twilioWebhookGet)
  .patch('/twilio/webhook/:settingId', ...provider.twilioWebhookPatch)
  .get('/telnyx/webhook/:settingId', ...provider.telnyxWebhookGet)
  .patch('/telnyx/webhook/:settingId', ...provider.telnyxWebhookPatch)
  .post('/number-lookup', ...provider.numberLookup)
