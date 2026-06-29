/**
 * API contracts shared between the VoIP frontend and the Hono backend.
 *
 * The frontend imports these via the `@shared` alias (see vite.config.js / tsconfig.json); the backend imports the same
 * files directly. Per-endpoint request/response contracts live in `shared/contracts/*`; the data model in
 * `shared/schema/*`.
 */
/** HTTP verbs used across the app -- the frontend `request()` wrapper and the backend's Telnyx REST caller. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Success body: just the payload. No `status`/`message` — the frontend reads neither on success (success toasts are
 * hardcoded client-side). Send via `c.json({ data } satisfies Ok, 200)`.
 */
export interface Ok<T = unknown> {
  data: T
}

/**
 * The single error shape on the wire — `message` is the one field the client consumes. Thrown server-side as
 * `HTTPException` and rendered once in `app.onError`; never part of a success contract. The frontend `request` helper
 * surfaces it (plus the HTTP status) as the failure arm of {@link ApiResult}.
 */
export interface ApiError {
  message: string
}

/**
 * Discriminated result of a frontend API call, built from the two wire shapes: on success the `Ok<T>` body tagged
 * `ok: true`; on failure the `ApiError` body plus the HTTP `status`, tagged `ok: false`. Call sites branch with
 * `if (!res.ok)` and read `res.data` / `res.message` -- no lossy `false` sentinel, no try/catch.
 */
export type ApiResult<T> = (Ok<T> & { ok: true }) | (ApiError & { ok: false; status?: number })

/**
 * Some Mongoose models persist booleans as the string enum `'true' | 'false'` (e.g. `Setting.emailnotification`). Type
 * them as this so the frontend can compare/bind against the literal strings.
 */
export type StringBoolean = 'true' | 'false'

export interface User {
  _id: string
  name: string
  mfa?: StringBoolean
}

export interface Contact {
  _id: string
  first_name: string
  last_name: string
  number: string
  note?: string
}

export interface HardwareKey {
  _id: string
  title: string
  credentials?: string[]
}

/** Response of `auth/get-version` -- the latest git short hash (or fallback). */
export type VersionResponse = Ok<string>
