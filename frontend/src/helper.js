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
export const publicKeyCredentialToJSON = (pubKeyCred) => {
  if (Array.isArray(pubKeyCred)) {
    return pubKeyCred.map(publicKeyCredentialToJSON)
  }
  if (pubKeyCred instanceof ArrayBuffer) {
    return new Uint8Array(pubKeyCred).toBase64({ alphabet: 'base64url' })
  }
  if (pubKeyCred && typeof pubKeyCred === 'object') {
    const obj = {}
    for (const key in pubKeyCred) {
      obj[key] = publicKeyCredentialToJSON(pubKeyCred[key])
    }
    return obj
  }
  return pubKeyCred
}

/** Join URL fragments with exactly one `/` between them. */
export const combineURLs = (...urls) => urls.reduce(
  (acc, part) => acc.replace(/\/+$/, '') + '/' + part.replace(/^\/+/, '')
)
