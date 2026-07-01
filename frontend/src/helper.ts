/**
 * Functions shared across more than one file. Single-use helpers live in the
 * file that uses them.
 */
import type { SelectOptionData } from 'vue3-select-component'
import type { Contact } from '@shared/api-contracts.ts'

/**
 * `JSON.parse` a value that may be absent — e.g. `localStorage.getItem(...)` or
 * `cookie.get(...)`, which return `string | null`. Returns `null` for a
 * null/undefined input (mirroring the old `JSON.parse(null)` → null behavior)
 * instead of the awkward `?? 'null'` dance. Throws on malformed JSON, like
 * `JSON.parse` itself.
 */
export const parseJSON = (value: string | null | undefined): any => (value === null || value === undefined ? null : JSON.parse(value))

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

/** Map contacts to `v-select` options (label = full name, value = number). */
export const contactsToOptions = (contacts: Contact[]): SelectOptionData<string>[] =>
  contacts.map((c) => ({ label: `${c.first_name} ${c.last_name}`, value: c.number }))

/** Join URL fragments with exactly one `/` between them. */
export const combineURLs = (...urls: string[]): string => urls.reduce((acc, part) => acc.replace(/\/+$/, '') + '/' + part.replace(/^\/+/, ''))
