import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { readKey } from 'openpgp'
import Email from '../model/email.model.ts'
import { factory } from '../factory.ts'
import type { Env, JsonCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody } from '../validate.ts'
import { ack } from '../util/respond.hono.ts'
import type { Ok } from '../../shared/api-contracts.ts'
import { emailCreateBody, type EmailCreateRequest } from '../../shared/contracts/email.ts'

// throws if invalid
const assertValidPgpKey = (keyString: string) => readKey({ armoredKey: keyString })

// ── Handlers (signatures visible) ───────────────────────────────────────────────────────────────────────────────

// there is exactly one Email doc per user (the `user` field is `unique`) so we find-or-create in a single write keyed by `user` 
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
  await Email.findOneAndUpdate(
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
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true },
  )
  // The client keeps the values it just sent, so there's nothing to return.
  return ack(c)
}

async function getEmailSettings(c: Context<Env>) {
  // EmailSetting.vue calls this on mount and interprets null as "no settings exist yet"
  const emailSettings = await Email.findOne({ user: c.get('user').id })
  const data = emailSettings ? emailSettings.toObject({ flattenObjectIds: true }) : null
  return c.json({ data } satisfies Ok, 200)
}

// ── Route handler chains (middleware + validation + handler), spread into the Hono group in email.route.ts ──────────

export const create = factory.createHandlers(auth, jsonBody(emailCreateBody), upsertEmail)
export const getEmail = factory.createHandlers(auth, getEmailSettings)
