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

const fire = (icon, text, title) => Vue.swal.fire({ icon, title, text })

export const notifySuccess = (text, title = 'Success') => fire('success', text, title)
export const notifyError   = (text, title = 'Error')   => fire('error',   text, title)
export const notifyInfo    = (text, title = '')        => fire('info',    text, title)
