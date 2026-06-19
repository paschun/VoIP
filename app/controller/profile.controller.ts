import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import twilio from 'twilio'
import Telnyx from 'telnyx'
import Setting from '../model/setting.model.ts'
import Message from '../model/message.model.ts'
import * as telnyxHelper from '../helper/telnyx.helper.ts'
import * as twilioHelper from '../helper/twilio.helper.ts'
import { factory } from '../factory.ts'
import type { Env, JsonCtx, ParamCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody, pathParams } from '../validate.ts'
import { sendDoc, sendDocs } from '../util/respond.hono.ts'
import type { SettingDoc } from '../../shared/schema/setting.ts'
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
  return sendDoc<SettingDoc>(c, saved)
}

async function getProfiles(c: Context<Env>) {
  const data = await Setting.find({ user: { $eq: c.get('user').id } })
    .populate({ path: 'messageCount', match: { isview: 'false' } }) // unread only
    .populate({ path: 'totalCount', match: { isview: 'false' } })
  return sendDocs<SettingDoc>(c, data)
}

async function getProfile(c: ParamCtx<ProfileIdParam>) {
  const { id } = c.req.valid('param')
  const data = await Setting.findOne({ user: { $eq: c.get('user').id }, _id: { $eq: id } })
    .populate({ path: 'messageCount', match: { isview: 'false' } })
    .populate({ path: 'totalCount', match: { isview: 'false' } })
  if (!data) throw new HTTPException(404, { message: 'Profile not found!' })
  return sendDoc<SettingDoc>(c, data)
}

async function removeProfile(c: ParamCtx<ProfileIdParam>) {
  const { id } = c.req.valid('param')
  // Scope by user so one user can't delete another's profile by guessing its id (IDOR); a non-owned id 404s.
  const setting = await Setting.findOne({ _id: { $eq: id }, user: { $eq: c.get('user').id } })
  if (!setting) throw new HTTPException(404, { message: 'Profile not found!' })

  await Message.deleteMany({ setting: setting._id })

  // Best-effort provider teardown: each call is wrapped so a failed cleanup doesn't block the delete. `?? ''` covers
  // fields the type allows to be null \u2014 the provider rejects the empty value and the catch swallows it.
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
  return sendDoc<SettingDoc>(c, setting)
}

export const create = factory.createHandlers(auth, jsonBody(profileCreateBody), createProfile)
export const getAll = factory.createHandlers(auth, getProfiles)
export const getOne = factory.createHandlers(auth, pathParams(profileIdParam), getProfile)
export const deleteProfile = factory.createHandlers(auth, pathParams(profileIdParam), removeProfile)
