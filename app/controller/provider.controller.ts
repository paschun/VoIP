import { HTTPException } from 'hono/http-exception'
import type { Ok } from '../contracts/envelope.ts'
import {
  settingIdParam,
  type SettingIdParam,
  webhookFallbackBody,
  type WebhookFallbackRequest,
  numberLookupBody,
  type NumberLookupRequest,
} from '../contracts/provider.ts'
import { env } from '../core/env.ts'
import { factory } from '../core/factory.ts'
import type { JsonCtx, PathParamCtx, PathParamJsonCtx } from '../core/factory.ts'
import { combineURLs, requireConfigured } from '../helper/common.helper.ts'
import { ack } from '../helper/respond.helper.ts'
import * as telnyxHelper from '../helper/telnyx.helper.ts'
import * as twilioHelper from '../helper/twilio.helper.ts'
import { WEBHOOKS } from '../helper/webhook-paths.ts'
import { auth } from '../middleware/auth.ts'
import { jsonBody, pathParams } from '../middleware/validate.ts'
import Setting from '../model/setting.model.ts'

// Load the caller's own Setting by id or 404. User-scoped so a user can't read/alter another's provider config by
// guessing the id (IDOR). The Setting is only a credential source here; nothing in Mongo is modified -- every write
// below targets Twilio/Telnyx.
async function ownSetting(userId: string, settingId: string) {
  const setting = await Setting.findOne({ _id: { $eq: settingId }, user: { $eq: userId } })
  if (!setting) throw new HTTPException(404, { message: 'Setting not found' })
  return setting
}

async function getTwilioWebhookConfig(c: PathParamCtx<SettingIdParam>) {
  const { settingId } = c.req.valid('param')
  const setting = await ownSetting(c.get('user').id, settingId)
  const app = await twilioHelper.twimlGet({
    sid: requireConfigured(setting.twilio_sid, 'twilio'),
    token: requireConfigured(setting.twilio_token, 'twilio'),
    twimlsid: requireConfigured(setting.twiml_app, 'twilio'),
  })
  // pick only the fields the client uses
  const { voiceUrl, voiceFallbackUrl } = app
  return c.json({ data: { voiceUrl, voiceFallbackUrl } } satisfies Ok, 200)
}

async function patchTwilioWebhook(c: PathParamJsonCtx<SettingIdParam, WebhookFallbackRequest>) {
  const { settingId } = c.req.valid('param')
  const { fallbackUrl } = c.req.valid('json')
  const setting = await ownSetting(c.get('user').id, settingId)

  if (!env.DEV) {
    const sid = requireConfigured(setting.twilio_sid, 'twilio')
    const token = requireConfigured(setting.twilio_token, 'twilio')
    await twilioHelper.twimlFallbackUpdate({
      sid,
      token,
      twimlsid: requireConfigured(setting.twiml_app, 'twilio'),
      url: combineURLs(fallbackUrl, WEBHOOKS.call.twilioVoice.full),
    })
    await twilioHelper.numberFallbackUpdate({
      sid,
      token,
      numbersid: requireConfigured(setting.sid, 'twilio'),
      voice_url: combineURLs(fallbackUrl, WEBHOOKS.call.twilioIncoming.full),
      sms_url: combineURLs(fallbackUrl, WEBHOOKS.sms.receiveSms.full.twilio),
    })
  }

  return ack(c)
}

async function getTelnyxWebhookConfig(c: PathParamCtx<SettingIdParam>) {
  const { settingId } = c.req.valid('param')
  const setting = await ownSetting(c.get('user').id, settingId)
  const messageProfile = await telnyxHelper.messageProfileGet({
    apiKey: requireConfigured(setting.api_key, 'telnyx'),
    setting: requireConfigured(setting.setting, 'telnyx'),
  })
  // pick only the fields the client uses
  const result = {
    webhook_failover_url: messageProfile.data?.webhook_failover_url,
    webhook_url: messageProfile.data?.webhook_url,
  }
  return c.json({ data: result } satisfies Ok, 200)
}

async function patchTelnyxWebhook(c: PathParamJsonCtx<SettingIdParam, WebhookFallbackRequest>) {
  const { settingId } = c.req.valid('param')
  const { fallbackUrl } = c.req.valid('json')
  const setting = await ownSetting(c.get('user').id, settingId)

  if (!env.DEV) {
    const apiKey = requireConfigured(setting.api_key, 'telnyx')
    await telnyxHelper.messageProfileFallback({
      apiKey,
      setting: requireConfigured(setting.setting, 'telnyx'),
      url: combineURLs(fallbackUrl, WEBHOOKS.sms.receiveSms.full.telnyx),
    })
    await telnyxHelper.texmlAppFallback({
      apiKey,
      twimlid: requireConfigured(setting.telnyx_twiml, 'telnyx'),
      url: combineURLs(fallbackUrl, WEBHOOKS.call.telnyxVoice.full),
    })
    await telnyxHelper.sipAppFallback({
      apiKey,
      uuid: requireConfigured(setting.sip_id, 'telnyx'),
      url: combineURLs(fallbackUrl, WEBHOOKS.call.telnyxStatus.full),
    })
  }

  return ack(c)
}

// Both providers are normalized to this one shape so the client reads it without narrowing a union: every key exists in
// both branches (a Telnyx `connection_id`, or a Twilio `voiceApplicationSid`/`voiceUrl`). A populated field means a call
// webhook -- i.e. call routing -- already exists. `satisfies` on each branch forces them to stay identical.
interface NumberLookupResult {
  connection_id: string | null
  voiceApplicationSid: string | null
  voiceUrl: string | null
}

async function lookupNumber(c: JsonCtx<NumberLookupRequest>) {
  const body = c.req.valid('json')
  if (body.type === 'telnyx') {
    const lookup = await telnyxHelper.getNumberData({ number_sid: body.sid, apiKey: body.api_key })
    const data = {
      connection_id: lookup.data?.connection_id ?? null,
      voiceApplicationSid: null,
      voiceUrl: null,
    } satisfies NumberLookupResult
    return c.json({ data } satisfies Ok<NumberLookupResult>, 200)
  }
  const number = await twilioHelper.numberGet({ sid: body.twilio_sid, token: body.twilio_token, numbersid: body.sid })
  const data = {
    connection_id: null,
    voiceApplicationSid: number.voiceApplicationSid ?? null,
    voiceUrl: number.voiceUrl ?? null,
  } satisfies NumberLookupResult
  return c.json({ data } satisfies Ok<NumberLookupResult>, 200)
}

export const twilioWebhookGet = factory.createHandlers(auth, pathParams(settingIdParam), getTwilioWebhookConfig)
export const twilioWebhookPatch = factory.createHandlers(
  auth,
  pathParams(settingIdParam),
  jsonBody(webhookFallbackBody),
  patchTwilioWebhook,
)
export const telnyxWebhookGet = factory.createHandlers(auth, pathParams(settingIdParam), getTelnyxWebhookConfig)
export const telnyxWebhookPatch = factory.createHandlers(
  auth,
  pathParams(settingIdParam),
  jsonBody(webhookFallbackBody),
  patchTelnyxWebhook,
)
export const numberLookup = factory.createHandlers(auth, jsonBody(numberLookupBody), lookupNumber)
