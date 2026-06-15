import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { readKey } from 'openpgp'
import Email from '../model/email.model.ts'
import Setting from '../model/setting.model.ts'
import { factory } from '../factory.ts'
import type { Env, JsonCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody } from '../validate.ts'
import { sendDoc } from '../util/respond.hono.ts'
import type { Ok } from '../../shared/api-contracts.ts'
import type { EmailDoc } from '../../shared/schema/email.ts'
import { emailCreateBody, type EmailCreateRequest, emailSaveSettingBody, type EmailSaveSettingRequest } from '../../shared/contracts/email.ts'

// throws if invalid
const assertValidPgpKey = (keyString: string) => readKey({ armoredKey: keyString })

// ── Handlers (signatures visible) ───────────────────────────────────────────────────────────────────────────────

// Route is `POST /create`, but this is semantically an idempotent upsert (a PUT): there is exactly one Email doc per
// user (the `user` field is `unique`), so we find-or-create in a single write keyed by `user` rather than branching on
// whether the doc already exists. (The verb/URL stay `POST /create` for wire-compat with the existing frontend.)
async function upsertEmail(c: JsonCtx<EmailCreateRequest>) {
  const body = c.req.valid('json')
  if (body.pgpEncryptEnabled) {
    try {
      await assertValidPgpKey(body.pgpPublicKey)
    } catch {
      // a bad PGP key is a known client error, not a server fault — give it a specific 400 message
      throw new HTTPException(400, { message: 'Email settings not saved! Invalid PGP Key.' })
    }
  }
  // One Email per user: atomic upsert keyed by `user` — a single round-trip that inserts on first save, updates after.
  // `user` comes from the filter (Mongoose seeds it onto the doc on insert), so the owner is always the authenticated
  // identity, never the client body. `runValidators` runs the field-level validators against the update (we write the
  // full field set, so required coverage holds); `setDefaultsOnInsert` applies schema defaults (e.g. `created_at`) on
  // insert. A retrieve-then-`.save()` would validate equivalently here (this model has no hooks/cross-field/custom
  // validators), but costs an extra `findOne`, so we use the atomic form.
  const email = await Email.findOneAndUpdate(
    { user: c.get('user').id },
    {
      email: body.email,
      password: body.password,
      to_email: body.to_email,
      host: body.host,
      port: body.port,
      secure: body.secure,
      sender_email: body.sender_email,
      pgpPublicKey: body.pgpPublicKey,
      pgpEncryptEnabled: body.pgpEncryptEnabled,
    },
    // `new` returns modified document rather than the original
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true },
  )
  return sendDoc<EmailDoc>(c, email)
}

async function getEmailSettings(c: Context<Env>) {
  // no request payload to validate — GET with no query/params; identity comes from `auth`'s `c.get('user')`.
  // No try/catch: an unexpected failure throws and `app.onError` logs it once as a 500.
  const emailSettings = await Email.findOne({ user: c.get('user').id })
  return sendDoc<EmailDoc | null>(c, emailSettings)
}

async function saveEmailNotification(c: JsonCtx<EmailSaveSettingRequest>) {
  const { setting_id, status } = c.req.valid('json')
  // $eq is "NoSQL-injection-hardened", defends against attacker-provided `{ "$gt": "" }`
  const setting = await Setting.findOne({ _id: { $eq: setting_id } })
  if (!setting) throw new HTTPException(400, { message: `Profile ${setting_id} not found!` })
  setting.emailnotification = status
  await setting.save()
  // todo: is `null` here needed?
  return c.json({ data: null } satisfies Ok<null>)
}

// ── Route handler chains (middleware + validation + handler), spread into the Hono group in email.route.ts ──────────

export const create = factory.createHandlers(auth, jsonBody(emailCreateBody), upsertEmail)
export const getEmail = factory.createHandlers(auth, getEmailSettings)
export const saveSetting = factory.createHandlers(auth, jsonBody(emailSaveSettingBody), saveEmailNotification)
