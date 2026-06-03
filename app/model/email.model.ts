import { Schema, model } from 'mongoose'

const emailSchema = new Schema({
    email: String,
    password: String,
    to_email: String,
    host: String,
    port: String,
    secure: Boolean,
    sender_email: String,
    pgpPublicKey: { type: String, default: null },
    pgpEncryptEnabled: { type: Boolean, default: false },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    created_at: { type: Date, default: Date.now },
})
const Email = model('Email', emailSchema)

export default Email
