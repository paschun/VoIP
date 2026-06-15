import { model } from 'mongoose'
import { emailSchema } from '../../shared/schema/email.ts'

const Email = model('Email', emailSchema)

export default Email
