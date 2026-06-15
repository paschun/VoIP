import { Schema, model } from 'mongoose'

const settingSchema = new Schema({
    api_key: String,
    number: String,
    setting: String,
    sid: String,
    twilio_sid: String,
    twilio_token: String,
    profile: String,
    emailnotification: {
        type: String,
        enum: ['false', 'true'],
        default: 'false',
    },
    type: {
        type: String,
        enum: ['telnyx', 'twilio'],
        default: 'telnyx',
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    app_key: { type: String, default: null },
    app_secret: { type: String, default: null },
    twiml_app: { type: String, default: null },
    sip_id: { type: String, default: null },
    sip_username: { type: String, default: null },
    sip_password: { type: String, default: null },
    telnyx_twiml: { type: String, default: null },
    telnyx_outbound: { type: String, default: null },
    created_at: { type: Date, default: Date.now },
}, {
    // Virtuals are document properties that you can get and set and populate but that do not get persisted to MongoDB.
    // Type inference works better when these are defined in the constructor.
    virtuals: {
        messageCount: {
            options: {
                ref: 'Message',
                localField: '_id', // Find where settingSchema._id is equal to
                foreignField: 'setting', // Message.setting
                count: true,
            },
        },
        totalCount: {
            options: {
                ref: 'Message',
                localField: 'user', // Find where settingSchema.user
                foreignField: 'user', // is equal to Message.user
                count: true,
            },
        },
    },
    toJSON: { virtuals: true }, // So `res.json()` and other `JSON.stringify()` functions include virtuals
    toObject: { virtuals: true }, // So `console.log()` and other functions that use `toObject()` include virtuals
})
const Setting = model('Setting', settingSchema)
// console.dir(settingSchema.toJSONSchema(), { depth: 5 })


export default Setting
