import mongoose, { type AnyObject } from 'mongoose'
import type { WireDoc } from '../wire.ts'

// https://github.com/Automattic/mongoose/blob/9.7.0/lib/schema/string.js
// Allows empty strings when using "required" validator
class EmptyString extends mongoose.Schema.Types.String {
  constructor(key: string, options?: AnyObject) {
    super(key, options, 'EmptyString')
  }

  // Override the checkRequired method. This method is called by the 'required' validator
  checkRequired(v: unknown) {
    // https://github.com/Automattic/mongoose/blob/9.7.0/lib/schema/string.js#L154
    // doesn't check v.length
    return v instanceof String || typeof v === 'string'
  }
}
Object.defineProperty(EmptyString, 'schemaName', { value: 'EmptyString' as const }) // get around TS readonly

// Extend the Mongoose namespace (Module Augmentation), to allow Schema.Types.EmptyString
declare module 'mongoose' {
  namespace Schema {
    namespace Types {
      export { EmptyString }
    }
  }
}

// Register custom type with Mongoose
mongoose.Schema.Types.EmptyString = EmptyString

// A user's address-book entry. `number` is stored canonical E.164 (the request contracts coerce via e164Phone).
export const contactSchema = new mongoose.Schema(
  {
    first_name: { type: EmptyString, required: true },
    last_name: { type: EmptyString, required: true },
    number: { type: EmptyString, required: true },
    note: { type: EmptyString, required: true },
    // validation: https://github.com/Automattic/mongoose/blob/9.7.0/lib/schema/objectId.js#L30 (toString())
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // date -> string: https://github.com/Automattic/mongoose/blob/master/lib/schemaType.js#L197
    // https://github.com/Automattic/mongoose/blob/master/lib/cast/date.js
    created_at: { type: Date, default: Date.now },
  },
  { strict: 'throw', strictQuery: 'throw' },
)

export type ContactDoc = WireDoc<typeof contactSchema>
