import { sValidator } from '@hono/standard-validator'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ApiError } from '../shared/api-contracts.ts'

// 422 Unprocessable Content (RFC 9110): the body parsed fine but failed schema validation.
// A real `ContentfulStatusCode` (unlike the app's old non-standard 419).
const VALIDATION_FAILED = 422

// Request-body validation wrappers over @hono/standard-validator (`sValidator`). Standard Schema means these accept
// any conforming schema (our `shared/schema` zod schemas included) with no zod-specific adapter.
//
// On failure, `sValidator`'s default is HTTP 400 + JSON; these hooks override it to carry the shared `ApiError` shape
// (`{ message }`, the one field the frontend reads) under a chosen status. `result.error` is a Standard Schema
// `Issue[]`, so the first issue's message is surfaced. `makeHook` parameterises the status so a validator can opt into
// a different code (e.g. a 404 for a path segment that addresses a resource) without duplicating the body shaping.
//
// Pick by Content-Type of the caller: `jsonBody` for app fetch/`$post` and Telnyx webhooks (application/json);
// `formBody` for Twilio webhooks and HTML form / file-upload posts (x-www-form-urlencoded / multipart).
//
// `status` is generic so its literal type (`422`/`404`) is preserved into `c.json(..., status)` -- otherwise the
// validation-error response infers the whole `ContentfulStatusCode` union as its status, and RPC consumers can't tell
// it apart from a 2xx success (the `{ message }` body would leak into success-body extraction on the client).
// 
// result of hook is only used if it is of type `Response`
// https://github.com/honojs/middleware/blob/main/packages/standard-validator/src/index.ts#L154
// returning result.data would have no effect
const makeHook =
  <S extends ContentfulStatusCode>(status: S) =>
  (result: { success: true } | { success: false; error: readonly StandardSchemaV1.Issue[] }, c: Context) =>
    result.success ? undefined : c.json({ message: result.error[0]?.message ?? 'Validation failed' } satisfies ApiError, status)

const hook422 = makeHook(VALIDATION_FAILED)

export const jsonBody = <S extends StandardSchemaV1>(schema: S) => sValidator('json', schema, hook422)
export const formBody = <S extends StandardSchemaV1>(schema: S) => sValidator('form', schema, hook422)
/** Path-param validation (`/:id`): binds `c.req.valid('param')` to the schema's output type. */
export const pathParams = <S extends StandardSchemaV1>(schema: S) => sValidator('param', schema, hook422)
export const pathParams404 = <S extends StandardSchemaV1>(schema: S) => sValidator('param', schema, makeHook(404))
/** Query-string validation (`?number=`): binds `c.req.valid('query')` to the schema's output type. */
export const queryParams = <S extends StandardSchemaV1>(schema: S) => sValidator('query', schema, hook422)
