import { sValidator } from '@hono/standard-validator'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Context } from 'hono'
import type { UnofficialStatusCode } from 'hono/utils/http-status'

// 419 is non-standard (not in Hono's StatusCode union), so it's tagged with `UnofficialStatusCode` as Hono documents
// for custom codes. Kept here as the one place the migration reproduces the app's legacy validation-failure status.
const VALIDATION_FAILED = 419 as UnofficialStatusCode

// Request-body validation wrappers over @hono/standard-validator (`sValidator`). Standard Schema means these accept
// any conforming schema (our `shared/schema` zod schemas included) with no zod-specific adapter.
//
// On failure, `sValidator`'s default is HTTP 400 + JSON; this hook overrides it to this app's convention — HTTP 419
// plus the shared error-envelope shape (`{ status: 'false', message }`) — preserving what the old validatorjs branches
// returned. `result.error` is a Standard Schema `Issue[]`, so the first issue's message is surfaced.
//
// Pick by Content-Type of the caller: `jsonBody` for app fetch/`$post` and Telnyx webhooks (application/json);
// `formBody` for Twilio webhooks and HTML form / file-upload posts (x-www-form-urlencoded / multipart).
const hook = (
  result: { success: true } | { success: false; error: readonly StandardSchemaV1.Issue[] },
  c: Context,
) => (result.success ? undefined : c.json({ status: 'false', message: result.error[0]?.message ?? 'Validation failed' }, VALIDATION_FAILED))

export const jsonBody = <S extends StandardSchemaV1>(schema: S) => sValidator('json', schema, hook)
export const formBody = <S extends StandardSchemaV1>(schema: S) => sValidator('form', schema, hook)
// Path-param validation (`/:id`): binds `c.req.valid('param')` to the schema's output type.
export const pathParams = <S extends StandardSchemaV1>(schema: S) => sValidator('param', schema, hook)
