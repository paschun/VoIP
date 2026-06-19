/**
 * API contracts shared between the VoIP frontend and the Hono backend.
 *
 * The frontend imports these via the `@shared` alias (see vite.config.js / tsconfig.json); the backend imports the same
 * files directly. Per-endpoint request/response contracts live in `shared/contracts/*`; the data model in
 * `shared/schema/*`.
 */
import type { SettingDoc } from './schema/setting.ts'

/** HTTP verbs used across the app -- the frontend `request()` wrapper and the backend's Telnyx REST caller. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Success body: just the payload. No `status`/`message` — the frontend reads neither on success (success toasts are
 * hardcoded client-side). Pair with `sendDoc<T>` / `c.json`.
 */
export interface Ok<T> {
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
 * Several Mongoose models persist booleans as the string enum `'true' | 'false'`
 * (e.g. `Setting.emailnotification`, `User.mfa`, `Message.isview`). Type them as
 * this so the frontend can compare/bind against the literal strings.
 */
export type StringBoolean = 'true' | 'false'

/**
 * A Mongoose `Date` field as it arrives on the **frontend**.
 *
 * The models store these as BSON `Date` (e.g. `created_at: { type: Date, default:
 * Date.now }`), but the type changes across the wire: Express `res.json`/`res.send`
 * both run `JSON.stringify`, which serializes a `Date` to an ISO 8601 UTC string
 * (`"2026-05-31T13:40:00.000Z"`). So the backend holds a `Date` and the frontend
 * receives a `string` — parse with `new Date(value)` before doing date math
 * (string subtraction won't work; on the server the raw `Date` coerces fine).
 */
export type IsoDateString = string

export interface User {
  _id: string
  email: string
  name?: string
  mfa?: StringBoolean
}

export interface Contact {
  _id: string
  first_name: string
  last_name: string
  number: string
  note?: string
}

/** A messaging/calling profile as the frontend consumes it -- the Setting wire doc (Hono RPC infers this exact shape). */
export type Profile = SettingDoc

/** A conversation row in the SMS inbox (a number + its latest message). */
export interface Conversation {
  _id: string
  message?: string
  contact?: Contact | null
  created_at?: IsoDateString
  /** 'call' rows render an inbound/outbound call label instead of the message. */
  message_type?: string
  /** Direction of the latest message/call. */
  type?: 'send' | 'receive'
  /** Count of unviewed messages in this conversation. */
  isview?: number
}

/** A single entry in a conversation thread (`setting/message-list`). */
export interface Message {
  _id: string
  /** Direction of the message/call. */
  type: 'send' | 'receive'
  /** Plain text body (absent for call entries). */
  message?: string
  /** JSON-stringified array of media URLs (MMS). */
  media?: string
  /** 'call' entries render a call label + duration instead of a body. */
  datatype?: string
  /** Call duration in seconds (call entries only). */
  duration?: number
  created_at?: IsoDateString
}

export interface HardwareKey {
  _id: string
  title: string
  credentials?: string[]
}

/** Response of `auth/get-version` -- the latest git short hash (or fallback). */
export type VersionResponse = Ok<string>
