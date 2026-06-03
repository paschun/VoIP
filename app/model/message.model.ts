import { Schema, model } from 'mongoose'

const messageSchema = new Schema({
    sid: String,
    number: String,
    telnyx_number: String,
    type: {
        type: String,
        enum: ['send', 'receive'],
        default: 'send',
    },
    datatype: {
        type: String,
        enum: ['call', 'message'],
        default: 'message',
    },
    isview: {
        type: String,
        enum: ['false', 'true'],
        default: 'false',
    },
    status: {
        type: String,
        default: null,
    },
    message: String,
    media: String,
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    duration: {
        type: Number,
        default: null,
    },
    contact: {
        type: Schema.Types.ObjectId,
        ref: 'Contact',
    },
    setting: {
        type: Schema.Types.ObjectId,
        ref: 'Setting',
    },
    created_at: { type: Date, default: Date.now },
})
const Message = model('Message', messageSchema)

export default Message
