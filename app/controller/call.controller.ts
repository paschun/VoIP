import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Types } from 'mongoose'
import twilio from 'twilio'
import type { Ok } from '../../shared/api-contracts.ts'
import {
  getTokenBody,
  type GetTokenRequest,
  twilioVoiceWebhook,
  type TwilioVoiceWebhook,
  twilioStatusWebhook,
  type TwilioStatusWebhook,
  twilioInboundWebhook,
  type TwilioInboundWebhook,
  texmlInboundWebhook,
  type TexmlInboundWebhook,
} from '../../shared/contracts/call.ts'
import { factory } from '../core/factory.ts'
import type { Env, FormCtx, JsonCtx } from '../core/factory.ts'
import { getIO } from '../core/socket.ts'
import { ack, emptyTwimlReply, ok, xmlResponse } from '../helper/respond.helper.ts'
import { parseTelnyxCallEvent, type TelnyxCallEvent } from '../helper/telnyx-events.helper.ts'
import { parseTexmlStatusCallback, type TexmlStatusEvent } from '../helper/texml-events.helper.ts'
import { auth } from '../middleware/auth.ts'
import { jsonBody, webhookForm } from '../middleware/validate.ts'
import Contact from '../model/contact.model.ts'
import { Call } from '../model/message.model.ts'
import Setting from '../model/setting.model.ts'

// The webhook handlers below are unauthenticated provider callbacks. They must always answer 2xx (a non-2xx makes the
// provider play an error to the caller / route to the failover URL / retry). The voice + inbound handlers reply with
// TwiML/TeXML dial instructions; the status/event handlers just acknowledge. Each builds its provider-facing reply
// before the best-effort DB work, so a logging failure can't break the live call.

/**
 * Persist a call-log entry, linking a known contact if one matches the other party. Each caller builds its provider
 * reply *before* invoking this, so if a Mongoose read/write throws (DB blip, validation), the caller's own try/catch
 * logs it and the provider still gets a valid reply -- no inner guard needed here.
 */
async function recordCall(opts: {
  sid: string
  user: Types.ObjectId
  setting: Types.ObjectId
  direction: 'send' | 'receive'
  number: string // the other party
  providerNumber: string // our provider number
}) {
  // findOne/create calls can throw (DB blip, a cast/validation error)
  const contact = await Contact.findOne({ user: { $eq: opts.user }, number: { $eq: opts.number } })
  await Call.create({
    sid: opts.sid,
    user: opts.user,
    type: opts.direction,
    number: opts.number,
    telnyx_number: opts.providerNumber,
    setting: opts.setting,
    isview: opts.direction === 'send',
    ...(contact ? { contact: contact._id } : {}),
  })
}

/** Notify the owner of `providerNumber` (our provider number) that a call row changed, so their open clients refresh. */
async function notifyCallOwner(providerNumber: string | null | undefined, otherNumber: string | null | undefined) {
  const setting = await Setting.findOne({ number: { $eq: providerNumber ?? '' } })
  if (setting)
    getIO()
      .to(setting.user?.toString() ?? '')
      .emit('user_message', { message: 'call', number: otherNumber })
}

/** Apply a Twilio-shaped status payload (Twilio status callback + Telnyx TeXML status callback) to the call log. */
async function applyStatus(body: TwilioStatusWebhook | TexmlStatusEvent) {
  const call = await Call.findOne({ sid: { $eq: body.CallSid } })
  if (!call) return
  if ('CallDuration' in body && body.CallDuration) call.duration = Number(body.CallDuration)
  if (body.CallStatus) call.status = body.CallStatus
  await call.save()
  await notifyCallOwner(call.telnyx_number, call.number)
}

/**
 * Apply a Telnyx native Call Control event. "Call Control" is Telnyx's webhook-driven model (distinct from TeXML's
 * Twilio-style markup): Telnyx POSTs JSON lifecycle events (`call.initiated`, `call.hangup`, ...) and we react -- here,
 * logging an outbound call when it starts and finalizing its duration/status on hangup.
 */
async function applyTelnyxCallEvent(event: TelnyxCallEvent['data']) {
  switch (event.event_type) {
    case 'call.initiated': {
      const { call_session_id, direction, from, to } = event.payload
      if (direction !== 'outgoing') break
      const setting = await Setting.findOne({ number: { $eq: from } })
      if (setting) {
        await recordCall({
          sid: call_session_id,
          user: setting.user,
          setting: setting._id,
          direction: 'send',
          number: to,
          providerNumber: from,
        })
      }
      break
    }
    case 'call.hangup': {
      const call = await Call.findOne({ sid: { $eq: event.payload.call_session_id } })
      if (call) {
        // call duration = occurred_at - start_time
        const seconds = (new Date(event.occurred_at).getTime() - new Date(event.payload.start_time).getTime()) / 1000
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
    const voiceGrant = new AccessToken.VoiceGrant({
      outgoingApplicationSid: setting.twiml_app ?? '',
      incomingAllow: true,
    })
    const token = new AccessToken(setting.twilio_sid ?? '', setting.app_key ?? '', setting.app_secret ?? '', {
      identity: c.get('user').id,
    })
    token.addGrant(voiceGrant)
    return c.json({ data: { type: setting.type, token: token.toJwt() } } satisfies Ok, 200)
  }

  // setting.type === 'telnyx'
  return c.json({ data: { type: setting.type, setting: setting.toObject({ flattenObjectIds: true }) } } satisfies Ok, 200)
}

/** Twilio outbound: the TwiML app's voice URL. Returns dial TwiML so Twilio bridges the call to the dialed number. */
async function dialOutbound(c: FormCtx<TwilioVoiceWebhook>) {
  const response = new twilio.twiml.VoiceResponse() // TwiML builder
  const body = c.req.valid('form')
  try {
    const setting = await Setting.findOne({ number: { $eq: body.twilio_number } })
    if (setting) {
      response.dial({ callerId: body.twilio_number }).number(body.number)
      await recordCall({
        sid: body.CallSid,
        user: setting.user,
        setting: setting._id,
        direction: 'send',
        number: body.number,
        providerNumber: body.twilio_number,
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
  const body = c.req.valid('form')
  try {
    const setting = await Setting.findOne({ number: { $eq: body.To } })
    if (setting) {
      // stateful API
      response
        .dial()
        .client()
        .identity(setting.user.toString())

      await recordCall({
        sid: body.CallSid,
        user: setting.user,
        setting: setting._id,
        direction: 'receive',
        number: body.From,
        providerNumber: body.To,
      })
    }
  } catch (e) {
    console.error(e)
  }
  return xmlResponse(c, response.toString())
}

/** Telnyx inbound (TeXML): bridge the call to the owner's SIP client. */
async function dialTelnyxSip(c: FormCtx<TexmlInboundWebhook>) {
  const body = c.req.valid('form')
  const setting = await Setting.findOne({ number: { $eq: body.To } }).catch((e) => console.error(e))
  if (!setting?.sip_username) return emptyTwimlReply(c)
  await recordCall({
    sid: body.CallSid,
    user: setting.user,
    setting: setting._id,
    direction: 'receive',
    number: body.From,
    providerNumber: body.To,
  }).catch((e) => console.error(e))
  return xmlResponse(
    c,
    `<?xml version="1.0" encoding="UTF-8"?><Response><Dial><Sip>sip:${setting.sip_username}@sip.telnyx.com</Sip></Dial></Response>`,
  )
}

/**
 * Telnyx call-status webhook, serving two payload styles on one URL: native Call Control events arrive as JSON, TeXML
 * status callbacks arrive as Twilio-shaped form posts. Branch on the content type (the signal that also dictates how to
 * parse) rather than probing for a missing field. A JSON payload we can't parse is logged, not silently dropped.
 */
async function recordTelnyxStatus(c: Context<Env>) {
  try {
    if ((c.req.header('content-type') ?? '').includes('application/json')) {
      // https://developers.telnyx.com/api-reference/callbacks/call-initiated
      // these JSON events are from SIP `credentialConnections.create`
      const event = parseTelnyxCallEvent(await c.req.json())
      if (event) await applyTelnyxCallEvent(event)
    } else {
      // TeXML status callbacks arrive as Twilio-shaped form posts
      // https://developers.telnyx.com/api-reference/callbacks/texml-call-answered
      // this is from `status_callback` in `texmlApplications.create`
      const event = parseTexmlStatusCallback(await c.req.parseBody())
      if (event) await applyStatus(event)
    }
  } catch (e) {
    console.error(e)
  }
  // Telnyx requires exactly 200 (a non-200 2xx is error 75299 and per the spec triggers failover redelivery)
  // https://developers.telnyx.com/development/api-fundamentals/api-errors
  return ok(c)
}

export const token = factory.createHandlers(auth, jsonBody(getTokenBody), issueToken)
export const makeCall = factory.createHandlers(webhookForm(twilioVoiceWebhook, emptyTwimlReply), dialOutbound)
export const status = factory.createHandlers(webhookForm(twilioStatusWebhook), recordCallStatus)
export const incoming = factory.createHandlers(webhookForm(twilioInboundWebhook, emptyTwimlReply), dialIncoming)
export const telnyx = factory.createHandlers(webhookForm(texmlInboundWebhook, emptyTwimlReply), dialTelnyxSip)
export const statusTelnyx = factory.createHandlers(recordTelnyxStatus)
