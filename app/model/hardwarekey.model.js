import mongoose from 'mongoose'

const hardwarekeySchema = new mongoose.Schema({ 
    title: String,
    registrationComplete: {
        type: Boolean,
        default: false
    },
    credentials:{
        type: Array,
        default: []
    },
    id: {
        type: String,
        default: null
    },
    userHandleToUsername:{
        type: String,
        default: null
    },
    aaguid:{
        type: String,
        default: null
    }, 
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    created_at : { type : Date, default: Date.now }
})
const Hardwarekey = mongoose.model('Hardwarekey', hardwarekeySchema);


export default Hardwarekey