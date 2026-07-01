import crypto from 'node:crypto'
import fs from 'node:fs'
import { format, subDays } from 'date-fns'
import cron from 'node-cron'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import Media from '../model/media.model.ts'
import { factory } from '../core/factory.ts'
import type { HeaderCtx } from '../core/factory.ts'
import { auth } from '../middleware/auth.ts'
import { headerParams } from '../middleware/validate.ts'
import { combineURLs, UPLOAD_FOLDER_FORMAT } from '../helper/common.helper.ts'
import { env } from '../core/env.ts'
import { uploadHeaders, uploadExt, type UploadHeaders } from '../../shared/contracts/media.ts'
import type { ApiError, Ok } from '../../shared/api-contracts.ts'

/** Max accepted image-upload size, enforced per-request by the media route's bodyLimit (HTTP 413 if exceeded). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024 // 15 MB

// ── Handlers (signatures visible) ───────────────────────────────────────────────────────────────────────────────

// Hono port of the old multer `.single('file')` upload. The client streams the raw file body (to measure upload
// progress -- see Dashboard.vue's `uploadFile`), so there's no multipart part: the `Content-Type` header (validated by
// the route's `headerParams`) picks the stored extension and no client filename is trusted. `bodyLimit` (on the chain)
// enforces the {@link MAX_UPLOAD_BYTES} cap that multer's `limits.fileSize` used to; we write the body to
// `uploads/<date>/<hash><ext>`, then persist a Media doc and return it with `media` rewritten to an absolute URL.
async function uploadMedia(c: HeaderCtx<UploadHeaders>) {
  const validHeaders = c.req.valid('header')
  const contentType = validHeaders['content-type']
  const ext = uploadExt[contentType]

  const bytes = Buffer.from(await c.req.arrayBuffer()) // load the whole file into memory
  if (bytes.length === 0) throw new HTTPException(400, { message: 'No file uploaded!' })

  const date = format(new Date(), UPLOAD_FOLDER_FORMAT)
  const dir = `./uploads/${date}`
  const filename = crypto.randomBytes(24).toString('hex') + ext
  const mediaPath = `${dir}/${filename}`
  await fs.promises.mkdir(dir, { recursive: true })
  await fs.promises.writeFile(mediaPath, bytes)

  // `Media.create` resolves to the saved doc or rejects (validation / duplicate-key / connection) — it never returns
  // falsy, so there's no "not created" branch to guard; a real failure throws and `app.onError` logs it once as a 500.
  await Media.create({ media: mediaPath, user: c.get('user').id })
  // just the uploads path is stored in mongo, but the full url is returned to the client
  const fullMediaUrl = combineURLs(env.BASE_URL, mediaPath)
  return c.json({ data: { media: fullMediaUrl } } satisfies Ok, 200)
}

// todo: remove all folders older than 7 days
function pruneOldUploads() {
  const startdate = format(subDays(new Date(), 7), UPLOAD_FOLDER_FORMAT)
  try {
    fs.rmSync('./uploads/' + startdate, { recursive: true })
    console.log('removed upload folder:', startdate)
  } catch {
    console.error('folder not found:', startdate)
  }
}

cron.schedule('0 1 * * *', () => {
  console.log('running a cron job daily at 01:00 to delete mms folder older than 7 days')
  pruneOldUploads()
})

// ── Route handler chain (auth + 10 MB body limit + handler), spread into the Hono group in media.route.ts ──────────

export const upload = factory.createHandlers(
  auth,
  // http 413: Content Too Large
  bodyLimit({ maxSize: MAX_UPLOAD_BYTES, onError: (c) => c.json({ message: 'File too large!' } satisfies ApiError, 413) }),
  headerParams(uploadHeaders),
  uploadMedia,
)
