import { Schema, model, type InferRawDocType } from 'mongoose'

const contactSchemaDefinition = {
    first_name: String,
    last_name: String,
    number: String,
    note: String,
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    },
    created_at : { type : Date, default: Date.now }
} as const
const contactSchema = new Schema(contactSchemaDefinition)
const Contact = model('Contact', contactSchema)

type RawContactDocument = InferRawDocType<typeof contactSchemaDefinition>;

export default Contact