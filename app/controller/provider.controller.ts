import { HTTPException } from 'hono/http-exception'
import Setting from '../model/setting.model.ts'
import * as telnyxHelper from '../helper/telnyx.helper.ts'
import * as twilioHelper from '../helper/twilio.helper.ts'
import { combineURLs } from '../helper/common.helper.ts'
import { WEBHOOKS } from '../helper/webhook-paths.ts'
import { factory } from '../factory.ts'
import type { JsonCtx, ParamCtx, ParamJsonCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody, pathParams } from '../validate.ts'
import type { Ok } from '../../shared/api-contracts.ts'
import {
  settingIdParam, type SettingIdParam,
  webhookFallbackBody, type WebhookFallbackRequest,
  numberLookupBody, type NumberLookupRequest,
} from '../../shared/contracts/provider.ts'
import { ack } from '../util/respond.hono.ts'

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
  // pick only the fields the client uses
  const { voiceUrl, voiceFallbackUrl } = app
  return c.json({ data: { voiceUrl, voiceFallbackUrl } } satisfies Ok, 200)
}

async function patchTwilioWebhook(c: ParamJsonCtx<SettingIdParam, WebhookFallbackRequest>) {
  const { settingId } = c.req.valid('param')
  const { fallbackUrl } = c.req.valid('json')
  const setting = await ownSetting(c.get('user').id, settingId)

  // `?? ''` covers Setting fields the type allows to be null; a configured setting always has them set. The fallback
  // helpers throw ProviderError on a provider failure, which onError renders as a 502.
  await twilioHelper.twimlFallbackUpdate({
    sid: setting.twilio_sid ?? '', token: setting.twilio_token ?? '', twimlsid: setting.twiml_app ?? '',
    url: combineURLs(fallbackUrl, WEBHOOKS.call.twilioVoice.full),
  })
  await twilioHelper.numberFallbackUpdate({
    sid: setting.twilio_sid ?? '', token: setting.twilio_token ?? '', numbersid: setting.sid ?? '',
    voice_url: combineURLs(fallbackUrl, WEBHOOKS.call.twilioIncoming.full),
    sms_url: combineURLs(fallbackUrl, WEBHOOKS.sms.receiveSms.full.twilio),
  })

  return ack(c)
}

async function getTelnyxWebhookConfig(c: ParamCtx<SettingIdParam>) {
  const { settingId } = c.req.valid('param')
  const setting = await ownSetting(c.get('user').id, settingId)
  const messageProfile = await telnyxHelper.messageProfileGet({
    apiKey: setting.api_key ?? '', setting: setting.setting ?? '',
  })
  // pick only the fields the client uses
  const result = {
    webhook_failover_url: messageProfile.data?.webhook_failover_url,
    webhook_url: messageProfile.data?.webhook_url,
  }
  return c.json({ data: result } satisfies Ok, 200)
}

async function patchTelnyxWebhook(c: ParamJsonCtx<SettingIdParam, WebhookFallbackRequest>) {
  const { settingId } = c.req.valid('param')
  const { fallbackUrl } = c.req.valid('json')
  const setting = await ownSetting(c.get('user').id, settingId)

  await telnyxHelper.messageProfileFallback({
    apiKey: setting.api_key ?? '', setting: setting.setting ?? '',
    url: combineURLs(fallbackUrl, WEBHOOKS.sms.receiveSms.full.telnyx),
  })
  await telnyxHelper.texmlAppFallback({
    apiKey: setting.api_key ?? '', twimlid: setting.telnyx_twiml ?? '',
    url: combineURLs(fallbackUrl, WEBHOOKS.call.telnyxVoice.full),
  })
  await telnyxHelper.sipAppFallback({
    apiKey: setting.api_key ?? '', uuid: setting.sip_id ?? '',
    url: combineURLs(fallbackUrl, WEBHOOKS.call.telnyxStatus.full),
  })

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
    const data = { connection_id: lookup.data?.connection_id ?? null, voiceApplicationSid: null, voiceUrl: null } satisfies NumberLookupResult
    return c.json({ data } satisfies Ok<NumberLookupResult>, 200)
  }
  const number = await twilioHelper.numberGet({ sid: body.twilio_sid, token: body.twilio_token, numbersid: body.sid })
  const data = { connection_id: null, voiceApplicationSid: number.voiceApplicationSid ?? null, voiceUrl: number.voiceUrl ?? null } satisfies NumberLookupResult
  return c.json({ data } satisfies Ok<NumberLookupResult>, 200)
}

export const twilioWebhookGet = factory.createHandlers(auth, pathParams(settingIdParam), getTwilioWebhookConfig)
export const twilioWebhookPatch = factory.createHandlers(auth, pathParams(settingIdParam), jsonBody(webhookFallbackBody), patchTwilioWebhook)
export const telnyxWebhookGet = factory.createHandlers(auth, pathParams(settingIdParam), getTelnyxWebhookConfig)
export const telnyxWebhookPatch = factory.createHandlers(auth, pathParams(settingIdParam), jsonBody(webhookFallbackBody), patchTelnyxWebhook)
export const numberLookup = factory.createHandlers(auth, jsonBody(numberLookupBody), lookupNumber)
