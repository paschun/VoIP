import crypto from 'node:crypto'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { HTTPException } from 'hono/http-exception'
import { format, subDays } from 'date-fns'
import { env } from '../core/env.ts'

/** Root of the dated upload folders, relative to the server's cwd. */
export const UPLOAD_ROOT = 'uploads'
/** An upload folder is pruned once nothing has been written to it for this long. */
export const UPLOAD_RETENTION_DAYS = 7
/** date-fns format for the per-day upload folder name. */
export const UPLOAD_FOLDER_FORMAT = 'yyyyMMdd'
/** date-fns format used to build unique, human-readable Telnyx resource names (down to the minute). */
export const TIMESTAMP_FORMAT = 'yyyyMMddHHmm'

/**
 * Return `value` if present, else throw 409. An absent provider credential/id means the profile was never configured
 * for `provider` -- a conflict, not an upstream call with empty creds (which the provider rejects with 401)
 */
export function requireConfigured<T>(value: T | null | undefined, provider: 'twilio' | 'telnyx'): NonNullable<T> {
  if (value === null || value === undefined || value === '') {
    throw new HTTPException(409, { message: `${provider} is not configured for this profile` })
  }
  return value
}

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
 * the on-disk path (`uploads/...`, what we store) and its public URL. Shared by the raw upload and the MMS download.
 * The path must stay free of a `./` prefix: it is matched against the pathname of an upload URL when an outgoing MMS
 * checks attachment ownership.
 */
export const prepareUploadTarget = async (ext: string): Promise<{ mediaPath: string; fullUrl: string }> => {
  const dir = `${UPLOAD_ROOT}/${format(new Date(), UPLOAD_FOLDER_FORMAT)}`
  await mkdir(dir, { recursive: true })
  const name = `${crypto.randomBytes(24).toString('hex')}${ext}`
  return { mediaPath: combineURLs(dir, name), fullUrl: combineURLs(env.BASE_URL, dir, name) }
}

/**
 * Delete every upload folder untouched for {@link UPLOAD_RETENTION_DAYS}, returning the names removed. Age comes from
 * the folder's mtime rather than its name, so {@link UPLOAD_FOLDER_FORMAT} can change freely. Loose files in the root
 * are left alone.
 */
export const pruneOldUploads = async (): Promise<string[]> => {
  const cutoff = subDays(new Date(), UPLOAD_RETENTION_DAYS)
  const entries = await readdir(UPLOAD_ROOT, { withFileTypes: true }).catch(() => []) // nothing uploaded yet
  const folders = await Promise.all(
    entries.filter((e) => e.isDirectory()).map(async ({ name }) => ({ name, mtime: (await stat(`${UPLOAD_ROOT}/${name}`)).mtime })),
  )
  const stale = folders.filter(({ mtime }) => mtime < cutoff).map(({ name }) => name)
  await Promise.all(stale.map((name) => rm(`${UPLOAD_ROOT}/${name}`, { recursive: true, force: true })))
  return stale
}
