import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import Telnyx from 'telnyx'
import twilio from 'twilio'
import type { Ok } from '../../shared/api-contracts.ts'
import {
  profileCreateBody,
  type CreateProfileRequest,
  profileIdParam,
  type ProfileIdParam,
} from '../../shared/contracts/profile.ts'
import { createSettingBody, type CreateSettingRequest } from '../../shared/contracts/setting.ts'
import { env } from '../core/env.ts'
import { factory } from '../core/factory.ts'
import type { Env, JsonCtx, ParamCtx } from '../core/factory.ts'
import { combineURLs } from '../helper/common.helper.ts'
import { teardownProvider } from '../helper/teardown.helper.ts'
import * as telnyxHelper from '../helper/telnyx.helper.ts'
import * as twilioHelper from '../helper/twilio.helper.ts'
import { WEBHOOKS } from '../helper/webhook-paths.ts'
import { auth } from '../middleware/auth.ts'
import { jsonBody, pathParams } from '../middleware/validate.ts'
import { Message } from '../model/message.model.ts'
import Setting from '../model/setting.model.ts'
import User from '../model/user.model.ts'

async function createProfile(c: JsonCtx<CreateProfileRequest>) {
  const { profile } = c.req.valid('json')
  const user = c.get('user').id
  const exists = await Setting.findOne({ user: { $eq: user }, profile: { $eq: profile } })
  if (exists) throw new HTTPException(409, { message: 'Profile already exists!' })
  const saved = await Setting.create({ user, profile })
  const data = saved.toObject({ flattenObjectIds: true })
  return c.json({ data } satisfies Ok, 201)
}

export const profileWithUnread = (userId: string, profileId: string, onFail?: () => NativeError) =>
  Setting.findOne({ user: { $eq: userId }, _id: { $eq: profileId } }) // type: Document
    // mongoose types have trouble inferring type when populating virtual, so add it as generic param in populate
    .populate<{ messageCount: number }>({ path: 'messageCount', match: { isview: false } }) // unread only
    .populate<{ totalCount: number }>({ path: 'totalCount', match: { isview: false } })
    // https://github.com/Automattic/mongoose/blob/9.7.1/lib/query.js#L4669
    .orFail(onFail)

export const profilesWithUnread = (userId: string) =>
  Setting.find({ user: { $eq: userId } }) // type: Document[]
    .populate<{ messageCount: number }>({ path: 'messageCount', match: { isview: false } }) // type: PopulateDocumentResult<Document>
    .populate<{ totalCount: number }>({ path: 'totalCount', match: { isview: false } })

async function getProfile(c: ParamCtx<ProfileIdParam>) {
  const { id } = c.req.valid('param')
  const profile = await profileWithUnread(
    c.get('user').id,
    id,
    () => new HTTPException(404, { message: 'Profile not found!' }),
  )
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
  const setting = await Setting.findOne({ _id: { $eq: id }, user: { $eq: c.get('user').id } }).orFail(
    () => new HTTPException(404, { message: 'Profile not found!' }),
  )

  await Message.deleteMany({ setting: setting._id })
  await teardownProvider(setting)
  await Setting.deleteOne({ _id: { $eq: id } })
  const data = setting.toObject({ flattenObjectIds: true })
  return c.json({ data } satisfies Ok, 200)
}

/** Disconnect a profile from its provider (best-effort teardown) and null out its stored credentials. */
async function resetProviderConfig(c: ParamCtx<ProfileIdParam>) {
  const userId = c.get('user').id
  const setting = await Setting.findOne({ user: { $eq: userId }, _id: { $eq: c.req.valid('param').id } })
  if (!setting) throw new HTTPException(404, { message: 'Setting not found!' })

  await teardownProvider(setting)

  setting.api_key = null
  setting.number = null
  setting.setting = null
  setting.sid = null
  setting.twilio_sid = null
  setting.twilio_token = null
  setting.app_key = null
  setting.app_secret = null
  setting.twiml_app = null
  setting.sip_id = null
  setting.sip_username = null
  setting.sip_password = null
  setting.telnyx_twiml = null
  setting.telnyx_outbound = null
  await setting.save()
  const data = setting.toObject({ flattenObjectIds: true })
  return c.json({ data } satisfies Ok, 200)
}

/** Create or update a profile's provider config; dispatches on the provider type. */
async function saveProviderConfig(c: JsonCtx<CreateSettingRequest>) {
  const userId = c.get('user').id
  const body = c.req.valid('json')
  if (!(await User.findOne({ _id: { $eq: userId } }))) throw new HTTPException(404, { message: 'User not found!' })
  return body.type === 'telnyx' ? saveTelnyxConfig(c, userId, body) : saveTwilioConfig(c, userId, body)
}

/** Rename an existing profile when only `profile` (no provider credentials) is supplied. */
async function renameProfile(c: JsonCtx<CreateSettingRequest>, userId: string, body: CreateSettingRequest) {
  const setting = await Setting.findOne({ user: { $eq: userId }, _id: { $eq: body.setting } })
  if (!setting) throw new HTTPException(404, { message: 'setting not found!' })
  setting.profile = body.profile
  await setting.save()
  const data = setting.toObject({ flattenObjectIds: true })
  return c.json({ data } satisfies Ok, 200)
}

async function saveTelnyxConfig(c: JsonCtx<CreateSettingRequest>, userId: string, body: CreateSettingRequest) {
  const { api_key, number, sid } = body
  if (!api_key || !number) return renameProfile(c, userId, body)

  const dup = await Setting.findOne({ _id: { $not: { $eq: body.setting } }, number: { $eq: number } })
  if (dup) throw new HTTPException(409, { message: 'Number already assigned to another profile!' })

  let setting = await Setting.findOne({ user: { $eq: userId }, _id: { $eq: body.setting } })
  let provisionMessagingProfile = false
  if (setting) {
    setting.api_key = api_key
    setting.number = number
    setting.sid = sid
    setting.profile = body.profile
    setting.type = 'telnyx'
    if (body.override) {
      if (setting.telnyx_twiml) {
        await telnyxHelper.updateTexmlApp(api_key, setting.telnyx_twiml)
      } else {
        const texml = await telnyxHelper.createTexmlApp(api_key)
        setting.telnyx_twiml = texml.data?.id ?? null
      }
      if (!setting.telnyx_outbound) {
        const outbound = await telnyxHelper.createOutboundVoice(api_key)
        setting.telnyx_outbound = outbound.data?.id ?? null
      }
      if (setting.sip_id) {
        await telnyxHelper.updateSIPApp(api_key, setting.sip_id, setting.telnyx_outbound ?? '')
      } else {
        const sip = await telnyxHelper.createSIPApp(api_key, userId, setting.telnyx_outbound ?? '')
        setting.sip_id = sip.data?.id ?? null
        setting.sip_username = sip.data?.user_name ?? null
        setting.sip_password = sip.data?.password ?? null
      }
    }
    await setting.save()
    if (!setting.setting) provisionMessagingProfile = true
  } else {
    setting = await Setting.create({ api_key, sid, number, user: userId, profile: body.profile, type: 'telnyx' })
    provisionMessagingProfile = true
  }

  const client = new Telnyx({ apiKey: api_key })
  let messagingProfileId: string
  if (provisionMessagingProfile) {
    const created = await client.messagingProfiles.create({
      name: 'VoIP sms Web Application',
      enabled: true,
      webhook_url: combineURLs(env.BASE_URL, WEBHOOKS.sms.receiveSms.full.telnyx),
      whitelisted_destinations: ['*'],
    })
    messagingProfileId = created.data?.id ?? ''
  } else {
    await client.messagingProfiles.update(setting.setting ?? '', {
      webhook_url: combineURLs(env.BASE_URL, WEBHOOKS.sms.receiveSms.full.telnyx),
    })
    messagingProfileId = setting.setting ?? ''
  }
  setting.setting = messagingProfileId
  await setting.save()
  await client.phoneNumbers.messaging.update(sid, { messaging_profile_id: messagingProfileId })
  if (body.override) {
    await client.phoneNumbers.update(sid, { connection_id: setting.telnyx_twiml ?? '' })
  }
  const data = setting.toObject({ flattenObjectIds: true })
  return c.json({ data } satisfies Ok, 200)
}

async function saveTwilioConfig(c: JsonCtx<CreateSettingRequest>, userId: string, body: CreateSettingRequest) {
  const { twilio_sid, twilio_token, twilio_number, sid } = body
  if (!twilio_sid || !twilio_token || !twilio_number || !sid) return renameProfile(c, userId, body)

  const dup = await Setting.findOne({ _id: { $not: { $eq: body.setting } }, number: { $eq: twilio_number } })
  if (dup) throw new HTTPException(409, { message: 'Number already assigned to another profile!' })

  let setting = await Setting.findOne({ user: { $eq: userId }, _id: { $eq: body.setting } })
  if (setting) {
    setting.api_key = null
    setting.number = twilio_number
    setting.sid = sid
    setting.twilio_sid = twilio_sid
    setting.twilio_token = twilio_token
    setting.profile = body.profile
    setting.type = 'twilio'
    if (body.override) {
      if (setting.twiml_app) {
        await twilioHelper.updateTwiml(twilio_sid, twilio_token, setting.twiml_app)
      } else {
        const twimlApp = await twilioHelper.createTwiml(twilio_sid, twilio_token)
        setting.twiml_app = twimlApp
      }
      if (!setting.app_key) {
        const appData = await twilioHelper.createAPIKey(twilio_sid, twilio_token)
        setting.app_key = appData.sid
        setting.app_secret = appData.secret
      }
    }
    await setting.save()
  } else {
    setting = await Setting.create({
      number: twilio_number,
      sid,
      twilio_sid,
      twilio_token,
      user: userId,
      type: 'twilio',
      profile: body.profile,
    })
  }

  const client = twilio(twilio_sid, twilio_token)
  const update = body.override
    ? {
        smsUrl: combineURLs(env.BASE_URL, WEBHOOKS.sms.receiveSms.full.twilio),
        voiceUrl: combineURLs(env.BASE_URL, WEBHOOKS.call.twilioIncoming.full),
        statusCallback: combineURLs(env.BASE_URL, WEBHOOKS.call.twilioStatus.full),
        voiceApplicationSid: '',
      }
    : { smsUrl: combineURLs(env.BASE_URL, WEBHOOKS.sms.receiveSms.full.twilio) }
  await client.incomingPhoneNumbers(sid).update(update)
  const data = setting.toObject({ flattenObjectIds: true })
  return c.json({ data } satisfies Ok, 200)
}

export const create = factory.createHandlers(auth, jsonBody(profileCreateBody), createProfile)
export const saveProvider = factory.createHandlers(auth, jsonBody(createSettingBody), saveProviderConfig)
export const getAll = factory.createHandlers(auth, getProfiles)
export const getOne = factory.createHandlers(auth, pathParams(profileIdParam), getProfile)
export const disconnectProvider = factory.createHandlers(auth, pathParams(profileIdParam), resetProviderConfig)
export const deleteProfile = factory.createHandlers(auth, pathParams(profileIdParam), removeProfile)
