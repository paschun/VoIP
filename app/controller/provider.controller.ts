import { HTTPException } from 'hono/http-exception'
import Setting from '../model/setting.model.ts'
import * as telnyxHelper from '../helper/telnyx.helper.ts'
import * as twilioHelper from '../helper/twilio.helper.ts'
import { combineURLs } from '../helper/common.helper.ts'
import { WEBHOOK_PATHS } from '../helper/webhook-paths.ts'
import { factory } from '../factory.ts'
import type { JsonCtx, ParamCtx, ParamJsonCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody, pathParams } from '../validate.ts'
import { sendDoc } from '../util/respond.hono.ts'
import type { Ok } from '../../shared/api-contracts.ts'
import type { SettingDoc } from '../../shared/schema/setting.ts'
import {
  settingIdParam, type SettingIdParam,
  webhookFallbackBody, type WebhookFallbackRequest,
  numberLookupBody, type NumberLookupRequest,
} from '../../shared/contracts/provider.ts'

// Load the caller's own Setting by id or 404. User-scoped so a user can't read/alter another's provider config by
// guessing the id (IDOR). The Setting is only a credential source here; nothing in Mongo is modified -- every write
// below targets Twilio/Telnyx.
async function ownSetting(userId: string, settingId: string) {
  const setting = await Setting.findOne({ _id: { $eq: settingId }, user: { $eq: userId } })
  if (!setting) throw new HTTPException(404, { message: 'Setting not found' })
  return setting
}

async function getTwilioWebhookConfig(c: ParamCtx<SettingIdParam>) {
  const { settingId } = c.req.valid('param')
  const setting = await ownSetting(c.get('user').id, settingId)
  const app = await twilioHelper.twimlGet({
    sid: setting.twilio_sid ?? '', token: setting.twilio_token ?? '', twimlsid: setting.twiml_app ?? '',
  })
  return c.json({ data: app } satisfies Ok<unknown>)
}

async function patchTwilioWebhook(c: ParamJsonCtx<SettingIdParam, WebhookFallbackRequest>) {
  const { settingId } = c.req.valid('param')
  const { fallbackUrl } = c.req.valid('json')
  const setting = await ownSetting(c.get('user').id, settingId)

  // `?? ''` covers Setting fields the type allows to be null; a configured setting always has them set, and the
  // helpers swallow provider errors, so an empty value can't blow up the request.
  await twilioHelper.twimlFallbackUpdate({
    sid: setting.twilio_sid ?? '', token: setting.twilio_token ?? '', twimlsid: setting.twiml_app ?? '',
    url: combineURLs(fallbackUrl, WEBHOOK_PATHS.twilioVoice),
  })
  await twilioHelper.numberFallbackUpdate({
    sid: setting.twilio_sid ?? '', token: setting.twilio_token ?? '', numbersid: setting.sid ?? '',
    voice_url: combineURLs(fallbackUrl, WEBHOOK_PATHS.twilioIncoming),
    sms_url: combineURLs(fallbackUrl, WEBHOOK_PATHS.twilioReceiveSms),
  })
  return sendDoc<SettingDoc>(c, setting)
}

async function getTelnyxWebhookConfig(c: ParamCtx<SettingIdParam>) {
  const { settingId } = c.req.valid('param')
  const setting = await ownSetting(c.get('user').id, settingId)
  const messageProfile = await telnyxHelper.messageProfileGet({
    apiKey: setting.api_key ?? '', setting: setting.setting ?? '',
  })
  return c.json({ data: messageProfile } satisfies Ok<unknown>)
}

async function patchTelnyxWebhook(c: ParamJsonCtx<SettingIdParam, WebhookFallbackRequest>) {
  const { settingId } = c.req.valid('param')
  const { fallbackUrl } = c.req.valid('json')
  const setting = await ownSetting(c.get('user').id, settingId)

  await telnyxHelper.messageProfileFallback({
    apiKey: setting.api_key ?? '', setting: setting.setting ?? '',
    url: combineURLs(fallbackUrl, WEBHOOK_PATHS.telnyxReceiveSms),
  })
  await telnyxHelper.texmlAppFallback({
    apiKey: setting.api_key ?? '', twimlid: setting.telnyx_twiml ?? '',
    url: combineURLs(fallbackUrl, WEBHOOK_PATHS.telnyxVoice),
  })
  await telnyxHelper.sipAppFallback({
    apiKey: setting.api_key ?? '', uuid: setting.sip_id ?? '',
    url: combineURLs(fallbackUrl, WEBHOOK_PATHS.telnyxStatus),
  })
  return sendDoc<SettingDoc>(c, setting)
}

async function lookupNumber(c: JsonCtx<NumberLookupRequest>) {
  const body = c.req.valid('json')
  if (body.type === 'telnyx') {
    const numberData = await telnyxHelper.getNumberData({ number_sid: body.sid, apiKey: body.api_key })
    return c.json({ data: numberData } satisfies Ok<unknown>)
  }
  const numberData = await twilioHelper.numberGet({ sid: body.twilio_sid, token: body.twilio_token, numbersid: body.sid })
  return c.json({ data: numberData } satisfies Ok<unknown>)
}

export const twilioWebhookGet = factory.createHandlers(auth, pathParams(settingIdParam), getTwilioWebhookConfig)
export const twilioWebhookPatch = factory.createHandlers(auth, pathParams(settingIdParam), jsonBody(webhookFallbackBody), patchTwilioWebhook)
export const telnyxWebhookGet = factory.createHandlers(auth, pathParams(settingIdParam), getTelnyxWebhookConfig)
export const telnyxWebhookPatch = factory.createHandlers(auth, pathParams(settingIdParam), jsonBody(webhookFallbackBody), patchTelnyxWebhook)
export const numberLookup = factory.createHandlers(auth, jsonBody(numberLookupBody), lookupNumber)
