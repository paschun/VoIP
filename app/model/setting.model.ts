import { model } from 'mongoose'
import { settingSchema } from '../../shared/schema/setting.ts'

const Setting = model('Setting', settingSchema)

export default Setting
