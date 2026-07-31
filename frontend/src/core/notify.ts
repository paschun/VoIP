/**
 * Lightweight wrappers around sweetalert2 for the common
 * "success / error / info toast" cases.
 *
 *   notifySuccess('Profile added successfully!')
 *   notifyError('Message or file required', 'Oops...')
 *   notifyInfo('Contact not deleted')
 *
 * For interactive dialogs (confirm/deny, inputs, preConfirm, etc.) call
 * `this.$swal.fire({ ... })` (or import `sweetalert2` directly) -- these helpers
 * intentionally only cover the simple notification case.
 */
import Swal from 'sweetalert2'
import type { SweetAlertIcon } from 'sweetalert2'

/** This origin's notification permission; one grant covers both the page and the service worker. */
export const getNotifPerm = () => {
  // iOS Safari only defines `Notification` once installed to the home screen. Read off `window`: a bare reference
  // to an undeclared global throws ReferenceError.
  if (!window.Notification) return 'denied'
  return Notification.permission
}

const fire = (icon: SweetAlertIcon, text?: string, title?: string) => Swal.fire({ icon, title, text })

export const notifySuccess = (text?: string, title = 'Success') => fire('success', text, title)
export const notifyError = (text?: string, title = 'Error') => fire('error', text, title)
export const notifyInfo = (text?: string, title = '') => fire('info', text, title)

/**
 * Notify an incoming message. Shown via the service worker first, the only path Android Chrome supports; the constructor is the
 * fallback for when no worker is registered. Permission is one origin-wide grant covering both, so the page's
 * `Notification.permission` governs the worker too. Silent unless already granted -- asking needs a user gesture,
 * which an arriving message is not.
 */
export async function showMessageNotification(number: string, message: string): Promise<void> {
  if (getNotifPerm() !== 'granted') return
  const title = 'Message from ' + number
  const options: NotificationOptions = { body: message, icon: '/pwa-192x192.png' }
  const registration = await navigator.serviceWorker.getRegistration()
  if (registration) await registration.showNotification(title, options)
  else new Notification(title, options)
}
