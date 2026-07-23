import { Schema, model } from 'mongoose'

/**
 * An uploaded MMS image.
 *
 * Both fields are `required` because the controller always sets them on `Media.create({ media, user })` — there is no
 * empty-doc path. `media` is stored as a relative path (`uploads/<date>/<hash>.<ext>`) but the controller rewrites it
 * to an absolute URL (`BASE_URL` + path) before responding, so on the wire `media` is always a full URL string.
 */
export const mediaSchema = new Schema(
  {
    media: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { strict: 'throw', strictQuery: 'throw', id: false },
)

const Media = model('Media', mediaSchema)

export default Media
