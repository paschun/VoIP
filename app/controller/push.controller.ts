import type { Context } from 'hono'
import type { Ok } from '../contracts/envelope.ts'
import {
  pushEndpointBody,
  type PushEndpointRequest,
  pushSubscriptionBody,
  type PushSubscriptionRequest,
} from '../contracts/push-subscription.ts'
import { factory } from '../core/factory.ts'
import type { Env, JsonCtx } from '../core/factory.ts'
import { ack } from '../helper/respond.helper.ts'
import { vapidPublicKey } from '../helper/web-push.helper.ts'
import { auth } from '../middleware/auth.ts'
import { jsonBody } from '../middleware/validate.ts'
import PushSubscription from '../model/push-subscription.model.ts'

/** The VAPID public key the client needs as `applicationServerKey`; `null` when push isn't configured. */
function getPublicKey(c: Context<Env>) {
  return c.json({ data: vapidPublicKey } satisfies Ok, 200)
}

/**
 * Store (or re-point) a browser's subscription. Keyed on `endpoint`, so a re-subscribe after the push service rotates
 * it lands as a new row, and the same browser re-registering just refreshes its keys.
 */
async function subscribe(c: JsonCtx<PushSubscriptionRequest>) {
  const { endpoint, keys } = c.req.valid('json')
  const user = c.get('user').id
  await PushSubscription.updateOne({ endpoint: { $eq: endpoint } }, { endpoint, keys, user }, { upsert: true })
  return ack(c)
}

async function unsubscribe(c: JsonCtx<PushEndpointRequest>) {
  const { endpoint } = c.req.valid('json')
  await PushSubscription.deleteOne({ endpoint: { $eq: endpoint }, user: { $eq: c.get('user').id } })
  return ack(c)
}

export const publicKey = factory.createHandlers(auth, getPublicKey)
export const create = factory.createHandlers(auth, jsonBody(pushSubscriptionBody), subscribe)
export const remove = factory.createHandlers(auth, jsonBody(pushEndpointBody), unsubscribe)
