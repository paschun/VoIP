import type { PushMessage } from '@shared/contracts/push.ts'

declare const self: ServiceWorkerGlobalScope 

const ICON = '/pwa-192x192.png'

/** Open app windows, including pages loaded before this worker took control. */
const windows = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true })

/**
 * Show a notification unless a page is already on screen -- a visible page gets the same frame over SSE and notifies
 * itself, so suppressing here is what keeps the two transports from double-notifying. Chrome's `userVisibleOnly`
 * contract explicitly permits staying silent while a visible client exists.
 */
async function notify({ number, message }: PushMessage) {
  if ((await windows()).some((client) => client.visibilityState === 'visible')) return
  await self.registration.showNotification(`Message from ${number}`, { body: message, icon: ICON })
}

self.addEventListener('push', (event) => {
  if (!event.data) return
  // Our own server encrypted this payload, so it's parsed but not re-validated.
  event.waitUntil(notify(event.data.json() as PushMessage))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    windows().then((clients) => {
      const open = clients[0]
      // Registration scope is the app directory, so this resolves to the dashboard without the server naming it.
      return open ? open.focus() : self.clients.openWindow(new URL('dashboard', self.registration.scope).href)
    }),
  )
})
