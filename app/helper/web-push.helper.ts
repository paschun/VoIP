import webpush, { WebPushError } from 'web-push'
import type { PushMessage } from '../../shared/contracts/push.ts'
import { env } from '../core/env.ts'
import PushSubscription from '../model/push-subscription.model.ts'

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = env

/** Push is opt-in: with no VAPID keypair configured the app runs on SSE alone. */
export const isPushEnabled = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT)

if (VAPID_SUBJECT && VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
} else {
  console.warn('Web Push disabled: set VAPID_SUBJECT, VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable it')
}

/**
 * Statuses meaning the stored row can never work again, so it's deleted rather than retried:
 *   403 the subscription is bound to a different VAPID key than we now sign with (ours was rotated)
 *   404 the push service has no record of this endpoint
 *   410 the browser unsubscribed -- permission revoked, site data cleared, or the app removed
 * Everything else (429 throttling, 5xx outages) is transient, so the row survives and the next message retries.
 */
const DEAD_SUBSCRIPTION = new Set([403, 404, 410])

/**
 * Fan a frame out to every browser `userId` has subscribed, in parallel. Best-effort: a failed send is logged, and a
 * subscription the push service reports as gone is deleted. Runs alongside SSE -- the service worker suppresses the
 * notification when a page is already visible.
 */
export async function sendPushToUser(userId: string, message: PushMessage) {
  if (!isPushEnabled) return
  const subs = await PushSubscription.find({ user: { $eq: userId } })
  const payload = JSON.stringify(message)
  await Promise.all(
    subs.map(async ({ _id, endpoint, keys }) => {
      try {
        await webpush.sendNotification({ endpoint, keys }, payload)
      } catch (e) {
        console.error('Web Push send failed', e)
        if (e instanceof WebPushError && DEAD_SUBSCRIPTION.has(e.statusCode)) {
          await PushSubscription.deleteOne({ _id })
        }
      }
    }),
  )
}
