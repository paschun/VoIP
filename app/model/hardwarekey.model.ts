import { Schema, model } from 'mongoose'

const hardwareKeySchema = new Schema(
  {
    title: { type: String, required: true },
    registrationComplete: { type: Boolean, required: true },
    // The single WebAuthn credential id (base64url) minted for this registration. One key document = one credential.
    credentialId: { type: String, default: null },
    // WebAuthn user handle (base64url random) minted at enrollment and embedded in the credential; the assertion returns
    // it on login so we can find this key.
    userHandle: { type: String, required: true },
    aaguid: { type: String, default: null },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    created_at: { type: Date, default: Date.now },
  },
  { strict: 'throw', strictQuery: 'throw', id: false },
)
const HardwareKey = model('HardwareKey', hardwareKeySchema)

export default HardwareKey
