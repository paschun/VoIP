import { client, request } from '@/core/rpc.client.ts'

/**
 * Register the service worker and subscribe this browser to Web Push, so inbound messages notify even with the app
 * closed. Complements the SSE stream, which only reaches an open page. Safe to call on every dashboard mount: an
 * existing registration and subscription are reused.
 *
 * Silent no-op when the browser lacks push, permission isn't granted, or the server has no VAPID key configured --
 * none of which are errors, since SSE still covers the open-page case.
 */
export async function initPush(): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

  const { data: publicKey } = await request(client.api.push.key.$get())
  if (!publicKey) return

  // Scope the worker to the app directory (the first path segment) so `registration.scope` is a URL it can open on
  // notification click. The script itself stays at the root, which is what permits a scope this wide.
  const [, appdir] = window.location.pathname.split('/')
  const scope = appdir ? `/${appdir}/` : '/'
  const registration = await navigator.serviceWorker.register('/sw.js', { type: 'module', scope })
  console.log('registered service worker', registration)
  // An existing subscription is returned as-is, so this doesn't re-prompt.
  const existing = await registration.pushManager.getSubscription()
  if (!existing && (await Notification.requestPermission()) !== 'granted') return

  // `applicationServerKey` accepts the base64url VAPID key directly -- no Uint8Array conversion needed.
  const subscription = existing ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey }))

  const { keys } = subscription.toJSON()
  if (!keys?.p256dh || !keys.auth) return
  const json = { endpoint: subscription.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }
  await request(client.api.push.subscribe.$post({ json }))
}

/**
 * Drop this browser's subscription; without it the push service keeps delivering to a signed-out browser until the
 * endpoint expires on its own. Deleting the server row needs a valid token, so `revokeOnServer` is cleared on the
 * expired-session path -- the row is left for the 403/404/410 prune instead. No-ops when there is no subscription,
 * which makes a second call after an explicit logout harmless.
 */
export async function disablePush({ revokeOnServer = true } = {}): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  if (revokeOnServer) await request(client.api.push.subscribe.$delete({ json: { endpoint: subscription.endpoint } }))
  await subscription.unsubscribe()
}
