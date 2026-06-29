import { test, expect, afterAll, afterEach, beforeAll, describe } from 'vitest'
import mongoose from 'mongoose'
import Setting from '../app/model/setting.model.ts'
import { TextMessage } from '../app/model/message.model.ts'
import { clearDb, connectMemoryDb, disconnectMemoryDb } from './helpers/mongo.ts'
import { profilesWithUnread, profileWithUnread } from '../app/controller/profile.controller.ts'


test('toObject handles ObjectId', () => {
  const doc = new Setting()
  // const obj = doc.toObject()
  const pojo = doc.toObject({ flattenObjectIds: true })
  // const datejson = pojo.created_at.toJSON()
  // const stringified = JSON.stringify(doc)
  
  expect(pojo.type).toBe('telnyx')
  expect(pojo._id).toBeTypeOf('string')
  expect(pojo._id).toHaveLength(24)
  // expect(pojo.created_at)
  
  // const parsed = JSON.parse(stringified) 
  // console.log('setting.toObject', pojo)
  // console.log(typeof pojo.created_at)
  // console.log(pojo.created_at.toJSON())
  // console.log(pojo.created_at instanceof Date)
  // console.log('JSON.stringify(setting):', stringified)
})

describe('toObject handles virtuals', () => {

  let userObjId: mongoose.Types.ObjectId
  let profileObjId: mongoose.Types.ObjectId
  
  beforeAll(async () => {
    await connectMemoryDb()

    userObjId = new mongoose.Types.ObjectId()

    const work = await Setting.create({ user: userObjId, profile: 'Work', type: 'twilio' })
    profileObjId = work._id
    const home = await Setting.create({ user: userObjId, profile: 'Home', type: 'telnyx' })
    const seed = (setting: mongoose.Types.ObjectId, isview: boolean) =>
      TextMessage.create({ sid: 'sid', number: '+10000000000', telnyx_number: '+19999999999', type: 'receive', setting, user: userObjId, isview })
    await seed(work._id, false)
    await seed(work._id, false)
    await seed(home._id, false)
    await seed(work._id, true) // read -> excluded by the populate match
  })

  afterAll(async () => {
    await clearDb()
    await disconnectMemoryDb()
  })

  test('one', async () => {
    const profile = await profileWithUnread(userObjId.toString(), profileObjId.toString())
    // const b = profile.populated('messageCount')
  })
  test('many', async () => {
    const hydratedProfiles = await profilesWithUnread(userObjId.toString())
    const pojos = hydratedProfiles.map((d) => d.toObject({ flattenObjectIds: true }))
  })
})