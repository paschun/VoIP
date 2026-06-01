/**
 * Functions shared across more than one file. Single-use helpers live in the
 * file that uses them.
 */
import type { Conversation, Message } from '@shared/api-contracts.ts'

/**
 * Recursively convert a PublicKeyCredential (or chunks of it) into a
 * JSON-serializable shape. ArrayBuffers become base64url strings.
 *
 * Used by both the login flow (assertion) and the hardware-key registration
 * flow.
 */
export const publicKeyCredentialToJSON = (pubKeyCred: any): any => {
  if (Array.isArray(pubKeyCred)) {
    return pubKeyCred.map(publicKeyCredentialToJSON)
  }
  if (pubKeyCred instanceof ArrayBuffer) {
    return new Uint8Array(pubKeyCred).toBase64({ alphabet: 'base64url' })
  }
  if (pubKeyCred && typeof pubKeyCred === 'object') {
    const obj: Record<string, any> = {}
    for (const key in pubKeyCred) {
      obj[key] = publicKeyCredentialToJSON(pubKeyCred[key])
    }
    return obj
  }
  return pubKeyCred
}

/**
 * `JSON.parse` a value that may be absent — e.g. `localStorage.getItem(...)` or
 * `cookie.get(...)`, which return `string | null`. Returns `null` for a
 * null/undefined input (mirroring the old `JSON.parse(null)` → null behavior)
 * instead of the awkward `?? 'null'` dance. Throws on malformed JSON, like
 * `JSON.parse` itself.
 */
export const parseJSON = (value: string | null | undefined): any =>
  value === null || value === undefined ? null : JSON.parse(value)

/**
 * Format a `created_at` timestamp for display.
 *
 * Both call sites (a Conversation inbox row + a Message thread entry) drive this.
 * Their `created_at` shapes are identical today, but the union documents that and
 * keeps tracking either contract if one diverges — hence the duplicate-constituent
 * disable below.
 *
 * @param value     The `created_at` timestamp
 * @param longMonth `true` → "December", `false` → "Dec".
 * @returns The formatted "Month D, YYYY h:mm AM" string, or `''` if unparseable.
 */
// eslint-disable-next-line @typescript-eslint/no-duplicate-type-constituents
export const formatTimestamp = (value: Conversation['created_at'] | Message['created_at'], longMonth = true): string => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: longMonth ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d)
}

/** Join URL fragments with exactly one `/` between them. */
export const combineURLs = (...urls: string[]): string => urls.reduce(
  (acc, part) => acc.replace(/\/+$/, '') + '/' + part.replace(/^\/+/, '')
)
