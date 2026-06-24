import { Schema, model } from 'mongoose'

const userSchema = new Schema({
    name: { type: String, required: true, lowercase: true, minLength: 2 }, // todo: name is a duplicate of email, can remove one
    email: { type: String, required: true, lowercase: true, minLength: 2 },
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
