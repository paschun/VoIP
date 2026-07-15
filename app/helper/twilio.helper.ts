import twilio from 'twilio'
import { env } from '../core/env.ts'
import { ProviderError } from '../core/error.ts'
import { combineURLs } from './common.helper.ts'
import { WEBHOOKS } from './webhook-paths.ts'

/**
 * Twilio provisioning/teardown helpers. Same error policy as telnyx.helper, split by intent, with the functions below
 * grouped into the two matching sections:
 *
 * - SETUP / GET / FALLBACK helpers (`createTwiml`/`updateTwiml`/`createAPIKey`, `twimlGet`/`numberGet`,
 *   `*FallbackUpdate`) THROW `ProviderError` so a failure while serving a live request surfaces as a 502 (via onError)
 *   rather than being silently dropped.
 * - TEARDOWN helpers (`deleteTwiml`/`removeAPIKey`/`unlinkNumber`) SWALLOW the error, log it, and return `false`: they
 *   run during best-effort account/profile cleanup, where throwing would abort the rest of the teardown and block a
 *   legitimate delete.
 */

// === Setup / GET / fallback helpers: THROW ProviderError on failure (onError renders 502). See file header. ===

const createTwiml = async (sid: string, token: string) => {
  try {
    const client = twilio(sid, token)
    const twiml = await client.applications.create({
      voiceMethod: 'POST',
      voiceUrl: combineURLs(env.BASE_URL, WEBHOOKS.call.twilioVoice.full),
      statusCallback: combineURLs(env.BASE_URL, WEBHOOKS.call.twilioStatus.full),
      statusCallbackMethod: 'POST',
      friendlyName: 'VoIPSuite',
    })
    return twiml.sid
  } catch (e) {
    throw new ProviderError('twilio', 'createTwiml', { cause: e })
  }
}

const updateTwiml = async (sid: string, token: string, twimlsid: string) => {
  try {
    const client = twilio(sid, token)
    const twiml = await client.applications(twimlsid).update({
      voiceMethod: 'POST',
      voiceUrl: combineURLs(env.BASE_URL, WEBHOOKS.call.twilioVoice.full),
      statusCallback: combineURLs(env.BASE_URL, WEBHOOKS.call.twilioStatus.full),
      statusCallbackMethod: 'POST',
    })
    return twiml.sid
  } catch (e) {
    throw new ProviderError('twilio', 'updateTwiml', { cause: e })
  }
}

const createAPIKey = async (sid: string, token: string) => {
  try {
    const client = twilio(sid, token)
    const apiKey = await client.newKeys.create({ friendlyName: 'Operationprivacy call API Key' })
    return apiKey
  } catch (e) {
    throw new ProviderError('twilio', 'createAPIKey', { cause: e })
  }
}

const twimlFallbackUpdate = async (params: { sid: string; token: string; twimlsid: string; url: string }) => {
  try {
    const client = twilio(params.sid, params.token)
    await client.applications(params.twimlsid).update({
      voiceFallbackUrl: params.url,
      voiceFallbackMethod: 'POST',
    })
    return true
  } catch (e) {
    throw new ProviderError('twilio', 'twimlFallbackUpdate', { cause: e })
  }
}

const numberFallbackUpdate = async (params: {
  sid: string
  token: string
  numbersid: string
  voice_url: string
  sms_url: string
}) => {
  try {
    const client = twilio(params.sid, params.token)
    await client.incomingPhoneNumbers(params.numbersid).update({
      voiceFallbackUrl: params.voice_url,
      voiceFallbackMethod: 'POST',
      smsFallbackUrl: params.sms_url,
      smsFallbackMethod: 'POST',
    })
    return true
  } catch (e) {
    throw new ProviderError('twilio', 'numberFallbackUpdate', { cause: e })
  }
}

const twimlGet = async (params: { sid: string; token: string; twimlsid: string }) => {
  try {
    const client = twilio(params.sid, params.token)
    const app = await client.applications(params.twimlsid).fetch()
    return app
  } catch (e) {
    throw new ProviderError('twilio', 'twimlGet', { cause: e })
  }
}

const numberGet = async (params: { sid: string; token: string; numbersid: string }) => {
  try {
    const client = twilio(params.sid, params.token)
    const number = await client.incomingPhoneNumbers(params.numbersid).fetch()
    return number
  } catch (e) {
    throw new ProviderError('twilio', 'numberGet', { cause: e })
  }
}

// === Teardown helpers: SWALLOW + log, return false. Best-effort cleanup during deletion. See file header. ===

const deleteTwiml = async (sid: string, token: string, twimlsid: string) => {
  try {
    const client = twilio(sid, token)
    await client.applications(twimlsid).remove()
    return true
  } catch (e) {
    console.error('deleteTwiml teardown failed', e)
    return false
  }
}

const removeAPIKey = async (sid: string, token: string, api_key: string) => {
  try {
    const client = twilio(sid, token)
    await client.keys(api_key).remove()
    return true
  } catch (e) {
    console.error('removeAPIKey teardown failed', e)
    return false
  }
}

const unlinkNumber = async (sid: string, token: string, numbersid: string) => {
  try {
    const client = twilio(sid, token)
    await client.incomingPhoneNumbers(numbersid).update({
      smsUrl: '',
      voiceUrl: '',
      statusCallback: '',
    })
    return true
  } catch (e) {
    console.error('unlinkNumber teardown failed', e)
    return false
  }
}

export {
  createTwiml,
  updateTwiml,
  createAPIKey,
  twimlFallbackUpdate,
  numberFallbackUpdate,
  twimlGet,
  numberGet,
  deleteTwiml,
  removeAPIKey,
  unlinkNumber,
}
