import { Schema, model, type InferRawDocType } from 'mongoose'

const contactSchemaDefinition = {
    first_name: String,
    last_name: String,
    number: String,
    note: String,
    // validation: https://github.com/Automattic/mongoose/blob/9.7.0/lib/schema/objectId.js#L30
    // toString()
    user: { 
        type: Schema.Types.ObjectId, 
        ref: 'User' 
    },
    created_at : { type : Date, default: Date.now }
    // date -> string https://github.com/Automattic/mongoose/blob/master/lib/schemaType.js#L197
    // https://github.com/Automattic/mongoose/blob/master/lib/cast/date.js
} as const
const contactSchema = new Schema(contactSchemaDefinition)
const Contact = model('Contact', contactSchema)

type RawContactDocument = InferRawDocType<typeof contactSchemaDefinition>;
const contactJsonSchema = contactSchema.toJSONSchema({ useBsonType: false })
// console.dir(contactJsonSchema, { depth: 5 })

export default Contact