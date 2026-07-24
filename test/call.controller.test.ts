import { randomUUID } from 'node:crypto'
import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach, vi, assert, type MockInstance } from 'vitest'
import mongoose, { type Types } from 'mongoose'
import { connectMemoryDb, disconnectMemoryDb, clearDb } from './helpers/mongo.ts'

// End-to-end tests of the provider webhooks: real validation (AJV against the Telnyx OpenAPI spec for JSON, zod
// gates for form posts), real controllers + models, only the SSE push mocked. Covers the Telnyx call-status URL (both
// payload styles -- native Call Control JSON events and Twilio-shaped TeXML form callbacks) and the Twilio inbound-SMS
// and SMS-status form webhooks. A webhook must never answer non-2xx: every invalid-payload case still asserts the
// route's success shape.

// intercept the SSE push without changing the impl
const sendToUser = vi.hoisted(() => vi.fn<typeof import('../app/core/sse.ts').sendToUser>())
vi.mock(import('../app/core/sse.ts'), () => ({ sendToUser }))

const { callRoutes } = await import('../app/routes/call.route.ts')
const { settingRoutes } = await import('../app/routes/setting.route.ts')
const { Call, TextMessage } = await import('../app/model/message.model.ts')
const Setting = (await import('../app/model/setting.model.ts')).default
const Contact = (await import('../app/model/contact.model.ts')).default

const FROM = '+15551230000' // our provider number (setting.number)
const TO = '+15551239999' // the other party

/** v2-envelope `call.initiated` with all spec-required fields; `payload` spreads last so tests can override. */
const initiatedEvent = (payload: Record<string, unknown> = {}) => ({
  data: {
    record_type: 'event',
    id: randomUUID(),
    event_type: 'call.initiated',
    occurred_at: '2026-07-10T00:00:00.000Z',
    payload: {
      call_control_id: 'v2:abc',
      call_session_id: randomUUID(),
      call_leg_id: randomUUID(),
      direction: 'outgoing',
      from: FROM,
      to: TO,
      state: 'parked',
      ...payload,
    },
  },
})

/** v2-envelope `call.hangup`; 86s elapse between start_time and occurred_at. */
const hangupEvent = (sid: string, payload: Record<string, unknown> = {}) => ({
  data: {
    record_type: 'event',
    id: randomUUID(),
    event_type: 'call.hangup',
    occurred_at: '2026-07-10T00:01:31.000Z',
    payload: {
      call_control_id: 'v2:abc',
      call_session_id: sid,
      from: FROM,
      to: TO,
      start_time: '2026-07-10T00:00:05.000Z',
      state: 'hangup',
      hangup_cause: 'normal_clearing',
      ...payload,
    },
  },
})

const postJson = (body: unknown) =>
  callRoutes.request('/status/telnyx', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })

const postForm = (fields: Record<string, string>) =>
  callRoutes.request('/status/telnyx', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  })

const postSettingForm = (path: string, fields: Record<string, string>) =>
  settingRoutes.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  })

const userId = new mongoose.Types.ObjectId()
const seedSetting = () => Setting.create({ user: userId, profile: 'Main', type: 'telnyx', number: FROM })
const seedCall = (sid: string, setting: Types.ObjectId) =>
  Call.create({ sid, user: userId, number: TO, telnyx_number: FROM, type: 'send', setting, isview: true })

let errorSpy: MockInstance<typeof console.error>

beforeAll(connectMemoryDb)
afterAll(disconnectMemoryDb)
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(async () => {
  errorSpy.mockRestore()
  sendToUser.mockClear()
  await clearDb()
})

describe('POST /status/telnyx -- Call Control JSON events', () => {
  // Happy path for the whole JSON pipeline: a spec-complete event must pass the AJV gate and produce a call log
  // correctly linked to its owning setting, user, and contact -- the joins the inbox UI depends on.
  test('call.initiated (outgoing): 200 exactly, logs a send call linked to the owning setting and contact', async () => {
    const setting = await seedSetting()
    const contact = await Contact.create({ first_name: 'A', last_name: 'B', note: '', number: TO, user: userId })
    const event = initiatedEvent()

    const res = await postJson(event)
    expect(res.status).toBe(200) // exactly 200, not another 2xx (Telnyx error 75299)

    const call = await Call.findOne({ sid: event.data.payload.call_session_id })
    assert(call)
    expect(call.type).toBe('send')
    expect(call.number).toBe(TO)
    expect(call.telnyx_number).toBe(FROM)
    expect(call.isview).toBe(true)
    expect(call.setting.toString()).toBe(setting._id.toString())
    expect(call.user.toString()).toBe(userId.toString())
    expect(call.contact?.toString()).toBe(contact._id.toString())
    expect(errorSpy).not.toHaveBeenCalled()
  })

  // Incoming legs are logged elsewhere (on answer); logging them here too would duplicate call history.
  test('call.initiated (incoming): acknowledged but not logged', async () => {
    await seedSetting()
    const res = await postJson(initiatedEvent({ direction: 'incoming' }))
    expect(res.status).toBe(200)
    expect(await Call.countDocuments()).toBe(0)
  })

  // The webhook is unauthenticated: events for numbers we don't own must not create orphan rows.
  test('call.initiated with no matching setting: acknowledged but not logged', async () => {
    const res = await postJson(initiatedEvent())
    expect(res.status).toBe(200)
    expect(await Call.countDocuments()).toBe(0)
  })

  // Duration isn't in the event -- we compute it from two timestamps. Guards that math and the socket notify,
  // which is how the open UI learns the call ended.
  test('call.hangup: finalizes duration (occurred_at - start_time) and status, notifies the owner', async () => {
    const setting = await seedSetting()
    const sid = randomUUID()
    await seedCall(sid, setting._id)

    const res = await postJson(hangupEvent(sid))
    expect(res.status).toBe(200)

    const call = await Call.findOne({ sid })
    assert(call)
    expect(call.duration).toBe(86)
    expect(call.status).toBe('completed')
    expect(sendToUser).toHaveBeenCalledWith(userId.toString(), { message: 'call', number: TO })
  })

  // Providers retry and deliver out of order; a hangup for a call we never logged must not throw or emit
  // a ghost notification.
  test('call.hangup for an unknown sid: acknowledged, nothing updated', async () => {
    const res = await postJson(hangupEvent(randomUUID()))
    expect(res.status).toBe(200)
    expect(sendToUser).not.toHaveBeenCalled()
  })

  // Telnyx sends many event types we ignore; they must ack without error-logging, or real failures drown in noise.
  test('an event type we do not act on (call.answered): acknowledged silently', async () => {
    const event = initiatedEvent()
    event.data.event_type = 'call.answered'
    const res = await postJson(event)
    expect(res.status).toBe(200)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  // A recognized-but-invalid event must short-circuit the DB write (no half-updated call) yet still ack --
  // validation failure is the one path where 'log it' and 'never 4xx' pull in opposite directions.
  test('recognized event missing required fields: acknowledged, logged, no write', async () => {
    const setting = await seedSetting()
    const sid = randomUUID()
    await seedCall(sid, setting._id)
    // strip occurred_at + start_time (both in the tightened `required`) via destructure-omit
    const { occurred_at: _o, payload: fullPayload, ...dataRest } = hangupEvent(sid).data
    const { start_time: _s, ...payload } = fullPayload
    const res = await postJson({ data: { ...dataRest, payload } })
    expect(res.status).toBe(200)
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('call.hangup'), expect.anything())
    const call = await Call.findOne({ sid })
    expect(call?.duration).toBeNull()
    expect(call?.status).toBeNull()
  })

  // The last-resort branch: any unrecognized body must still 2xx, or Telnyx retries it forever.
  test('non-envelope garbage: acknowledged and logged', async () => {
    const res = await postJson({ hello: 'world' })
    expect(res.status).toBe(200)
    expect(errorSpy).toHaveBeenCalledWith('Unhandled Telnyx webhook payload', expect.anything())
  })
})

describe('POST /status/telnyx -- TeXML form status callback', () => {
  // Spec-complete call-progress-events post (the §5 validators enforce the spec's full `required` list). The RFC-2822
  // Timestamp is deliberate: TeXML sends Twilio-style timestamps, so format validation must stay off.
  const texmlStatusForm = (sid: string, over: Record<string, string> = {}) => ({
    AccountSid: 'f5586561-8ff0-4291-a51b-c7dfe4139ff9',
    CallSid: sid,
    CallSidLegacy: sid,
    CallInitiatedAt: '2026-07-10T00:00:00.028Z',
    CallStatus: 'completed',
    CallbackSource: 'call-progress-events',
    ConnectionId: '1234567890',
    SequenceNumber: '3',
    Timestamp: 'Fri, 10 Jul 2026 00:01:00 +0000',
    From: FROM,
    To: TO,
    ...over,
  })

  // One URL serves two payload styles; proves the content-type dispatch picks the form branch and the
  // Twilio-shaped fields map onto the same call doc the JSON events write.
  test('updates the call from the Twilio-shaped form fields and notifies the owner', async () => {
    const setting = await seedSetting()
    const sid = randomUUID()
    await seedCall(sid, setting._id)

    const res = await postForm(texmlStatusForm(sid, { CallDuration: '42' }))
    expect(res.status).toBe(200)

    const call = await Call.findOne({ sid })
    assert(call)
    expect(call.duration).toBe(42)
    expect(call.status).toBe('completed')
    expect(sendToUser).toHaveBeenCalledWith(userId.toString(), { message: 'call', number: TO })
    expect(errorSpy).not.toHaveBeenCalled()
  })

  // Without a sid the update has no key -- it must be rejected outright, not turned into a match-nothing query.
  test('missing CallSid: still exactly 200, logged, no write', async () => {
    const setting = await seedSetting()
    const sid = randomUUID()
    await seedCall(sid, setting._id)
    const { CallSid: _c, CallSidLegacy: _l, ...form } = texmlStatusForm(sid, { CallDuration: '42' })

    const res = await postForm(form)
    expect(res.status).toBe(200)
    expect(errorSpy).toHaveBeenCalledWith('Invalid TeXML status callback payload', expect.anything())

    const call = await Call.findOne({ sid })
    expect(call?.duration).toBeNull()
    expect(call?.status).toBeNull()
  })

  // Optional fields are coerced leniently: one bad field must not discard the whole callback (the status
  // update is more valuable than the duration).
  test('malformed CallDuration: the field is dropped, the status update still lands', async () => {
    const setting = await seedSetting()
    const sid = randomUUID()
    await seedCall(sid, setting._id)

    const res = await postForm(texmlStatusForm(sid, { CallDuration: 'junk' }))
    expect(res.status).toBe(200)

    const call = await Call.findOne({ sid })
    assert(call)
    expect(call.duration).toBeNull()
    expect(call.status).toBe('completed')
  })

  // TeXML posts other callback kinds (Refer) to the same shape-family; the baseline must keep them from being
  // misread as call-status updates.
  test('a callback without CallStatus (Refer status): rejected by the baseline, still 200, logged', async () => {
    const setting = await seedSetting()
    const sid = randomUUID()
    await seedCall(sid, setting._id)

    const res = await postForm({ CallSid: sid, CallSidLegacy: sid, ReferCallStatus: 'in-progress' })
    expect(res.status).toBe(200)
    expect(errorSpy).toHaveBeenCalledWith('Invalid TeXML status callback payload', expect.anything())

    const call = await Call.findOne({ sid })
    expect(call?.status).toBeNull()
  })

  // The status enum is pinned to the spec; an out-of-enum value must not leak into the model's status union.
  test('a CallStatus outside the spec enums (analyzed, AI calls only): rejected, still 200, logged', async () => {
    const setting = await seedSetting()
    const sid = randomUUID()
    await seedCall(sid, setting._id)

    const res = await postForm(texmlStatusForm(sid, { CallStatus: 'analyzed' }))
    expect(res.status).toBe(200)
    expect(errorSpy).toHaveBeenCalledWith('Invalid TeXML status callback payload', expect.anything())

    const call = await Call.findOne({ sid })
    expect(call?.status).toBeNull()
  })
})

// The SMS webhooks route per-provider via `/:type`; only the Twilio form branches are exercised here (the Telnyx JSON
// branches are AJV-validated like the call events above). Seeded settings use `type: 'telnyx'` so the handlers'
// Twilio-side message cleanup (a real 5s timer + provider API call) stays out of the tests.
describe('POST /receive-sms/twilio -- Twilio inbound SMS form webhook', () => {
  const SMS_SID = 'SM_inbound'
  const inboundForm = { To: FROM, From: TO, SmsSid: SMS_SID, Body: 'hello', NumMedia: '0' }

  // Twilio parses the reply as TwiML, so the content type and <Response> body matter, not just the status.
  // Persistence is fire-and-forget behind the reply -- this also guards that race staying invisible to Twilio.
  test('valid post: replies 200 empty TwiML and persists the message', async () => {
    const setting = await seedSetting()

    const res = await postSettingForm('/receive-sms/twilio', inboundForm)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/xml')
    expect(await res.text()).toContain('<Response')

    // persistence runs after the webhook reply (fire-and-forget), so poll for it
    const msg = await vi.waitFor(async () => {
      const found = await TextMessage.findOne({ sid: SMS_SID })
      assert(found)
      return found
    })
    expect(msg.message).toBe('hello')
    expect(msg.number).toBe(TO)
    expect(msg.telnyx_number).toBe(FROM)
    expect(msg.setting.toString()).toBe(setting._id.toString())
    expect(sendToUser).toHaveBeenCalledWith(userId.toString(), { message: 'hello', number: TO })
    expect(errorSpy).not.toHaveBeenCalled()
  })

  // Lenient coercion: a bad optional field must cost only itself, never the message body.
  test('malformed NumMedia: the field is dropped, the message is still recorded without media', async () => {
    await seedSetting()
    const res = await postSettingForm('/receive-sms/twilio', { ...inboundForm, NumMedia: 'junk' })
    expect(res.status).toBe(200)

    const msg = await vi.waitFor(async () => {
      const found = await TextMessage.findOne({ sid: SMS_SID })
      assert(found)
      return found
    })
    expect(msg.media).toEqual([])
  })

  // Without To the message can't be routed to a setting; it must be dropped -- but the reply still has to be
  // valid TwiML or Twilio errors the call flow.
  test('missing To: still 200 empty TwiML, logged, nothing persisted', async () => {
    await seedSetting()
    const { To: _to, ...form } = inboundForm

    const res = await postSettingForm('/receive-sms/twilio', form)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/xml')
    expect(await res.text()).toContain('<Response')
    expect(errorSpy).toHaveBeenCalledWith('Rejected webhook payload', expect.anything())
    expect(await TextMessage.countDocuments()).toBe(0)
  })
})

describe('POST /sms-status/twilio -- Twilio message status form webhook', () => {
  const SMS_SID = 'SM_status'
  const seedMessage = (setting: Types.ObjectId) =>
    TextMessage.create({
      sid: SMS_SID,
      user: userId,
      number: TO,
      telnyx_number: FROM,
      type: 'send',
      status: 'sent',
      isview: true,
      setting,
      message: 'hi',
    })

  // Status callbacks are the only way a sent message ever leaves 'sent'; guards the sid lookup + status write.
  test('valid post: 204 ack, message status updated', async () => {
    const setting = await seedSetting()
    await seedMessage(setting._id)

    const form = { MessageSid: SMS_SID, MessageStatus: 'delivered', From: FROM }
    const res = await postSettingForm('/sms-status/twilio', form)
    expect(res.status).toBe(204)

    const msg = await TextMessage.findOne({ sid: SMS_SID })
    expect(msg?.status).toBe('delivered')
    expect(errorSpy).not.toHaveBeenCalled()
  })

  // No sid means no addressable message: reject without a write, but keep the ack so Twilio doesn't retry.
  test('missing MessageSid: still 204, logged, no write', async () => {
    const setting = await seedSetting()
    await seedMessage(setting._id)

    const res = await postSettingForm('/sms-status/twilio', { MessageStatus: 'delivered', From: FROM })
    expect(res.status).toBe(204)
    expect(errorSpy).toHaveBeenCalledWith('Rejected webhook payload', expect.anything())

    const msg = await TextMessage.findOne({ sid: SMS_SID })
    expect(msg?.status).toBe('sent')
  })
})
