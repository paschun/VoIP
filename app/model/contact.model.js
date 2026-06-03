import mongoose from 'mongoose'

const Contact = mongoose.model('Contact', { 
    first_name: String,
    last_name: String,
    number: String,
    note: String,
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    created_at : { type : Date, default: Date.now }
});


export default Contact