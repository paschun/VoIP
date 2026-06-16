import { Schema } from 'mongoose'
import type { WireDoc } from '../wire.ts'

// A user's address-book entry. `number` is stored canonicalized (see the controller's normalizeNumber).
export const contactSchema = new Schema({
  first_name: String,
  last_name: String,
  number: String,
  note: String,
  // validation: https://github.com/Automattic/mongoose/blob/9.7.0/lib/schema/objectId.js#L30 (toString())
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  // date -> string: https://github.com/Automattic/mongoose/blob/master/lib/schemaType.js#L197
  // https://github.com/Automattic/mongoose/blob/master/lib/cast/date.js
  created_at: { type: Date, default: Date.now },
})

export type ContactDoc = WireDoc<typeof contactSchema>
