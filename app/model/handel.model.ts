import { Schema, model } from 'mongoose'

// TODO: `Handel` is a misspelling of "handle" -- this maps a WebAuthn *user handle* (`id`, the authenticator-returned
// random) to its key `username`/owner for credential lookup during login. Rename model -> `Handle` (collection
// `handels` -> `handles`); needs a data migration, so left as-is for now.
const handelSchema = new Schema({
    username: String,
    id: String,
    registrationComplete: {
        type: Boolean,
        default: false,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    created_at: { type: Date, default: Date.now },
})
const Handel = model('Handel', handelSchema)

export default Handel
