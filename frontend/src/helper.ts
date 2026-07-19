/**
 * Functions shared across more than one file. Single-use helpers live in the
 * file that uses them.
 */
import Swal from 'sweetalert2'
import { notifyInfo } from '@/core/notify.ts'

/**
 * Confirm/deny "delete X?" dialog. Resolves `true` only on confirm; a deny shows the `denyMessage` toast; a dismiss
 * (esc/backdrop) resolves `false` silently.
 */
export async function confirmDelete(title: string, denyMessage = 'Not deleted'): Promise<boolean> {
  const result = await Swal.fire({
    icon: 'info',
    title,
    showDenyButton: true,
    showCancelButton: false,
    confirmButtonText: 'Yes, Delete',
    denyButtonText: 'No',
  })
  if (result.isDenied) void notifyInfo(denyMessage)
  return result.isConfirmed
}

/**
 * Format a `created_at` timestamp for display (an inbox row or a thread entry).
 *
 * @param value     The `created_at` ISO timestamp.
 * @param longMonth `true` -> "December", `false` -> "Dec".
 * @returns The formatted "Month D, YYYY h:mm AM" string, or `''` if unparseable.
 */
export const formatTimestamp = (value: string, longMonth = true): string => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: longMonth ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

/** Seconds -> "mm:ss" call-duration display (minutes aren't capped at an hour). */
export const formatDuration = (seconds: number): string =>
  String(Math.trunc(seconds / 60)).padStart(2, '0') + ':' + String(Math.trunc(seconds) % 60).padStart(2, '0')
