import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({ 
    name: String,
    email: String,
    password: String,
    token: String,
    otp: String,
    mfa: {
        type: String,
        enum : ['false','true'],
        default: 'false'
    },
    mfa_token: {
        type: String,
        default: null
    },
    hardwarekey:{
        type: String,
        enum : ['false','true'],
        default: 'false'
    }
})
const User = mongoose.model('User', userSchema);

export default User