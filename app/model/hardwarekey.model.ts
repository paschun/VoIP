import { Schema, model } from 'mongoose'

const hardwarekeySchema = new Schema({
    title: String,
    registrationComplete: {
        type: Boolean,
        default: false,
    },
    credentials: {
        // WebAuthn credential IDs (base64url strings) the client sends as `payload.id`; flat array of scalars
        type: [String],
        default: [],
    },
    id: {
        type: String,
        default: null,
    },
    userHandleToUsername: {
        type: String,
        default: null,
    },
    aaguid: {
        type: String,
        default: null,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    created_at: { type: Date, default: Date.now },
})
const Hardwarekey = model('Hardwarekey', hardwarekeySchema)

export default Hardwarekey
