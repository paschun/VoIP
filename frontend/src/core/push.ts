import { getNotifPerm } from '@/core/notify.ts'
import { client, request } from '@/core/rpc.client.ts'
import { isMobile } from '@/helper.ts'

/**
 * Register the service worker, which both receives Web Push and is the only way to raise a notification on Android.
 * Vite bundles the worker to `/sw.js` on build only, so dev registers the source file the dev server serves instead.
 * Mobile only -- desktop notifies from the page instead.
 */
function registerWorker(): Promise<ServiceWorkerRegistration> {
  // Scope the worker to the app directory (the first path segment) so `registration.scope` is a URL it can open on
  // notification click. In dev the script sits under `/src/`, so the dev server sends `Service-Worker-Allowed: /`.
  const [, appdir] = window.location.pathname.split('/')
  const scope = appdir ? `/${appdir}/` : '/'
  const url = import.meta.env.DEV ? '/src/sw.ts' : '/sw.js'
  const registration = navigator.serviceWorker.register(url, { type: 'module', scope })
  console.log('attempting to register service worker', registration)
  return registration
}

/** Subscribe to Web Push and store the subscription server-side. No-op when the server has no VAPID key configured. */
async function subscribeToPush(registration: ServiceWorkerRegistration): Promise<void> {
  const { data: publicKey } = await request(client.api.push.key.$get())
  if (!publicKey) return

  // An existing subscription is returned as-is, so this doesn't re-prompt. `applicationServerKey` accepts the
  // base64url VAPID key directly -- no Uint8Array conversion needed.
  const subscription =
    (await registration.pushManager.getSubscription()) ?? 
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey }))

  const { keys } = subscription.toJSON()
  if (!keys?.p256dh || !keys.auth) return
  const json = { endpoint: subscription.endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } }
  await request(client.api.push.subscribe.$post({ json }))
}

export type PushStatus = {
  workerState?: ServiceWorkerState
  endpoint?: string
}

/** Read this browser's service worker + push subscription. */
export async function getPushStatus(): Promise<PushStatus> {
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return {}
  const worker = registration.active ?? registration.waiting ?? registration.installing
  const subscription = await registration.pushManager.getSubscription()
  return {
    ...(worker && { workerState: worker.state }),
    ...(subscription && { endpoint: subscription.endpoint }),
  }
}

/**
 * Ask for notification permission, then bring this browser's push subscription up to date. Web Push is mobile-only:
 * desktop gets the same frames over SSE while a page is open, which is the only window in which it can notify.
 */
export async function requestAndSubscribe(): Promise<NotificationPermission> {
  let perm = getNotifPerm()
  if (perm === 'default') perm = await Notification.requestPermission() // only request if its default
  if (perm === 'granted' && isMobile()) await registerWorker().then(subscribeToPush)
  return perm
}


function setupFirstGestureHandler() {
  // Firefox requires user gesture to ask for permission
  const controller = new AbortController()
  const ask = () => {
    // calling `.abort` removes the event handler
    controller.abort()
    void requestAndSubscribe()
  }
  const options = { once: true, signal: controller.signal }
  addEventListener('pointerdown', ask, options)
  addEventListener('keydown', ask, options)
}

/**
 * Safe to call on every dashboard mount: an already-answered permission resolves without prompting, and an existing
 * subscription is reused. Call it directly from a gesture handler where one is available.
 */
export async function setupPush(): Promise<NotificationPermission> {
  const perm = await requestAndSubscribe()
  if (perm === 'default') setupFirstGestureHandler()
  return perm
}

/**
 * Drop this browser's subscription; without it the push service keeps delivering to a signed-out browser until the
 * endpoint expires on its own. Deleting the server row needs a valid token, so `revokeOnServer` is cleared on the
 * expired-session path -- the row is left for the 403/404/410 prune instead. No-ops when there is no subscription,
 * which makes a second call after an explicit logout harmless.
 */
export async function disablePush({ revokeOnServer = true } = {}): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration()
  const subscription = await registration?.pushManager.getSubscription()
  if (!subscription) return
  if (revokeOnServer) await request(client.api.push.subscribe.$delete({ json: { endpoint: subscription.endpoint } }))
  await subscription.unsubscribe()
}
