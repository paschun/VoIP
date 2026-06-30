import Telnyx from 'telnyx'
import twilio from 'twilio'
import * as telnyxHelper from './telnyx.helper.ts'
import * as twilioHelper from './twilio.helper.ts'
import type Setting from '../model/setting.model.ts'

type SettingDocument = InstanceType<typeof Setting>

/**
 * Best-effort provider teardown for a profile: clears the number's webhooks and deletes the messaging profile + SIP +
 * TeXML + outbound-voice apps (Telnyx) or the API key + TwiML app (Twilio). Every remote call is wrapped so a failed
 * cleanup never blocks the caller -- whether it then deletes the profile or just nulls its stored credentials.
 *
 * Each provider's credentials authenticate every call, so a branch is skipped entirely when they're absent; `sid` (the
 * provider's phone-number id) gates only the calls that target the number.
 */
export async function teardownProvider(setting: SettingDocument): Promise<void> {
  if (setting.type === 'telnyx') {
    const apiKey = setting.api_key
    if (!apiKey) return
    const client = new Telnyx({ apiKey })
    if (setting.sid) {
      try { await client.phoneNumbers.update(setting.sid, { connection_id: '' }) } catch { /* ignore */ }
    }
    if (setting.sip_id) {
      try { await telnyxHelper.deleteSIPApp(apiKey, setting.sip_id) } catch { /* ignore */ }
      if (setting.telnyx_outbound) {
        try { await telnyxHelper.deleteOutboundVoice(apiKey, setting.telnyx_outbound) } catch { /* ignore */ }
      }
    }
    if (setting.telnyx_twiml) {
      try { await telnyxHelper.deleteTexmlApp(apiKey, setting.telnyx_twiml) } catch { /* ignore */ }
    }
    if (setting.sid) {
      try { await client.phoneNumbers.messaging.update(setting.sid, { messaging_profile_id: '' }) } catch { /* ignore */ }
    }
    if (setting.setting) {
      try { await client.messagingProfiles.delete(setting.setting) } catch { /* ignore */ }
    }
  } else {
    const { twilio_sid: twilioSid, twilio_token: twilioToken } = setting
    if (!twilioSid || !twilioToken) return
    if (setting.app_key) {
      try { await twilioHelper.removeAPIKey(twilioSid, twilioToken, setting.app_key) } catch { /* ignore */ }
    }
    if (setting.twiml_app) {
      try { await twilioHelper.deleteTwiml(twilioSid, twilioToken, setting.twiml_app) } catch { /* ignore */ }
    }
    if (setting.sid) {
      const client = twilio(twilioSid, twilioToken)
      try {
        await client.incomingPhoneNumbers(setting.sid).update({ smsUrl: '', voiceUrl: '', statusCallback: '' })
      } catch { /* ignore */ }
    }
  }
}
