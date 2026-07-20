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

const fire = (icon: SweetAlertIcon, text?: string, title?: string) => Swal.fire({ icon, title, text })

export const notifySuccess = (text?: string, title = 'Success') => fire('success', text, title)
export const notifyError = (text?: string, title = 'Error') => fire('error', text, title)
export const notifyInfo = (text?: string, title = '') => fire('info', text, title)

/** Desktop-notify an incoming message, requesting Notification permission on first use. */
export async function showMessageNotification(number: string, message: string): Promise<void> {
  if (!('Notification' in window)) {
    void Swal.fire({
      position: 'top-end',
      icon: 'warning',
      title: 'Desktop notifications are not supported in this browser',
      showConfirmButton: false,
      timer: 2500,
    })
    return
  }
  if (Notification.permission === 'denied') return
  if (Notification.permission !== 'granted' && (await Notification.requestPermission()) !== 'granted') return
  const icon = new URL('@/assets/img/icon.png', import.meta.url).href
  new Notification('Message from ' + number, { body: message, dir: 'auto', icon })
}
