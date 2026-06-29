import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import twilio from 'twilio'
import Telnyx from 'telnyx'
import Setting from '../model/setting.model.ts'
import { Message } from '../model/message.model.ts'
import * as telnyxHelper from '../helper/telnyx.helper.ts'
import * as twilioHelper from '../helper/twilio.helper.ts'
import { factory } from '../factory.ts'
import type { Env, JsonCtx, ParamCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody, pathParams } from '../validate.ts'
import type { Ok } from '../../shared/api-contracts.ts'
import {
  profileCreateBody, type CreateProfileRequest,
  profileIdParam, type ProfileIdParam,
} from '../../shared/contracts/profile.ts'

// todo: confusing field naming -- a Setting doc *is* a "profile", yet also has its own `profile` (the display name)
// and `setting` string fields. Rename for clarity (needs a schema migration).
async function createProfile(c: JsonCtx<CreateProfileRequest>) {
  const { profile } = c.req.valid('json')
  const user = c.get('user').id
  const exists = await Setting.findOne({ user: { $eq: user }, profile: { $eq: profile } })
  if (exists) throw new HTTPException(409, { message: 'Profile already exists!' })
  const saved = await Setting.create({ user, profile })
  const data = saved.toObject({ flattenObjectIds: true })
  return c.json({ data } satisfies Ok, 201)
}

export const profileWithUnread = (userId: string, profileId: string, onFail?: () => NativeError) => (
  Setting.findOne({ user: { $eq: userId }, _id: { $eq: profileId } }) // type: Document
    // mongoose types have trouble inferring type when populating virtual, so add it as generic param in populate
    .populate<{ messageCount: number }>({ path: 'messageCount', match: { isview: false } }) // unread only
    .populate<{ totalCount: number }>({ path: 'totalCount', match: { isview: false } })
    // https://github.com/Automattic/mongoose/blob/9.7.1/lib/query.js#L4669
    .orFail(onFail)
)

export const profilesWithUnread = (userId: string) => (
  Setting.find({ user: { $eq: userId } }) // type: Document[]
    .populate<{ messageCount: number }>({ path: 'messageCount', match: { isview: false } }) // type: PopulateDocumentResult<Document>
    .populate<{ totalCount: number }>({ path: 'totalCount', match: { isview: false } })
)

async function getProfile(c: ParamCtx<ProfileIdParam>) {
  const { id } = c.req.valid('param')
  const profile = await profileWithUnread(c.get('user').id, id, () => new HTTPException(404, { message: 'Profile not found!' }))
  const data = profile.toObject({ flattenObjectIds: true })
  return c.json({ data } satisfies Ok, 200)
}
async function getProfiles(c: Context<Env>) {
  // A user with no profiles yet is a valid empty list, not a 404.
  const profiles = await profilesWithUnread(c.get('user').id)
  const data = profiles.map((d) => d.toObject({ flattenObjectIds: true }))
  return c.json({ data } satisfies Ok, 200)
}

async function removeProfile(c: ParamCtx<ProfileIdParam>) {
  const { id } = c.req.valid('param')
  // Scope by user so one user can't delete another's profile by guessing its id (IDOR); a non-owned id 404s.
  const setting = await Setting.findOne({ _id: { $eq: id }, user: { $eq: c.get('user').id } })
    .orFail(() => new HTTPException(404, { message: 'Profile not found!' }))

  await Message.deleteMany({ setting: setting._id })

  // Best-effort provider teardown: each call is wrapped so a failed cleanup doesn't block the delete. `?? ''` covers
  // fields the type allows to be null -- the provider rejects the empty value and the catch swallows it.
  const apiKey = setting.api_key
  const settingId = setting.setting
  if (setting.type === 'telnyx' && apiKey && settingId) {
    const telnyxClient = new Telnyx({ apiKey })
    try { await telnyxClient.phoneNumbers.update(setting.sid ?? '', { connection_id: '' }) } catch { /* ignore */ }
    if (setting.sip_id) {
      try { await telnyxHelper.deleteSIPApp(apiKey, setting.sip_id) } catch { /* ignore */ }
      try { await telnyxHelper.deleteOutboundVoice(apiKey, setting.telnyx_outbound ?? '') } catch { /* ignore */ }
    }
    if (setting.telnyx_twiml) {
      try { await telnyxHelper.deleteTexmlApp(apiKey, setting.telnyx_twiml) } catch { /* ignore */ }
    }
    try { await telnyxClient.phoneNumbers.messaging.update(setting.sid ?? '', { messaging_profile_id: '' }) } catch { /* ignore */ }
    try { await telnyxClient.messagingProfiles.delete(settingId) } catch { /* ignore */ }
  }

  const twilioSid = setting.twilio_sid
  const twilioToken = setting.twilio_token
  if (setting.type === 'twilio' && twilioSid && twilioToken && setting.sid) {
    if (setting.app_key) {
      try { await twilioHelper.removeAPIKey(twilioSid, twilioToken, setting.app_key) } catch { /* ignore */ }
    }
    if (setting.twiml_app) {
      try { await twilioHelper.deleteTwiml(twilioSid, twilioToken, setting.twiml_app) } catch { /* ignore */ }
    }
    const twilioClient = twilio(twilioSid, twilioToken)
    const numbers = twilioClient.incomingPhoneNumbers(setting.sid ?? '')
    try { await numbers.update({ smsUrl: '', voiceUrl: '', statusCallback: '' }) } catch { /* ignore */ }
  }

  await Setting.deleteOne({ _id: { $eq: id } })
  const data = setting.toObject({ flattenObjectIds: true })
  return c.json({ data } satisfies Ok, 200)
}

export const create = factory.createHandlers(auth, jsonBody(profileCreateBody), createProfile)
export const getAll = factory.createHandlers(auth, getProfiles)
export const getOne = factory.createHandlers(auth, pathParams(profileIdParam), getProfile)
export const deleteProfile = factory.createHandlers(auth, pathParams(profileIdParam), removeProfile)
