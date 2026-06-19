import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Types } from 'mongoose'
import twilio from 'twilio'
import Setting from '../model/setting.model.ts'
import Call from '../model/message.model.ts'
import Contact from '../model/contact.model.ts'
import { getIO } from '../socket.ts'
import { normalizeNumber } from '../helper/common.helper.ts'
import { factory } from '../factory.ts'
import type { Env, JsonCtx, FormCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody, formBody } from '../validate.ts'
import { ack } from '../util/respond.hono.ts'
import type { Ok } from '../../shared/api-contracts.ts'
import {
  getTokenBody, type GetTokenRequest,
  twilioVoiceWebhook, type TwilioVoiceWebhook,
  twilioStatusWebhook, type TwilioStatusWebhook,
  twilioInboundWebhook, type TwilioInboundWebhook,
  telnyxCallEvent, type TelnyxCallEvent,
} from '../../shared/contracts/call.ts'

// The webhook handlers below are unauthenticated provider callbacks. They must always answer 2xx (a non-2xx makes the
// provider play an error to the caller / route to the failover URL / retry). The voice + inbound handlers reply with
// TwiML/TeXML dial instructions; the status/event handlers just acknowledge. Each builds its provider-facing reply
// before the best-effort DB work, so a logging failure can't break the live call.

const xmlResponse = (c: Context<Env>, xml: string) => c.body(xml, 200, { 'Content-Type': 'text/xml' })

const emptyTwiml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n</Response>'

/**
 * Persist a call-log entry, linking a known contact if one matches the other party. Each caller builds its provider
 * reply *before* invoking this, so if a Mongoose read/write throws (DB blip, validation), the caller's own try/catch
 * logs it and the provider still gets a valid reply -- no inner guard needed here.
 */
async function recordCall(opts: {
  sid: string
  user: Types.ObjectId | null | undefined
  setting: Types.ObjectId
  direction: 'send' | 'receive'
  number: string // the other party
  providerNumber: string // our provider number
}) {
  const user = opts.user
  if (!user) return
  // findOne/create calls can throw (DB blip, a cast/validation error)
  const contact = await Contact.findOne({ user: { $eq: user }, number: { $eq: opts.number } })
  await Call.create({
    sid: opts.sid,
    user,
    datatype: 'call',
    type: opts.direction,
    number: opts.number,
    telnyx_number: opts.providerNumber,
    setting: opts.setting,
    isview: opts.direction === 'send' ? 'true' : 'false',
    ...(contact ? { contact: contact._id } : {}),
  })
}

/** Notify the owner of `providerNumber` (our provider number) that a call row changed, so their open clients refresh. */
async function notifyCallOwner(providerNumber: string | null | undefined, otherNumber: string | null | undefined) {
  const setting = await Setting.findOne({ number: { $eq: providerNumber ?? '' } })
  if (setting) getIO().to(setting.user?.toString() ?? '').emit('user_message', { message: 'call', number: otherNumber })
}

/** Apply a Twilio-shaped status payload (Twilio status callback + Telnyx TeXML status callback) to the call log. */
async function applyStatus(body: TwilioStatusWebhook) {
  const call = await Call.findOne({ sid: { $eq: body.CallSid ?? '' } })
  if (!call) return
  if (body.CallDuration) call.duration = Number(body.CallDuration)
  if (body.CallStatus) call.status = body.CallStatus
  await call.save()
  await notifyCallOwner(call.telnyx_number, call.number)
}

/**
 * Apply a Telnyx native Call Control event. "Call Control" is Telnyx's webhook-driven model (distinct from TeXML's
 * Twilio-style markup): Telnyx POSTs JSON lifecycle events (`call.initiated`, `call.hangup`, ...) and we react -- here,
 * logging an outbound call when it starts and finalizing its duration/status on hangup.
 */
async function applyTelnyxEvent(event: TelnyxCallEvent['data']) {
  const { payload } = event
  switch (event.event_type) {
    case 'call.initiated':
      if (payload.direction === 'outgoing') {
        const setting = await Setting.findOne({ number: { $eq: payload.from ?? '' } })
        if (setting) {
          await recordCall({
            sid: payload.call_session_id ?? '', user: setting.user, setting: setting._id, direction: 'send',
            number: payload.to ?? '', providerNumber: payload.from ?? '',
          })
        }
      }
      break
    case 'call.hangup': {
      const call = await Call.findOne({ sid: { $eq: payload.call_session_id ?? '' } })
      if (call) {
        const seconds = (new Date(payload.end_time ?? 0).getTime() - new Date(payload.start_time ?? 0).getTime()) / 1000
        call.duration = Math.ceil(seconds)
        call.status = 'completed'
        await call.save()
        await notifyCallOwner(call.telnyx_number, call.number)
      }
      break
    }
  }
}

/** Mint a provider call token for the authenticated owner of `setting_id` (Twilio JWT, or the Telnyx SIP setting). */
async function issueToken(c: JsonCtx<GetTokenRequest>) {
  const { setting_id } = c.req.valid('json')
  // User-scoped: a token grants access to this Setting's provider account, so only its owner may mint one (IDOR).
  const setting = await Setting.findOne({ _id: { $eq: setting_id }, user: { $eq: c.get('user').id } })
  if (!setting) throw new HTTPException(404, { message: 'Setting not found' })

  if (setting.type === 'twilio') {
    const AccessToken = twilio.jwt.AccessToken
    const voiceGrant = new AccessToken.VoiceGrant({ outgoingApplicationSid: setting.twiml_app ?? '', incomingAllow: true })
    const token = new AccessToken(setting.twilio_sid ?? '', setting.app_key ?? '', setting.app_secret ?? '', {
      identity: c.get('user').id,
    })
    token.addGrant(voiceGrant)
    return c.json({ data: { type: setting.type, token: token.toJwt() } } satisfies Ok)
  }

  return c.json({ data: { type: setting.type ?? 'telnyx', setting: setting.toObject({ flattenObjectIds: true }) } } satisfies Ok)
}

/** Twilio outbound: the TwiML app's voice URL. Returns dial TwiML so Twilio bridges the call to the dialed number. */
async function dialOutbound(c: FormCtx<TwilioVoiceWebhook>) {
  const response = new twilio.twiml.VoiceResponse() // TwiML builder
  try {
    const body = c.req.valid('form')
    const setting = await Setting.findOne({ number: { $eq: body.twilio_number ?? '' } })
    if (setting) {
      const phoneNumber = normalizeNumber(body.number ?? '')
      response.dial({ callerId: body.twilio_number ?? '' }).number(phoneNumber)
      await recordCall({
        sid: body.CallSid ?? '', user: setting.user, setting: setting._id, direction: 'send',
        number: phoneNumber, providerNumber: body.twilio_number ?? '',
      })
    }
  } catch (e) {
    console.error(e)
  }
  return xmlResponse(c, response.toString())
}

/** Twilio status callback: best-effort DB update, then a bare 2xx (Twilio ignores the body of a status callback). */
async function recordCallStatus(c: FormCtx<TwilioStatusWebhook>) {
  try {
    await applyStatus(c.req.valid('form'))
  } catch (e) {
    console.error(e)
  }
  return ack(c)
}

/** Twilio inbound: bridge the call to the owner's browser client. */
async function dialIncoming(c: FormCtx<TwilioInboundWebhook>) {
  const response = new twilio.twiml.VoiceResponse() // TwiML builder
  try {
    const body = c.req.valid('form')
    const setting = await Setting.findOne({ number: { $eq: body.To ?? '' } })
    if (setting) {
      response.dial().client().identity(setting.user?.toString() ?? '')
      await recordCall({
        sid: body.CallSid ?? '', user: setting.user, setting: setting._id, direction: 'receive',
        number: body.From ?? '', providerNumber: body.To ?? '',
      })
    }
  } catch (e) {
    console.error(e)
  }
  return xmlResponse(c, response.toString())
}

/** Telnyx inbound (TeXML): bridge the call to the owner's SIP client. */
async function dialTelnyxSip(c: FormCtx<TwilioInboundWebhook>) {
  let callXml = emptyTwiml
  try {
    const body = c.req.valid('form')
    const setting = await Setting.findOne({ number: { $eq: body.To ?? '' } })
    if (setting && setting.sip_username) {
      callXml = `<?xml version="1.0" encoding="UTF-8"?>
                <Response>
                <Dial>
                    <Sip>sip:${setting.sip_username}@sip.telnyx.com</Sip>
                </Dial>
                </Response>`
      await recordCall({
        sid: body.CallSid ?? '', user: setting.user, setting: setting._id, direction: 'receive',
        number: body.From ?? '', providerNumber: body.To ?? '',
      })
    }
  } catch (e) {
    console.error(e)
  }
  return xmlResponse(c, callXml)
}

/**
 * Telnyx call-status webhook, serving two payload styles on one URL: native Call Control events arrive as JSON, TeXML
 * status callbacks arrive as Twilio-shaped form posts. Branch on the content type (the signal that also dictates how to
 * parse) rather than probing for a missing field. A JSON payload we can't parse is logged, not silently dropped.
 */
async function recordTelnyxStatus(c: Context<Env>) {
  try {
    if ((c.req.header('content-type') ?? '').includes('application/json')) {
      const parsed = telnyxCallEvent.safeParse(await c.req.json())
      if (parsed.success) await applyTelnyxEvent(parsed.data.data)
      else console.error('Unhandled Telnyx webhook payload', parsed.error)
    } else {
      const parsed = twilioStatusWebhook.safeParse(await c.req.parseBody())
      if (parsed.success) await applyStatus(parsed.data)
      else console.error('Unhandled Telnyx TeXML status payload', parsed.error)
    }
  } catch (e) {
    console.error(e)
  }
  return ack(c)
}

export const token = factory.createHandlers(auth, jsonBody(getTokenBody), issueToken)
export const makeCall = factory.createHandlers(formBody(twilioVoiceWebhook), dialOutbound)
export const status = factory.createHandlers(formBody(twilioStatusWebhook), recordCallStatus)
export const incoming = factory.createHandlers(formBody(twilioInboundWebhook), dialIncoming)
export const telnyx = factory.createHandlers(formBody(twilioInboundWebhook), dialTelnyxSip)
export const statusTelnyx = factory.createHandlers(recordTelnyxStatus)
