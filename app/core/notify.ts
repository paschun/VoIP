import type { PushMessage } from '../../shared/contracts/push.ts'
import { sendPushToUser } from '../helper/web-push.helper.ts'
import { sendSseToUser } from './sse.ts'

/**
 * Deliver a message to `userId` over every transport: SSE reaches a live page, Web Push reaches a closed or
 * backgrounded one. They overlap by design -- the service worker stays silent while a page is visible. Web Push is
 * best-effort and never blocks the SSE write.
 */
export function sendToUser(userId: string, message: PushMessage) {
  sendSseToUser(userId, message)
  void sendPushToUser(userId, message).catch((e: unknown) => console.error('Web Push fan-out failed', e))
}
