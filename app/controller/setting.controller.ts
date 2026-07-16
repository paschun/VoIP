import fs from 'node:fs'
import { HTTPException } from 'hono/http-exception'
import mongoose from 'mongoose'
import nodemailer, { type SendMailOptions } from 'nodemailer'
import { createMessage, encrypt, readKey } from 'openpgp'
import Telnyx from 'telnyx'
import twilio from 'twilio'
import type { Ok } from '../../shared/api-contracts.ts'
import {
  displayableMediaContentType,
  type DisplayableMediaContentType,
  OUTBOUND_MMS_TOTAL_BYTES,
  CONTENT_TYPE_TO_EXT,
} from '../../shared/contracts/media.ts'
import {
  getNumberBody,
  type GetNumberRequest,
  type GetNumberResponse,
  sendSmsBody,
  type SendSmsRequest,
  conversationsQuery,
  type ConversationsQuery,
  messageListBody,
  type MessageListRequest,
  conversationParam,
  type ConversationParam,
  notificationBody,
  type NotificationRequest,
  profileIdParam,
  type ProfileIdParam,
  twilioInboundSms,
  type TwilioInboundSms,
  twilioSmsStatus,
  type TwilioSmsStatus,
} from '../../shared/contracts/setting.ts'
import type { EmailDoc } from '../../shared/schema/email.ts'
import { env } from '../core/env.ts'
import { ProviderError } from '../core/error.ts'
import { factory } from '../core/factory.ts'
import type { FormCtx, JsonCtx, PathParamCtx, PathParamJsonCtx, QueryCtx } from '../core/factory.ts'
import { sendToUser } from '../core/socket.ts'
import { combineURLs, prepareUploadTarget } from '../helper/common.helper.ts'
import { ack, emptyTwimlReply, ok } from '../helper/respond.helper.ts'
import { parseTelnyxInboundMessage, parseTelnyxMessageStatus } from '../helper/telnyx-events.helper.ts'
import { WEBHOOKS } from '../helper/webhook-paths.ts'
import { auth } from '../middleware/auth.ts'
import { jsonBody, pathParams, queryParams, webhookForm, webhookJsonParse } from '../middleware/validate.ts'
import Contact from '../model/contact.model.ts'
import Email from '../model/email.model.ts'
import Media from '../model/media.model.ts'
import { Message, TextMessage, type MessageDoc, type TextMessageDoc, type CommonFields } from '../model/message.model.ts'
import Setting from '../model/setting.model.ts'

/**
 * A persisted outbound text row (`datatype: 'message'`, `type: 'send'`) built per recipient in `handleSendSms`.
 * Field types come from the schema-inferred {@link TextMessageDoc}; the literals are the values this path stamps.
 * `user` stays a string (the JWT id) for mongoose to cast.
 */
type OutgoingText = Pick<TextMessageDoc, 'sid' | 'number' | 'telnyx_number' | 'message' | 'setting' | 'contact'> &
  Partial<Pick<TextMessageDoc, 'media'>> & {
    user: string
    type: 'send'
    status: 'sent'
    isview: true
  }

/** The SMTP + PGP fields `sendEmail` needs, sourced from the Email model so they can't drift from the schema. */
type EmailSettings = Pick<
  EmailDoc,
  'host' | 'port' | 'secure' | 'email' | 'password' | 'sender_email' | 'to_email' | 'pgpEncryptEnabled' | 'pgpPublicKey'
>

/** PGP-encrypt a UTF-8 string against an armored public key, returning ASCII-armored ciphertext. */
async function pgpEncrypt(text: string, armoredKey: string): Promise<string> {
  const encryptionKeys = await readKey({ armoredKey })
  return encrypt({ message: await createMessage({ text }), encryptionKeys })
}

/** Send an SMTP (optionally PGP-encrypted) email notification. Best-effort: resolves false instead of rejecting. */
async function sendEmail(setting: EmailSettings, email: { subject: string; text: string; html: string }): Promise<boolean> {
  try {
    // todo: dont cast to number, ideally handled in validation
    const transporter = nodemailer.createTransport({
      host: setting.host,
      port: Number(setting.port),
      secure: setting.secure, // true for 465, false for other ports
      auth: { user: setting.email, pass: setting.password },
    })
    const mailOptions = {
      from: setting.sender_email,
      to: setting.to_email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    } satisfies SendMailOptions
    // pgpPublicKey is nullish, but gated here via a truthy check
    if (setting.pgpEncryptEnabled && setting.pgpPublicKey) {
      // nodemailer-openpgp transformed the whole message body into a proper PGP/MIME structure.
      // https://github.com/nodemailer/nodemailer-openpgp/blob/master/lib/nodemailer-openpgp.js
      // (Content-Type: multipart/encrypted; protocol="application/pgp-encrypted" with a Version: 1 part + encrypted.asc).
      // This replacement encrypts the text/html strings inline instead.
      // Both produce ciphertext a client can decrypt, but ours isn't PGP/MIME.
      // Mail clients won't auto-detect it as an encrypted message, they'll show an armored blob.
      mailOptions.text = await pgpEncrypt(mailOptions.text, setting.pgpPublicKey)
      mailOptions.html = await pgpEncrypt(mailOptions.html, setting.pgpPublicKey)
    }
    void transporter.sendMail(mailOptions)
    return true
  } catch (e) {
    console.error(e)
    return false
  }
}

/** Stream a remote file (provider-hosted MMS media) to disk. */
async function downloadToFile(url: string, destPath: string) {
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }
  await fs.promises.writeFile(destPath, response.body)
}

/** Public: list the phone numbers on the supplied provider account (used while configuring a profile). */
async function listProviderNumbers(c: JsonCtx<GetNumberRequest>) {
  const body = c.req.valid('json')
  if (body.type === 'telnyx') {
    const phoneNumber = await new Telnyx({ apiKey: body.api_key }).phoneNumbers.list()
    const numbers = (phoneNumber.data ?? []).map(({ id, phone_number }) => ({ id, phone_number }))
    return c.json({ data: { type: 'telnyx', numbers } } satisfies GetNumberResponse, 200)
  }
  const list = await twilio(body.twilio_sid, body.twilio_token).incomingPhoneNumbers.list()
  const numbers = list.map(({ sid, phoneNumber }) => ({ sid, phoneNumber }))
  return c.json({ data: { type: 'twilio', numbers } } satisfies GetNumberResponse, 200)
}

/** Resolve the contact owning `number` (canonical E.164) for `userId`. */
async function findContactId(userId: string, number: string) {
  const contact = await Contact.findOne({ user: { $eq: userId }, number: { $eq: number } })
  return contact?._id
}

/** Send an SMS/MMS to one or more numbers via the profile's provider and persist each as a `send` message. */
async function handleSendSms(c: JsonCtx<SendSmsRequest>) {
  const userId = c.get('user').id
  const { numbers, profile, message, media } = c.req.valid('json')
  const setting = await Setting.findOne({ user: { $eq: userId }, _id: { $eq: profile._id } })
  if (!setting) throw new HTTPException(404, { message: 'Profile not found' })

  // A profile without its sender number/credentials can't send -- surface that as 422 rather than passing '' into the
  // provider client and getting back an opaque 502.
  const from = setting.number
  if (!from) throw new HTTPException(422, { message: 'Profile has no sender number' })

  let twilioClient: ReturnType<typeof twilio> | null = null
  let telnyxClient: Telnyx | null = null
  if (setting.type === 'twilio') {
    if (!setting.twilio_sid || !setting.twilio_token) throw new HTTPException(422, { message: 'Twilio profile is missing credentials' })
    twilioClient = twilio(setting.twilio_sid, setting.twilio_token)
  } else {
    if (!setting.api_key) throw new HTTPException(422, { message: 'Telnyx profile is missing an API key' })
    telnyxClient = new Telnyx({ apiKey: setting.api_key })
  }

  if (media.length) {
    const paths = await ownedUploadPaths(userId, media)
    const maxBytes = twilioClient ? OUTBOUND_MMS_TOTAL_BYTES.twilio : OUTBOUND_MMS_TOTAL_BYTES.telnyx
    if ((await totalMediaBytes(paths)) > maxBytes)
      throw new HTTPException(422, { message: `Attached media exceeds the ${maxBytes / 1_000_000} MB MMS limit` })
  }

  const messageRecords: OutgoingText[] = []
  for (const toNumber of numbers) {
    let sid: string | undefined
    if (twilioClient) {
      try {
        const sent = await twilioClient.messages.create({
          body: message,
          from,
          to: toNumber,
          statusCallback: combineURLs(env.BASE_URL, WEBHOOKS.sms.smsStatus.full.twilio),
          ...(media.length ? { mediaUrl: media } : {}),
        })
        sid = sent.sid
      } catch (e) {
        throw new ProviderError('twilio', 'messages.create', { cause: e })
      }
    } else if (telnyxClient) {
      try {
        const sent = await telnyxClient.messages.send({
          from,
          to: toNumber,
          text: message,
          webhook_url: combineURLs(env.BASE_URL, WEBHOOKS.sms.smsStatus.full.telnyx),
          ...(media.length ? { media_urls: media } : {}),
        })
        sid = sent.data?.id
      } catch (e) {
        throw new ProviderError('telnyx', 'messages.send', { cause: e })
      }
    }
    if (!sid) continue

    const contactId = await findContactId(userId, toNumber)
    messageRecords.push({
      sid,
      user: userId,
      number: toNumber,
      telnyx_number: from,
      type: 'send',
      status: 'sent',
      isview: true,
      message,
      setting: setting._id,
      ...(contactId ? { contact: contactId } : {}),
      ...(media.length ? { media } : {}),
    })
  }

  const messages = await TextMessage.create(messageRecords)
  return c.json({ data: messages } satisfies Ok<unknown[]>, 200)
}

/**
 * Resolve outgoing attachment URLs to the caller's own uploads, returning their relative file paths. 422 when any
 * entry isn't an upload owned by the user (the UI only ever attaches its own upload URLs), which also blocks sending
 * other users' uploads or arbitrary URLs from a hand-crafted request.
 */
async function ownedUploadPaths(userId: string, urls: string[]): Promise<string[]> {
  const paths = urls.map(uploadRelPath)
  const docs = await Media.find({ media: { $in: paths }, user: { $eq: userId } })
  const owned = new Set(docs.map(({ media }) => media))
  if (!paths.every((p) => owned.has(p))) throw new HTTPException(422, { message: 'Attached media must be your own uploads' })
  return paths
}

/** URL -> the relative path Media docs store (`uploads/...`); non-URLs pass through and simply match no upload. */
function uploadRelPath(url: string): string {
  try {
    // strip all leading slashes: a pathname always starts with '/' (and can start with several, e.g. 'http://x////y'),
    // while Media docs store the path relative ('uploads/...')
    return new URL(url).pathname.replace(/^\/+/, '')
  } catch {
    return url
  }
}

/** Total on-disk size of the attachments. The per-provider caps are in {@link OUTBOUND_MMS_TOTAL_BYTES}. */
async function totalMediaBytes(paths: string[]): Promise<number> {
  let total = 0
  for (const p of paths) {
    try {
      total += (await fs.promises.stat(p)).size
    } catch {} // upload since removed from disk: nothing to measure
  }
  return total
}

/** Typed output of the Telnyx inbound/status AJV parsers (their non-null return), for the JSON webhook handlers. */
type TelnyxInboundData = NonNullable<ReturnType<typeof parseTelnyxInboundMessage>>
type TelnyxStatusData = NonNullable<ReturnType<typeof parseTelnyxMessageStatus>>

// Two provider-specific payloads with completely different field names get normalized into one provider-agnostic shape
type InboundSms = {
  toNumber: string
  fromNumber: string
  sid: string
  messageText: string
  media: string[]
}

/** The provider-agnostic tail of inbound SMS/MMS: notify the owner, optionally email, persist the message row. */
async function persistInboundSms(input: InboundSms) {
  const { toNumber, fromNumber, sid, messageText, media } = input
  const setting = await Setting.findOne({ number: { $eq: toNumber } })
  if (!setting) return
  const userId = setting.user.toString()
  const contact = await Contact.findOne({ user: { $eq: userId }, number: { $eq: fromNumber } })

  sendToUser(userId, { event: 'user_message', message: messageText, number: fromNumber })

  if (setting.emailnotification) {
    const emailSetting = await Email.findOne({ user: { $eq: userId } })
    if (emailSetting) {
      void sendEmail(emailSetting, {
        subject: `Message from ${fromNumber}`,
        text: 'Message received',
        html: `Received Message on ${toNumber}:<br><hr><br><p>${messageText}</p><br><hr><br>`,
      })
    }
  }
  await TextMessage.create({
    sid,
    user: setting.user,
    number: fromNumber,
    telnyx_number: toNumber,
    type: 'receive',
    status: 'received',
    isview: false,
    message: messageText,
    setting: setting._id,
    media,
    ...(contact ? { contact: contact._id } : {}),
  })
  if (setting.type === 'twilio') void deleteTwilioMessageLater(setting, sid)
}

/** Twilio inbound SMS/MMS (form). Replies empty TwiML immediately; media download + persistence run afterward. */
async function receiveTwilioSms(c: FormCtx<TwilioInboundSms>) {
  const form = c.req.valid('form')
  const attachments = Array.from({ length: form.NumMedia }, (_, i) => ({
    url: form[`MediaUrl${i}`] ?? '',
    content_type: form[`MediaContentType${i}`] ?? '',
  }))
  void processInboundSms(attachments, {
    toNumber: form.To,
    fromNumber: form.From,
    sid: form.SmsSid,
    messageText: form.Body ?? '',
  })
  return emptyTwimlReply(c)
}

/** Telnyx inbound SMS/MMS (JSON). Same as Twilio; the empty-TwiML reply is just a 2xx to Telnyx. */
async function receiveTelnyxSms(c: JsonCtx<TelnyxInboundData>) {
  const { payload } = c.req.valid('json')
  void processInboundSms(payload.media ?? [], {
    toNumber: payload.to[0].phone_number,
    fromNumber: payload.from.phone_number,
    sid: payload.id,
    messageText: payload.text ?? '',
  })
  return emptyTwimlReply(c)
}

/**
 * Download the displayable attachments, then persist the inbound message with only the URLs whose download succeeded.
 * Runs after the webhook reply -- providers need a fast 2xx (~2s Telnyx, 15s Twilio) and downloads are unbounded, so
 * callers must NOT await this. Never rejects.
 */
async function processInboundSms(attachments: { url: string; content_type?: string }[], sms: Omit<InboundSms, 'media'>) {
  try {
    const results = await Promise.allSettled(attachments.filter(isSavableMedia).map(saveMedia))
    results
      .filter((r) => r.status === 'rejected')
      .forEach(({ reason }) => { console.error('MMS attachment download failed:', reason) })
    const media = results.filter((r) => r.status === 'fulfilled').map(({ value }) => value)
    await persistInboundSms({ ...sms, media })
  } catch (error) {
    console.error(error)
  }
}

/** An MMS attachment we keep: it has a URL and a content type the chat view can display. */
type SavableMedia = { url: string; content_type: DisplayableMediaContentType }

/**
 * Predicate for {@link SavableMedia}; logs the attachments it drops (the message itself still persists). `url` is
 * already guaranteed by both webhook validators, so only the content type narrows here.
 */
function isSavableMedia(item: { url: string; content_type?: string }): item is SavableMedia {
  const savable = displayableMediaContentType.safeParse(item.content_type).success
  if (!savable) console.error('Skipping MMS attachment with unsupported content type:', item.content_type)
  return savable
}

/** Download a displayable MMS attachment to dated `uploads/` storage and return its public URL. */
async function saveMedia({ url, content_type }: SavableMedia): Promise<string> {
  const { mediaPath, fullUrl } = await prepareUploadTarget(CONTENT_TYPE_TO_EXT[content_type])
  await downloadToFile(url, mediaPath)
  return fullUrl
}

/** Delete a sent message from Twilio's servers (best-effort, up to 5 tries). Twilio retains sent messages. */
async function deleteTwilioMessage(setting: { twilio_sid?: string | null; twilio_token?: string | null }, sid: string) {
  if (!setting.twilio_sid || !setting.twilio_token) return false
  const client = twilio(setting.twilio_sid, setting.twilio_token)
  for (let i = 0; i < 5; i++) {
    try {
      if (await client.messages(sid).remove()) return true
    } catch {
      /* retry */
    }
  }
  return false
}

/** Same delete, deferred ~5s -- the inbound path removes the auto-reply copy shortly after it's sent. */
function deleteTwilioMessageLater(setting: { twilio_sid?: string | null; twilio_token?: string | null }, sid: string) {
  return new Promise<boolean>((resolve) => {
    setTimeout(() => resolve(deleteTwilioMessage(setting, sid)), 5000)
  })
}

/** Apply a delivery-status update to the stored message row (both providers funnel here). */
async function applyMessageStatus(sid: string, status: string) {
  const message = await Message.findOne({ sid: { $eq: sid } })
  if (message) {
    message.status = status
    await message.save()
  }
}

/** Twilio SMS status callback (form). On a terminal status, detach the Twilio copy-cleanup; Twilio accepts any 2xx. */
async function updateTwilioSmsStatus(c: FormCtx<TwilioSmsStatus>) {
  const form = c.req.valid('form')
  try {
    const { MessageStatus: status, MessageSid: sid } = form
    if (['delivered', 'undelivered', 'failed'].includes(status)) {
      // Twilio retains sent messages; remove this one once it reaches a terminal state (detached -- see the receive path).
      const setting = await Setting.findOne({ number: { $eq: form.From ?? '' } })
      if (setting?.type === 'twilio') void deleteTwilioMessage(setting, sid)
    }
    await applyMessageStatus(sid, status)
  } catch (error) {
    console.error(error)
  }
  return ack(c)
}

/** Telnyx SMS status webhook (JSON). Must answer exactly 200 (a non-200 2xx is error 75299 and triggers failover). */
async function updateTelnyxSmsStatus(c: JsonCtx<TelnyxStatusData>) {
  const { payload } = c.req.valid('json')
  try {
    await applyMessageStatus(payload.id, payload.to[0].status)
  } catch (error) {
    console.error(error)
  }
  return ok(c)
}

/** A collapsed conversation row: the latest message per other-party number, with that conversation's unread count. */
export type ConversationRow = Pick<CommonFields, 'type' | 'telnyx_number' | 'created_at'> & {
  _id: string // the other party's number (the $group key), not an ObjectId
  message: string | null // exclude `undefined`, $group sets to null if it dne
  contact: { first_name: string; last_name: string } | null // subset of contact that the inbox renders
  message_type: MessageDoc['datatype'] // $first of the discriminator key ('message' | 'call')
  unread: number // count of unread messages in the conversation
}

/** Conversation list for a profile: latest message per other-party number, with unread counts, newest-first. */
export async function conversationsForProfile(userId: string, profileId: string): Promise<ConversationRow[]> {
  const user = new mongoose.Types.ObjectId(userId)
  const setting = new mongoose.Types.ObjectId(profileId)

  // Collapse this profile's messages into one row per conversation.
  // $group does NOT preserve input order, so the pre-group $sort only exists to make $first pick each conversation's latest message
  // a second $sort after $group is what actually orders the returned rows newest-first.
  const conversations = await Message.aggregate<ConversationRow>([
    { $match: { user, setting } }, // match the messages that have same `user` and `setting` ids
    { $sort: { created_at: -1 } }, // newest first (descending), so the following $first picks each conversation's latest message
    {
      $group: {
        // $group combines multiple documents with the same group key into a single document
        _id: '$number', // `number` field (other-party number) (a string, not actually a number) becomes the group key
        message: { $first: '$message' }, // $first grabs the latest message's fields
        created_at: { $first: '$created_at' },
        contact: { $first: '$contact' },
        message_type: { $first: '$datatype' }, // `datatype` field
        type: { $first: '$type' }, // `type` field
        telnyx_number: { $first: '$telnyx_number' },
        unread: { $sum: { $cond: [{ $eq: ['$isview', false] }, 1, 0] } }, // sums unread
      },
    },
    { $sort: { created_at: -1 } }, // order the grouped conversation rows newest-first
  ])
  // `contact` is populated to the subset that the inbox renders
  // without lean, `contact` is replaced with a hydrated Contact Document
  // mongodb includes `_id` by default, so must explicitly exclude it: https://mongoosejs.com/docs/api/query.html#Query.prototype.select()
  await Contact.populate(conversations, {
    path: 'contact',
    select: 'first_name last_name -_id',
    options: { lean: true },
  })
  return conversations
}

async function aggregateConversations(c: QueryCtx<ConversationsQuery>) {
  const data = await conversationsForProfile(c.get('user').id, c.req.valid('query').profile)
  return c.json({ data } satisfies Ok<ConversationRow[]>, 200)
}

/** Delete a whole conversation (every message to/from the other party's number) for the caller. */
async function removeConversation(c: PathParamCtx<ConversationParam>) {
  const messages = await Message.deleteMany({
    user: { $eq: c.get('user').id },
    number: { $eq: c.req.valid('param').number },
  })
  return c.json({ data: messages } satisfies Ok, 200)
}

/** Messages in a conversation; marks the unread ones read first. */
async function listMessages(c: JsonCtx<MessageListRequest>) {
  const { number, profile } = c.req.valid('json')
  const filter = {
    user: { $eq: c.get('user').id },
    telnyx_number: { $eq: number.telnyx_number ?? '' },
    number: { $eq: number._id },
    setting: { $eq: profile },
  }
  await Message.updateMany({ ...filter, isview: { $eq: false } }, { isview: true })
  // MessageDoc generic is just for this file.
  // shape each row by its `datatype` so calls carry only `duration` and texts only `message`/`media`.
  // Frontend narrows on `datatype`.
  const common = (m: MessageDoc) => ({ _id: m._id, type: m.type, created_at: m.created_at })
  const data = (await Message.find(filter).lean<MessageDoc[]>()).map((m) =>
    m.datatype === 'call'
      ? { datatype: m.datatype, ...common(m), duration: m.duration }
      : { datatype: m.datatype, ...common(m), message: m.message, media: m.media },
  )
  return c.json({ data } satisfies Ok, 200)
}

/** Flip one profile's email-notification flag (`:id` = `Setting._id`, `status` = the boolean to store). */
async function saveEmailNotification(c: PathParamJsonCtx<ProfileIdParam, NotificationRequest>) {
  const { id } = c.req.valid('param')
  const { status } = c.req.valid('json')
  // $eq is "NoSQL-injection-hardened", defends against attacker-provided `{ "$gt": "" }`
  const setting = await Setting.findOne({ _id: { $eq: id } })
  if (!setting) throw new HTTPException(404, { message: `Profile ${id} not found!` })
  setting.emailnotification = status
  await setting.save()
  return ack(c)
}

export const listNumbers = factory.createHandlers(jsonBody(getNumberBody), listProviderNumbers)
export const saveNotification = factory.createHandlers(
  auth,
  pathParams(profileIdParam),
  jsonBody(notificationBody),
  saveEmailNotification,
)
export const receiveSmsTwilio = factory.createHandlers(webhookForm(twilioInboundSms, emptyTwimlReply), receiveTwilioSms)
export const receiveSmsTelnyx = factory.createHandlers(webhookJsonParse(parseTelnyxInboundMessage, emptyTwimlReply), receiveTelnyxSms)
export const smsStatusTwilio = factory.createHandlers(webhookForm(twilioSmsStatus), updateTwilioSmsStatus)
export const smsStatusTelnyx = factory.createHandlers(webhookJsonParse(parseTelnyxMessageStatus), updateTelnyxSmsStatus)
export const sendMessage = factory.createHandlers(auth, jsonBody(sendSmsBody), handleSendSms)
export const listConversations = factory.createHandlers(auth, queryParams(conversationsQuery), aggregateConversations)
export const getConversationMessages = factory.createHandlers(auth, jsonBody(messageListBody), listMessages)
export const deleteConversation = factory.createHandlers(auth, pathParams(conversationParam), removeConversation)
