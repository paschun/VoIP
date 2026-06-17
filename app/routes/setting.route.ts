import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as setting from '../controller/setting.controller.ts'

// Routes for `/api/setting`: profile/provider config, SMS sending + conversation history, and the public inbound-SMS/
// status webhooks. Auth is applied per-handler in the controller (the webhooks + provider-number lookup are public).
// The webhook paths (`receive-sms/:type`, `sms-status/:type`) are fixed -- they're baked into provider config and
// `WEBHOOK_PATHS`, so they are NOT REST-renamed.
export const settingRoutes = new Hono<Env>()
  .post('/profiles', ...setting.createProfile)
  .get('/profiles/:id', ...setting.getProfile)
  .delete('/profiles/:id/provider', ...setting.disconnectProvider)
  .post('/provider-numbers', ...setting.listNumbers)
  .post('/messages', ...setting.sendMessage)
  .get('/conversations', ...setting.listConversations)
  .post('/conversations/messages', ...setting.getConversationMessages)
  .delete('/conversations/:number', ...setting.deleteConversation)
  .post('/receive-sms/:type', ...setting.receiveSms)
  .post('/sms-status/:type', ...setting.smsStatus)
