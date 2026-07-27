import { z } from 'zod'
import { base64urlBytes } from '../helper/base64url.helper.ts'

// Bare `z.url()` accepts any scheme, `javascript:` included, and these strings are stored and later fetched. The
// length cap is conventional rather than normative -- RFC 8030 sets none, and real endpoints run ~200 chars -- but
// without it the only ceiling is the 15 MB body limit that media uploads require.
const endpoint = z.url({ protocol: /^https?$/ }).max(2048)

/** A browser `PushSubscription` as serialized by `subscription.toJSON()`, posted when the client subscribes. */
export const pushSubscriptionBody = z.object({
  endpoint,
  keys: z.object({
    p256dh: base64urlBytes(65), // uncompressed P-256 point
    auth: base64urlBytes(16), // RFC 8291 auth secret
  }),
})
export type PushSubscriptionRequest = z.infer<typeof pushSubscriptionBody>

/** Identifies a subscription to drop; the endpoint is its primary key. */
export const pushEndpointBody = z.object({ endpoint })
export type PushEndpointRequest = z.infer<typeof pushEndpointBody>
