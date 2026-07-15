import { Schema, model } from 'mongoose'

const userSchema = new Schema(
  {
    name: { type: String, required: true, lowercase: true, minLength: 2 },
    // email used to be in here but was a dupe of name, so it was removed.
    password: { type: String, required: true, minLength: 6 },
    // TOTP base32 shared secret; persisted only after a code proves enrollment. Its presence means "TOTP enabled"
    totpSecret: {
      type: String,
      default: null,
    },
  },
  { strict: 'throw', strictQuery: 'throw', id: false },
)
const User = model('User', userSchema)

export default User
