import { Schema, model } from 'mongoose'

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
