import { model } from 'mongoose'
import { contactSchema } from '../../shared/schema/contact.ts'

const Contact = model('Contact', contactSchema)

export default Contact
