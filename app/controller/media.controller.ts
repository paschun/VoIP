import { writeFile } from 'node:fs/promises'
import { bodyLimit } from 'hono/body-limit'
import { HTTPException } from 'hono/http-exception'
import cron from 'node-cron'
import type { ApiError, Ok } from '../contracts/envelope.ts'
import { uploadHeaders, CONTENT_TYPE_TO_EXT, type UploadHeaders } from '../contracts/media.ts'
import { factory } from '../core/factory.ts'
import type { HeaderCtx } from '../core/factory.ts'
import { prepareUploadTarget, pruneOldUploads } from '../helper/common.helper.ts'
import { auth } from '../middleware/auth.ts'
import { headerParams } from '../middleware/validate.ts'
import Media from '../model/media.model.ts'

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
  const ext = CONTENT_TYPE_TO_EXT[contentType]

  const bytes = Buffer.from(await c.req.arrayBuffer()) // load the whole file into memory
  if (bytes.length === 0) throw new HTTPException(400, { message: 'No file uploaded!' })

  const { mediaPath, fullUrl } = await prepareUploadTarget(ext)
  await writeFile(mediaPath, bytes)

  // Just the on-disk path is stored in mongo, but the full url is returned to the client.
  await Media.create({ media: mediaPath, user: c.get('user').id })
  return c.json({ data: { media: fullUrl } } satisfies Ok, 200)
}

cron.schedule('0 1 * * *', async () => {
  const removed = await pruneOldUploads()
  if (removed.length > 0) console.log('removed upload folders:', removed.join(', '))
})

// ── Route handler chain (auth + 10 MB body limit + handler), spread into the Hono group in media.route.ts ──────────

export const upload = factory.createHandlers(
  auth,
  // http 413: Content Too Large
  bodyLimit({
    maxSize: MAX_UPLOAD_BYTES,
    onError: (c) => c.json({ message: 'File too large!' } satisfies ApiError, 413),
  }),
  headerParams(uploadHeaders),
  uploadMedia,
)
