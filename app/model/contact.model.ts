import mongoose from 'mongoose'

const contactSchemaDefinition = {
    first_name: String,
    last_name: String,
    number: String,
    note: String,
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    created_at : { type : Date, default: Date.now }
} as const
const contactSchema = new mongoose.Schema(contactSchemaDefinition)
const Contact = mongoose.model('Contact', contactSchema)

export default Contact