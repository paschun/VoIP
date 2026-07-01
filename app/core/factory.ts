import { createFactory } from 'hono/factory'
import type { Context } from 'hono'

/** The JWT payload the auth middleware (`../middleware/auth.ts`) verifies and attaches as `c.get('user')`. */
export interface AuthUser {
  id: string
  name: string
}

/**
 * Env for the typed Hono factory. One factory means the `Env` below is defined once: every middleware/handler built
 * from it sees `c.get('user')` / `c.var.user` as `AuthUser` without re-declaring the type. `Variables.user` is
 * populated by the auth middleware (`../middleware/auth.ts`) and is only present on routes guarded by it -- the
 * same contract the old Express `req.user` had.
 */
export type Env = { Variables: { user: AuthUser } }

/** Shared, typed Hono factory: build every group's middleware/handlers from this so they share {@link Env}. */
export const factory = createFactory<Env>()

/**
 * Context for a handler validated by `jsonBody(schema)` (see `app/middleware/validate.ts`): `c.req.valid('json')` is `T`, and
 * `c.get('user')` stays typed via `Env`. Standalone (non-inline) handlers can't infer their `c`, so they annotate it
 * with this instead of hand-writing the full `Context<Env, ..., { in/out }>` triple.
 */
export type JsonCtx<T> = Context<Env, string, { in: { json: T }; out: { json: T } }>

/** Context for a handler guarded by `pathParams(schema)`: `c.req.valid('param')` is `T`. */
export type ParamCtx<T> = Context<Env, string, { in: { param: T }; out: { param: T } }>

/** Context for a handler guarded by `formBody(schema)` (x-www-form-urlencoded / multipart, e.g. Twilio webhooks): `c.req.valid('form')` is `T`. */
export type FormCtx<T> = Context<Env, string, { in: { form: T }; out: { form: T } }>

/** Context for a handler guarded by `queryParams(schema)` (`?number=`): `c.req.valid('query')` is `T`. */
export type QueryCtx<T> = Context<Env, string, { in: { query: T }; out: { query: T } }>

/** Context for a handler guarded by `headerParams(schema)` (e.g. an upload's `content-type`): `c.req.valid('header')` is `T`. */
export type HeaderCtx<T> = Context<Env, string, { in: { header: T }; out: { header: T } }>

/** Context for a handler guarded by both `pathParams` and `jsonBody` (e.g. `PUT /:id`): `valid('param')` and `valid('json')`. */
export type ParamJsonCtx<P, J> = Context<Env, string, { in: { param: P; json: J }; out: { param: P; json: J } }>
