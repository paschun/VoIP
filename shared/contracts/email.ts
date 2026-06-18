import * as z from 'zod'
import type { Ok, StringBoolean } from '../api-contracts.ts'
import { emailSchema, type EmailDoc } from '../schema/email.ts'

// Success bodies only (`Ok<T>`): errors aren't part of the contract — they're thrown as `HTTPException` and arrive at
// the client as a swallowed response, never a resolved value (see `error-handling-plan.md`).

/** Response of `email/setting-get` — the full saved document, or `null` when the user has none yet. */
export type EmailSettingsResponse = Ok<EmailDoc | null>

/** Response of `email/create` — the saved document. */
export type SaveEmailSettingsResponse = Ok<EmailDoc>

/** Response of `email/save/setting` — toggling a profile's email-notification flag (no payload). */
export type SaveEmailSettingResponse = Ok<null>

/**
 * Request body of `email/create`: the editable subset of an Email document (the persisted doc minus the server-managed
 * `_id`/`user`/`created_at`/`__v`). Both halves derive from `emailSchema`, so neither can drift from the model:
 *   - `EmailCreateRequest` — the static type, `Pick`ed from the wire `EmailDoc` (`wire.ts` is built to be `Pick`ed).
 *   - `emailCreateBody` — the runtime validator, generated from the schema via `toJSONSchema()` → `z.fromJSONSchema()`,
 *     `.pick`ed to the same fields. The six SMTP fields are required because the model marks them `required: true` (no
 *     second list); the two address fields also get an `email` format rule, mirroring `EmailSetting.vue`'s vuelidate
 *     `email` validators — a rule Mongoose `match` can't supply here, since it doesn't round-trip through `toJSONSchema`.
 *
 * `z.fromJSONSchema` is semi-experimental and statically returns an untyped `ZodType` (the runtime value is a
 * `ZodObject` and validates correctly), so it's cast once to `z.ZodType<EmailCreateRequest>` — the single bridge
 * between the model-derived validator and the model-derived type. Note: `required` enforces *presence*; unlike the old
 * validatorjs `required`, an empty string is no longer rejected server-side (the form still validates client-side).
 * This module gains a runtime (zod + the schema) but the frontend only ever `import type`s from it, so it's erased there.
 */
export type EmailCreateRequest =
  & Pick<EmailDoc, 'email' | 'password' | 'to_email' | 'host' | 'port' | 'sender_email' | 'secure' | 'pgpEncryptEnabled'>
  // The model can only express `pgpPublicKey` as an optional nullable String (Mongoose marks any non-`required` String
  // nullable), but on the wire the request always carries a plain `string` — '' means "no key". Override it here.
  & { pgpPublicKey: string }

export const emailCreateBody = (z.fromJSONSchema(emailSchema.toJSONSchema()) as z.ZodObject<z.ZodRawShape>)
  .pick({ email: true, password: true, to_email: true, host: true, port: true, sender_email: true,
          secure: true, pgpPublicKey: true, pgpEncryptEnabled: true })
  .extend({
    to_email: z.email(),
    sender_email: z.email(),
    // The derived schema makes `pgpPublicKey` optional + nullable; on the wire it's a required plain `string` ('' = no
    // key), so override it. (`secure`/`pgpEncryptEnabled` are `required` in the schema, so the derivation requires them.)
    pgpPublicKey: z.string(),
  }) as unknown as z.ZodType<EmailCreateRequest>

/**
 * Request body of `email/save/setting` — flips one profile's email-notification flag. Hand-written (it spans `Setting`,
 * not the Email model, so there's nothing to derive): `setting_id` is the target `Setting._id`, and `status` is the
 * `StringBoolean` that `Setting.emailnotification` stores (enum `'true' | 'false'`). The old handler did `c.req.json()`
 * untyped and let a bad `status` fail Mongoose enum validation (→ 400); validating here rejects it up front (→ 422).
 */
 // TODO: derive zod validator (id, status/emailnotification) from Setting schema
export const emailSaveSettingBody = z.object({
  setting_id: z.string().min(1),
  status: z.enum(['true', 'false']),
}) satisfies z.ZodType<{ setting_id: string; status: StringBoolean }>
export type EmailSaveSettingRequest = z.infer<typeof emailSaveSettingBody>
