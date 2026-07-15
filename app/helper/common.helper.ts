import crypto from 'node:crypto'
import fs from 'node:fs'
import { format } from 'date-fns'
import { SignJWT } from 'jose'
import { env } from '../core/env.ts'

/** date-fns format for the per-day upload folder name. */
export const UPLOAD_FOLDER_FORMAT = 'yyyyMMdd'
/** date-fns format used to build unique, human-readable Telnyx resource names (down to the minute). */
export const TIMESTAMP_FORMAT = 'yyyyMMddHHmm'

/** HS256 algo expects a key size of >= 256 Bits == 32 chars.
 * Uint8Array.BYTES_PER_ELEMENT === 1 , each character becomes a single element in byte array, so each char is 8 bits.
 * 256 bits / 8 bits per char == 32 chars
 */
export const jwtSecret = new TextEncoder().encode(env.COOKIE_KEY)

/** Sign a JWT. Only `id` matters to the profile/hardwarekey controllers.
 *
 * https://github.com/panva/jose/blob/HEAD/docs/jwt/sign/classes/SignJWT.md
 * HS256 requires a 256-bit (32-byte) secret (symmetric encryption)
 * 3 parts (b64 encoded) : header.payload.signature
 * decoded JOSE (JSON Object Signing and Encryption) header: { "alg": "HS256" }
 * decoded payload:{ "id": "6322cb0813d8a71034f6efcc", "name": "example", "exp": 1782625311 }
 * signature: MAC of the encoded JOSE Header and encoded JWS Payload with the HMAC SHA-256 algorithm and base64url encoding the HMAC value
 */
export const signToken = (id: string, name: string): Promise<string> =>
  new SignJWT({ id, name }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('30d').sign(jwtSecret)

/** Join path segments into one URL, trimming the slashes at each seam so there are no doubles.
 * The first segment keeps any leading slash and the last keeps any trailing slash.
 */
export const combineURLs = (...urls: string[]): string => {
  if (urls.length === 0) return ''
  return urls.reduce((base, segment) => {
    const left = base.replace(/\/+$/, '') // strip any trailing slash(es) from the accumulated left side
    const right = segment.replace(/^\/+/, '') // strip any leading slash(es) from the next segment
    return `${left}/${right}` // rejoin with exactly one slash at the seam
  })
}

/**
 * Ensure today's `uploads/<date>/` dir exists and reserve a unique target for a file with `ext` (leading dot). Returns
 * the on-disk path (`./uploads/...`, what we store) and its public URL. Shared by the raw upload and the MMS download.
 */
export const prepareUploadTarget = async (ext: string): Promise<{ mediaPath: string; fullUrl: string }> => {
  const dir = `uploads/${format(new Date(), UPLOAD_FOLDER_FORMAT)}`
  await fs.promises.mkdir(`./${dir}`, { recursive: true })
  const name = `${crypto.randomBytes(24).toString('hex')}${ext}`
  return { mediaPath: combineURLs('./', dir, name), fullUrl: combineURLs(env.BASE_URL, dir, name) }
}
