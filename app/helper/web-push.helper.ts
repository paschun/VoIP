import { readFile } from 'node:fs/promises'
import webpush, { WebPushError } from 'web-push'
import { z } from 'zod'
import type { PushMessage } from '../../shared/contracts/push.ts'
import { env } from '../core/env.ts'
import PushSubscription from '../model/push-subscription.model.ts'
import { base64urlBytes } from './base64url.helper.ts'

// Repo-root file written by `pnpm run gen-push-keys`
const keysFile = new URL('../../push-keys.json', import.meta.url)
const keysSchema = z.object({
  publicKey: base64urlBytes(65), // uncompressed P-256 point
  privateKey: base64urlBytes(32), // that point's scalar
})

/** Narrows a caught value to a filesystem/syscall failure, which carries an `errno` string in `code`. */
const isNodeError = (error: unknown): error is NodeJS.ErrnoException => error instanceof Error && 'code' in error

async function readVapidKeys() {
  let json: unknown
  try {
    json = JSON.parse(await readFile(keysFile, 'utf8'))
  } catch (e) {
    if (isNodeError(e) && e.code === 'ENOENT') return null
    throw new Error('Unreadable push-keys.json', { cause: e })
  }
  const result = keysSchema.safeParse(json)
  if (!result.success) throw new Error(`Invalid push-keys.json:\n${z.prettifyError(result.error)}`)
  return result.data
}

const vapidKeys = await readVapidKeys()
const { VAPID_SUBJECT } = env

/** When keys not included, the app notifications run on SSE alone. */
export const isPushEnabled = Boolean(vapidKeys && VAPID_SUBJECT)

/** The key browsers pass as `applicationServerKey`; `null` when push isn't configured. */
export const vapidPublicKey = vapidKeys?.publicKey ?? null

if (vapidKeys && VAPID_SUBJECT) {
  webpush.setVapidDetails(VAPID_SUBJECT, vapidKeys.publicKey, vapidKeys.privateKey)
} else {
  console.warn('Web Push disabled: add push-keys.json and set VAPID_SUBJECT to enable it')
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
        await webpush.sendNotification({ endpoint, keys }, payload, { headers: { 'User-Agent': 'voipsuite' } })
      } catch (e) {
        console.error('Web Push send failed', e)
        if (e instanceof WebPushError && DEAD_SUBSCRIPTION.has(e.statusCode)) {
          await PushSubscription.deleteOne({ _id })
        }
      }
    }),
  )
}
