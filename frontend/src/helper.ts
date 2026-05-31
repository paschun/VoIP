/**
 * Functions shared across more than one file. Single-use helpers live in the
 * file that uses them.
 */

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
 * `$cookie.get(...)`, which return `string | null`. Returns `null` for a
 * null/undefined input (mirroring the old `JSON.parse(null)` → null behavior)
 * instead of the awkward `?? 'null'` dance. Throws on malformed JSON, like
 * `JSON.parse` itself.
 */
export const parseJSON = (value: string | null): any =>
  value === null ? null : JSON.parse(value)

/**
 * Format a date/time the way the old `vue-moment` `| moment("LLL"|"lll")` filter
 * did (vue-moment was dropped in the Vue 3 upgrade — Vue 3 removed filters).
 * `LLL` -> "May 30, 2026 1:40 AM" (full month); `lll` -> abbreviated month.
 * Used in Dashboard.vue + inbox/NumberList.vue.
 */
export const formatMoment = (value: string | number | Date | null | undefined, style: 'LLL' | 'lll' = 'LLL'): string => {
  if (value === null || value === undefined || value === '') return ''
  const d = new Date(value)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', {
    month: style === 'LLL' ? 'long' : 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  // Intl emits "May 30, 2026, 1:40 AM"; moment's LLL has no comma before the
  // time — drop just that one.
  }).format(d).replace(/, (\d{1,2}:\d{2}\s[AP]M)$/, ' $1')
}

/** Join URL fragments with exactly one `/` between them. */
export const combineURLs = (...urls: string[]): string => urls.reduce(
  (acc, part) => acc.replace(/\/+$/, '') + '/' + part.replace(/^\/+/, '')
)
