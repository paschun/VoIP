import mongoose from 'mongoose'

const contactSchema = new mongoose.Schema({ 
    first_name: String,
    last_name: String,
    number: String,
    note: String,
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    created_at : { type : Date, default: Date.now }
})
const Contact = mongoose.model('Contact', contactSchema)

export default Contact