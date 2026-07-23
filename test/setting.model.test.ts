import { test, expect, assert, afterAll, beforeAll, describe } from 'vitest'
import mongoose from 'mongoose'
import { profilesWithUnread, profileWithUnread } from '../app/controller/profile.controller.ts'
import { TextMessage } from '../app/model/message.model.ts'
import Setting from '../app/model/setting.model.ts'
import { clearDb, connectMemoryDb, disconnectMemoryDb } from './helpers/mongo.ts'

test('toObject handles ObjectId', () => {
  const pojo = new Setting().toObject({ flattenObjectIds: true })
  expect(pojo.type).toBe('telnyx')
  expect(pojo._id).toBeTypeOf('string')
  expect(pojo._id).toHaveLength(24)
})

test.fails('toObject doesnt handle native Date', () => {
  const pojo = new Setting().toObject({ flattenObjectIds: true })
  expect.soft(pojo.created_at).toBeTypeOf('string')
  expect.soft(pojo.created_at).not.toBeInstanceOf(Date)
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
      TextMessage.create({
        sid: 'sid',
        number: '+10000000000',
        telnyx_number: '+19999999999',
        type: 'receive',
        setting,
        user: userObjId,
        isview,
      })
    await seed(work._id, false)
    await seed(work._id, false)
    await seed(home._id, false)
    await seed(work._id, true) // read -> excluded by the populate match
  })

  afterAll(async () => {
    await clearDb()
    await disconnectMemoryDb()
  })

  test('one populates unread messageCount and user-wide totalCount', async () => {
    const profile = await profileWithUnread(userObjId.toString(), profileObjId.toString())
    expect(profile.messageCount).toBe(2) // Work has 2 unread (the 3rd Work message is read)
    expect(profile.totalCount).toBe(3) // 3 unread across the user's profiles (2 Work + 1 Home)

    const pojo = profile.toObject({ flattenObjectIds: true })
    expect(pojo.messageCount).toBe(2)
    expect(pojo.totalCount).toBe(3)
  })
  test('many populates counts per profile', async () => {
    const hydratedProfiles = await profilesWithUnread(userObjId.toString())
    const pojos = hydratedProfiles.map((d) => d.toObject({ flattenObjectIds: true }))
    expect(pojos).toHaveLength(2)

    const work = pojos.find((p) => p.profile === 'Work')
    const home = pojos.find((p) => p.profile === 'Home')
    assert(work && home)
    expect(work.messageCount).toBe(2)
    expect(home.messageCount).toBe(1)
    expect(work.totalCount).toBe(3)
    expect(home.totalCount).toBe(3)
  })
})
