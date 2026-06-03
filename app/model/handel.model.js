import mongoose from 'mongoose'

const handelSchema = new mongoose.Schema({ 
    username: String,
    id: String,
    registrationComplete: {
        type: Boolean,
        default: false
    },
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        default: null
    },
    created_at : { type : Date, default: Date.now }
})
const Handel = mongoose.model('Handel', handelSchema);

export default Handel