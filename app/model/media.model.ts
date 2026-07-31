import { Schema, model } from 'mongoose'
import { UPLOAD_RETENTION_DAYS } from '../helper/common.helper.ts'

/**
 * An uploaded MMS image.
 *
 * Both fields are `required` because the controller always sets them on `Media.create({ media, user })` -- there is no
 * empty-doc path. `media` is stored as a relative path (`uploads/<date>/<hash>.<ext>`) but the controller rewrites it
 * to an absolute URL (`BASE_URL` + path) before responding, so on the wire `media` is always a full URL string.
 */
export const mediaSchema = new Schema(
  {
    media: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { strict: 'throw', strictQuery: 'throw', id: false, timestamps: true },
)

// A doc only backs the send-time ownership check, so it expires with the file the upload cron prunes off disk.
mediaSchema.index({ createdAt: 1 }, { expires: `${UPLOAD_RETENTION_DAYS}d` })

const Media = model('Media', mediaSchema)

export default Media
