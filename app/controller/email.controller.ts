import type { Context } from 'hono'
import * as openpgp from 'openpgp'
import Email from '../model/email.model.ts'
import Setting from '../model/setting.model.ts'
import { factory } from '../factory.ts'
import type { Env, JsonCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody } from '../validate.ts'
import { sendDoc } from '../util/respond.hono.ts'
import type { ApiEnvelope, ApiErrorEnvelope } from '../../shared/api-contracts.ts'
import type { EmailDoc } from '../../shared/schema/email.ts'
import { emailCreateBody, type EmailCreateRequest, emailSaveSettingBody, type EmailSaveSettingRequest } from '../../shared/contracts/email.ts'

const _validPgpKey = (keyString: string) => openpgp.readKey({ armoredKey: keyString })

// ── Handlers (signatures visible) ───────────────────────────────────────────────────────────────────────────────

async function createEmail(c: JsonCtx<EmailCreateRequest>) {
  try {
    const body = c.req.valid('json')
    const user = c.get('user')
    const checkemail = await Email.findOne({ user: user.id })
    if (body.pgpEncryptEnabled === true) {
      try {
        await _validPgpKey(body.pgpPublicKey ?? '')
      } catch {
        return c.json({ status: false, message: 'Email settings not saved! Invalid PGP Key.' } satisfies ApiErrorEnvelope, 400)
      }
    }
    if (checkemail) {
      checkemail.email = body.email
      checkemail.password = body.password
      checkemail.to_email = body.to_email
      checkemail.host = body.host
      checkemail.port = body.port
      checkemail.secure = body.secure ?? false
      checkemail.sender_email = body.sender_email
      checkemail.pgpPublicKey = body.pgpPublicKey ?? null
      checkemail.pgpEncryptEnabled = body.pgpEncryptEnabled ?? false
      const saveData = await checkemail.save()
      if (saveData) {
        return sendDoc<EmailDoc>(c, checkemail, 'Email settings updated!')
      }
      return c.json({ status: 'false', message: 'Email settings not updated!' } satisfies ApiErrorEnvelope, 400)
    }
    const isSave = await Email.create({
      user: user.id,
      email: body.email,
      password: body.password,
      to_email: body.to_email,
      host: body.host,
      port: body.port,
      secure: body.secure ?? false,
      sender_email: body.sender_email,
    })
    if (isSave) {
      return sendDoc<EmailDoc>(c, isSave, 'Email settings saved!')
    }
    return c.json({ status: false, message: 'Email settings not saved!' } satisfies ApiErrorEnvelope, 400)
  } catch {
    return c.json({ status: 'false', message: 'something is wrong' } satisfies ApiErrorEnvelope, 400)
  }
}

async function getEmailSettings(c: Context<Env>) {
  try {
    // no request payload to validate — GET with no query/params; identity comes from `auth`'s `c.get('user')`
    const emailSettings = await Email.findOne({ user: c.get('user').id })
    return sendDoc<EmailDoc | null>(c, emailSettings, 'Get Email Settings!')
  } catch {
    return c.json({ status: 'false', message: 'something is wrong' } satisfies ApiErrorEnvelope, 400)
  }
}

async function saveEmailNotification(c: JsonCtx<EmailSaveSettingRequest>) {
  try {
    const { setting_id, status } = c.req.valid('json')
    // $eq is "NoSQL-injection-hardened", defends against attacker-provided `{ "$gt": "" }`
    const setting = await Setting.findOne({ _id: { $eq: setting_id } })
    if (setting) {
      setting.emailnotification = status
      await setting.save()
      return c.json({ status: true, message: 'settings updated!', data: null } satisfies ApiEnvelope<null>, 200)
    }
    return c.json({ status: 'false', message: 'settings not updated!' } satisfies ApiErrorEnvelope, 400)
  } catch {
    return c.json({ status: 'false', message: 'something is wrong' } satisfies ApiErrorEnvelope, 400)
  }
}

// ── Route handler chains (middleware + validation + handler), spread into the Hono group in email.route.ts ──────────

export const create = factory.createHandlers(auth, jsonBody(emailCreateBody), createEmail)
export const getEmail = factory.createHandlers(auth, getEmailSettings)
export const saveSetting = factory.createHandlers(auth, jsonBody(emailSaveSettingBody), saveEmailNotification)
