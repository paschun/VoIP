import { model } from 'mongoose'
import { mediaSchema } from '../../shared/schema/media.ts'

const Media = model('Media', mediaSchema)

export default Media
