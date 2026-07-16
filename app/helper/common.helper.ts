import crypto from 'node:crypto'
import fs from 'node:fs'
import { format } from 'date-fns'
import { env } from '../core/env.ts'

/** date-fns format for the per-day upload folder name. */
export const UPLOAD_FOLDER_FORMAT = 'yyyyMMdd'
/** date-fns format used to build unique, human-readable Telnyx resource names (down to the minute). */
export const TIMESTAMP_FORMAT = 'yyyyMMddHHmm'

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
