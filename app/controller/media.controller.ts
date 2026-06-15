import path from 'node:path'
import crypto from 'node:crypto'
import fs from 'node:fs'
import moment from 'moment'
import cron from 'node-cron'
import type { Context } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import Media from '../model/media.model.ts'
import { factory } from '../factory.ts'
import type { Env } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { sendDoc } from '../util/respond.hono.ts'
import { combineURLs, uploadFolderFormat } from '../helper/common.helper.ts'
import { env } from '../../config/env.ts'
import type { MediaDoc } from '../../shared/schema/media.ts'
import type { ApiErrorEnvelope } from '../../shared/api-contracts.ts'

const maxSize = 10_000_000 // 10 MB
const allowedTypes = /jpeg|jpg|gif|png/ // mirror of the old multer fileFilter (mimetype + extension)

// ── Handlers (signatures visible) ───────────────────────────────────────────────────────────────────────────────

// Hono port of the old multer `.single('file')` upload. `bodyLimit` (on the chain) enforces the 10 MB cap that
// multer's `limits.fileSize` used to; here we read the parsed `File`, re-check type/extension, write it to disk under
// `uploads/<date>/<hash><ext>`, then persist a Media doc and return it with `media` rewritten to an absolute URL.
async function uploadMedia(c: Context<Env>) {
  try {
    const body = await c.req.parseBody()
    const file = body['file']
    if (!(file instanceof File)) {
      return c.json({ status: 'false', message: 'No file uploaded!' } satisfies ApiErrorEnvelope, 400)
    }
    const ext = path.extname(file.name).toLowerCase()
    if (!allowedTypes.test(file.type) || !allowedTypes.test(ext)) {
      const message = 'Error: File upload only supports the following filetypes - ' + allowedTypes
      return c.json({ status: 'false', message } satisfies ApiErrorEnvelope, 400)
    }
    const date = moment().format(uploadFolderFormat)
    const dir = `./uploads/${date}`
    await fs.promises.mkdir(dir, { recursive: true })
    const filename = crypto.randomBytes(24).toString('hex') + ext
    await fs.promises.writeFile(`${dir}/${filename}`, Buffer.from(await file.arrayBuffer()))

    const media = await Media.create({ media: `uploads/${date}/${filename}`, user: c.get('user').id })
    if (media) {
      // just uploads path is stored in mongo, but full url is returned to client
      media.media = combineURLs(env.BASE_URL, media.media)
      return sendDoc<MediaDoc>(c, media, 'Media upload!')
    }
    return c.json({ status: 'false', message: 'Media not uploaded!' } satisfies ApiErrorEnvelope, 400)
  } catch {
    return c.json({ status: 'false', message: 'something is wrong' } satisfies ApiErrorEnvelope, 400)
  }
}

// todo: remove all folders older than 7 days
function pruneOldUploads() {
  const startdate = moment().subtract(7, 'days').format(uploadFolderFormat)
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
  bodyLimit({ maxSize, onError: (c) => c.json({ status: 'false', message: 'File too large!' } satisfies ApiErrorEnvelope, 413) }),
  uploadMedia,
)
