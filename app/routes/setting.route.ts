import { Hono } from 'hono'
import type { Env } from '../core/factory.ts'
import * as setting from '../controller/setting.controller.ts'
import { WEBHOOKS } from '../helper/webhook-paths.ts'

// Routes for `/api/setting`: provider-number lookup, SMS sending + conversation history, and the public inbound-SMS/
// status webhooks. Auth is applied per-handler in the controller (the webhooks + provider-number lookup are public).
// The inbound-SMS/status webhook `route`s come from `WEBHOOKS.sms` (the source the provider URLs derive from); each is a
// single `/:type` route whose handler validates `:type` (unknown provider -> 404). They're fixed, NOT REST-renamed.
export const settingRoutes = new Hono<Env>()
  .post('/provider-numbers', ...setting.listNumbers)
  .post('/messages', ...setting.sendMessage)
  .get('/conversations', ...setting.listConversations)
  .post('/conversations/messages', ...setting.getConversationMessages)
  .delete('/conversations/:number', ...setting.deleteConversation)
  .patch('/:id/notification', ...setting.saveNotification) // Flips `emailnotification` 
  .post(WEBHOOKS.sms.receiveSms.route, ...setting.receiveSms)
  .post(WEBHOOKS.sms.smsStatus.route, ...setting.smsStatus)
