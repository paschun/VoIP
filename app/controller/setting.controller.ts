import fs from 'node:fs'
import crypto from 'node:crypto'
import Telnyx from 'telnyx'
import { format } from 'date-fns'
import mongoose from 'mongoose'
import twilio from 'twilio'
import nodemailer, { type SendMailOptions } from 'nodemailer'
import { createMessage, encrypt, readKey } from 'openpgp'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

import Setting from '../model/setting.model.ts'
import { Message, TextMessage, type MessageDoc, type CommonFields } from '../model/message.model.ts'
import Contact from '../model/contact.model.ts'
import Email from '../model/email.model.ts'
import { combineURLs, UPLOAD_FOLDER_FORMAT } from '../helper/common.helper.ts'
import { WEBHOOKS } from '../helper/webhook-paths.ts'
import { getIO } from '../core/socket.ts'
import { env } from '../core/env.ts'
import { ProviderError } from '../core/error.ts'

import { factory } from '../core/factory.ts'
import { auth } from '../middleware/auth.ts'
import { jsonBody, pathParams, pathParams404, queryParams } from '../middleware/validate.ts'
import { ack } from '../helper/respond.helper.ts'
import type { Env, JsonCtx, ParamCtx, ParamJsonCtx, QueryCtx } from '../core/factory.ts'
import type { Ok } from '../../shared/api-contracts.ts'
import {
  smsTypeParam, type SmsTypeParam,
  getNumberBody, type GetNumberRequest, type GetNumberResponse,
  sendSmsBody, type SendSmsRequest,
  conversationsQuery, type ConversationsQuery,
  messageListBody, type MessageListRequest,
  conversationParam, type ConversationParam,
  notificationBody, type NotificationRequest,
  profileIdParam, type ProfileIdParam,
} from '../../shared/contracts/setting.ts'

// todo: check this against email model
interface SendEmailSetting {
  host: string
  port: number | string
  secure: boolean
  email: string
  password: string
  sender_email: string
  to_email: string
  pgpEncryptEnabled?: boolean
  pgpPublicKey?: string | null
}

/** PGP-encrypt a UTF-8 string against an armored public key, returning ASCII-armored ciphertext. */
async function pgpEncrypt(text: string, armoredKey: string): Promise<string> {
  const encryptionKeys = await readKey({ armoredKey })
  return encrypt({ message: await createMessage({ text }), encryptionKeys })
}

/** Send an SMTP (optionally PGP-encrypted) email notification. Best-effort: resolves false instead of rejecting. */
async function sendEmail(setting: SendEmailSetting, email: { subject: string; text: string; html: string }): Promise<boolean> {
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
    const numbers = (phoneNumber.data ?? []).map((n) => ({ id: n.id, phone_number: n.phone_number }))
    return c.json({ data: { type: 'telnyx', numbers } } satisfies GetNumberResponse, 200)
  }
  const list = await twilio(body.twilio_sid, body.twilio_token).incomingPhoneNumbers.list()
  const numbers = list.map((n) => ({ sid: n.sid, phoneNumber: n.phoneNumber }))
  return c.json({ data: { type: 'twilio', numbers } } satisfies GetNumberResponse, 200)
}

/** Normalize a dialed number: strip formatting, then prefix +1 for a bare 10-digit US number. */
function normalizeSmsNumber(raw: string): string {
  const digits = raw.replace(/\s/g, '').replace(/-/g, '').replace(/\)/g, '').replace(/\(/g, '')
  return digits.length === 10 ? `+1${digits}` : digits
}

/** Resolve the contact owning `number` for `userId`, trying the full number then its last 10 digits. */
async function findContactId(userId: string, number: string) {
  const exact = await Contact.findOne({ user: { $eq: userId }, number: { $eq: number } })
  if (exact) return exact._id
  const short = await Contact.findOne({ user: { $eq: userId }, number: { $eq: number.slice(-10) } })
  return short?._id
}

/** Send an SMS/MMS to one or more numbers via the profile's provider and persist each as a `send` message. */
async function handleSendSms(c: JsonCtx<SendSmsRequest>) {
  const userId = c.get('user').id
  const { numbers, profile, message, media } = c.req.valid('json')
  const setting = await Setting.findOne({ user: { $eq: userId }, _id: { $eq: profile._id } })
  if (!setting) throw new HTTPException(404, { message: 'Message not sent!' })

  const messageRecords: Record<string, unknown>[] = []
  const twilioClient = setting.type === 'twilio' ? twilio(setting.twilio_sid ?? '', setting.twilio_token ?? '') : null
  const telnyxClient = setting.type === 'telnyx' ? new Telnyx({ apiKey: setting.api_key ?? '' }) : null

  for (const raw of numbers) {
    const toNumber = normalizeSmsNumber(raw)
    let sid: string | undefined
    if (twilioClient) {
      try {
        const sent = await twilioClient.messages.create({
          body: message,
          from: setting.number ?? '',
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
          from: setting.number ?? '',
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

    const record: Record<string, unknown> = {
      sid,
      user: userId,
      number: toNumber,
      telnyx_number: setting.number,
      type: 'send',
      status: 'sent',
      isview: true,
      message,
      setting: setting._id,
    }
    const contactId = await findContactId(userId, toNumber)
    if (contactId) record.contact = contactId
    if (media.length) record.media = media
    messageRecords.push(record)
  }

  const messages = await TextMessage.create(messageRecords)
  return c.json({ data: messages } satisfies Ok<unknown[]>, 200)
}

/** Inbound SMS/MMS webhook (Twilio form or Telnyx JSON). Persists the message, notifies the user, replies empty TwiML. */
async function handleReceiveSms(c: ParamCtx<SmsTypeParam>) {
  const { type } = c.req.valid('param')
  try {
    let media: string[] = []
    let toNumber: string
    let fromNumber: string
    let sid: string
    let messageText: string

    if (type === 'twilio') {
      // todo: parse with zod
      const form = await c.req.parseBody() as Record<string, string>
      messageText = form.Body ?? ''
      toNumber = form.To ?? ''
      fromNumber = form.From ?? ''
      sid = form.SmsSid ?? ''
      const numMedia = Number(form.NumMedia ?? 0)
      media = await saveMedia(
        Array.from({ length: numMedia }, (_, i) => ({ url: form[`MediaUrl${i}`] ?? '', contentType: form[`MediaContentType${i}`] ?? '' })),
      )
    } else {
      // telnyx branch
      // todo: parse with zod
      const payload = (await c.req.json() as any).data.payload
      toNumber = payload.to[0].phone_number
      fromNumber = payload.from.phone_number
      sid = payload.id
      messageText = payload.text
      media = await saveMedia(
        (payload.media ?? []).map((m: any) => ({ url: m.url, contentType: m.content_type })),
      )
    }

    const setting = await Setting.findOne({ number: { $eq: toNumber } })
    if (setting) {
      // todo: use better types
      const record: Record<string, unknown> = {
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
      }
      const contact = await Contact.findOne({ user: { $eq: setting.user?.toString() ?? '' }, number: { $eq: fromNumber } })
      if (contact) record.contact = contact._id

      // todo: type socketIO messages
      getIO().to(setting.user?.toString() ?? '').emit('user_message', {
        message: messageText,
        number: fromNumber,
        telnyx_number: toNumber,
        toUser: setting.user,
        contact,
        type: 'receive',
        status: 'received',
        isview: false,
        settings: setting,
      })

      if (setting.emailnotification) {
        const emailSetting = await Email.findOne({ user: { $eq: setting.user?.toString() ?? '' } })
        if (emailSetting) {
          // todo: dont cast
          void sendEmail(emailSetting as unknown as SendEmailSetting, {
            subject: `Message from ${fromNumber}`,
            text: 'Message received',
            html: `Received Message on ${toNumber}:<br><hr><br><p>${messageText}</p><br><hr><br>`,
          })
        }
      }
      await TextMessage.create(record)
      if (setting.type === 'twilio') void deleteTwilioMessageLater(setting, sid)
    }
  } catch (error) {
    console.error(error)
  }
  return emptyTwiml(c)
}

/** Download each MMS attachment to dated `uploads/` storage and return its public URL. */
async function saveMedia(items: { url: string; contentType: string }[]): Promise<string[]> {
  const saved: string[] = []
  for (const { url, contentType } of items) {
    if (!url) continue
    // todo: make content type detection safer, for png especially
    const ext = contentType === 'image/gif' ? 'gif' : contentType === 'image/jpeg' ? 'jpg' : 'png'
    const name = `${crypto.randomBytes(24).toString('hex')}.${ext}`
    const date = format(new Date(), UPLOAD_FOLDER_FORMAT)
    try {
      await fs.promises.access(`./uploads/${date}`)
    } catch {
      await fs.promises.mkdir(`./uploads/${date}`)
    }
    // todo: is this a race condition? does this need to be awaited?
    downloadToFile(url, `./uploads/${date}/${name}`)
      .then(() => console.log('Image downloaded.'))
      .catch((err) => console.error('Image download failed:', err))
    saved.push(combineURLs(env.BASE_URL, 'uploads', date, name))
  }
  return saved
}

/** Twilio keeps sent messages on its servers; delete this one shortly after delivery (best-effort, up to 5 tries). */
function deleteTwilioMessageLater(setting: { twilio_sid?: string | null; twilio_token?: string | null }, sid: string) {
  return new Promise<boolean>((resolve) => {
    setTimeout(async () => {
      const client = twilio(setting.twilio_sid ?? '', setting.twilio_token ?? '')
      for (let i = 0; i < 5; i++) {
        try {
          if (await client.messages(sid).remove()) return resolve(true)
        } catch { /* retry */ }
      }
      resolve(false)
    }, 5000)
  })
}

/** SMS status webhook (Twilio form or Telnyx JSON). Updates the stored message status, then acknowledges with a 2xx. */
async function handleSmsStatus(c: ParamCtx<SmsTypeParam>) {
  const { type } = c.req.valid('param')
  try {
    let status: string
    let sid: string
    if (type === 'twilio') {
      const form = await c.req.parseBody() as Record<string, string>
      status = form.MessageStatus ?? ''
      sid = form.MessageSid ?? ''
      if (['delivered', 'undelivered', 'failed'].includes(status)) {
        // Twilio retains sent messages; remove this one once it reaches a terminal state.
        const setting = await Setting.findOne({ number: { $eq: form.From ?? '' } })
        if (setting?.type === 'twilio') {
          const client = twilio(setting.twilio_sid ?? '', setting.twilio_token ?? '')
          for (let i = 0; i < 5; i++) {
            try {
              if (await client.messages(sid).remove()) break
            } catch { /* retry */ }
          }
        }
      }
    } else {
      // todo: dont cast
      const payload = (await c.req.json() as any).data.payload
      status = payload.to[0].status
      sid = payload.id
    }
    const message = await Message.findOne({ sid: { $eq: sid } })
    if (message) {
      message.status = status
      await message.save()
    }
  } catch (error) {
    console.error(error)
  }
  // Status callbacks (Twilio statusCallback, Telnyx message webhook) don't consume a reply -- just acknowledge 2xx.
  return ack(c)
}

/** Empty `<Response/>` TwiML -- the inbound-SMS reply (Twilio parses it as "no auto-reply"; Telnyx just sees a 2xx). */
function emptyTwiml(c: Context<Env>) {
  const response = new twilio.twiml.VoiceResponse()
  c.header('Content-Type', 'text/xml')
  return c.body(response.toString())
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
      $group: { // $group combines multiple documents with the same group key into a single document
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
  await Contact.populate(conversations, { path: 'contact', select: 'first_name last_name -_id', options: { lean: true } })
  return conversations
}

async function aggregateConversations(c: QueryCtx<ConversationsQuery>) {
  const data = await conversationsForProfile(c.get('user').id, c.req.valid('query').profile)
  return c.json({ data } satisfies Ok<ConversationRow[]>, 200)
}

/** Delete a whole conversation (every message to/from the other party's number) for the caller. */
async function removeConversation(c: ParamCtx<ConversationParam>) {
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
async function saveEmailNotification(c: ParamJsonCtx<ProfileIdParam, NotificationRequest>) {
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
export const saveNotification = factory.createHandlers(auth, pathParams(profileIdParam), jsonBody(notificationBody), saveEmailNotification)
export const receiveSms = factory.createHandlers(pathParams404(smsTypeParam), handleReceiveSms)
export const smsStatus = factory.createHandlers(pathParams404(smsTypeParam), handleSmsStatus)
export const sendMessage = factory.createHandlers(auth, jsonBody(sendSmsBody), handleSendSms)
export const listConversations = factory.createHandlers(auth, queryParams(conversationsQuery), aggregateConversations)
export const getConversationMessages = factory.createHandlers(auth, jsonBody(messageListBody), listMessages)
export const deleteConversation = factory.createHandlers(auth, pathParams(conversationParam), removeConversation)
