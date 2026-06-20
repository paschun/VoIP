import { Schema, model } from 'mongoose'

const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    password: { type: String, required: true },
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
