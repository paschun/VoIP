import { Schema, model } from 'mongoose'

const userSchema = new Schema({
    name: { type: String, required: true, lowercase: true, minLength: 2 },
    // email used to be in here but was a dupe of name, so it was removed.
    password: { type: String, required: true, minLength: 6 },
    token: String,
    otp: String,
    mfa: {
        type: String,
        enum: ['false', 'true'],
        default: 'false',
    },
    mfa_token: {
        type: String,
        default: null,
    },
    hardwarekey: {
        type: String,
        enum: ['false', 'true'],
        default: 'false',
    },
})
const User = model('User', userSchema)

export default User
