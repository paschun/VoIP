/**
 * Lightweight wrappers around sweetalert2 for the common
 * "success / error / info toast" cases.
 *
 *   notifySuccess('Profile added successfully!')
 *   notifyError('Message or file required', 'Oops...')
 *   notifyInfo('Contact not deleted')
 *
 * For interactive dialogs (confirm/deny, inputs, preConfirm, etc.) call
 * `Vue.swal.fire({ ... })` directly — these helpers intentionally only
 * cover the simple notification case.
 */
import Vue from 'vue'
import type { SweetAlertIcon } from 'sweetalert2'

const fire = (icon: SweetAlertIcon, text?: string, title?: string) => Vue.swal.fire({ icon, title, text })

export const notifySuccess = (text?: string, title = 'Success') => fire('success', text, title)
export const notifyError   = (text?: string, title = 'Error')   => fire('error',   text, title)
export const notifyInfo    = (text?: string, title = '')        => fire('info',    text, title)
