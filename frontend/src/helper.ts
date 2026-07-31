/**
 * Functions shared across more than one file. Single-use helpers live in the
 * file that uses them.
 */
import Swal from 'sweetalert2'
import { notifyInfo } from '@/core/notify.ts'

function deviceClass() {
  const ua = navigator.userAgent
  const touch = navigator.maxTouchPoints > 1

  if (/iPhone|iPod/.test(ua) || /Android.*Mobile/.test(ua)) return 'phone'
  // iPadOS reports a Mac UA in desktop mode; touch points is the only tell.
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && touch)) return 'tablet'
  if (/Android/.test(ua) && !/Mobile/.test(ua)) return 'tablet'
  if (touch && !matchMedia('(pointer: fine)').matches) return 'tablet'
  return 'desktop'
}

/** Phone or tablet. Web Push is used only here -- desktop notifies from the page off the SSE stream. */
export const isMobile = () => deviceClass() !== 'desktop'

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

/** Warning-styled "Are you sure?" confirm ("Yes, remove it!" / cancel). Resolves `true` only on confirm. */
export async function confirmWarning(text: string): Promise<boolean> {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#3085d6',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Yes, remove it!',
  })
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
