/**
 * API contracts shared between the VoIP frontend and the Express backend.
 *
 * The frontend imports these via the `@shared` alias (see vite.config.js /
 * tsconfig.json). The backend is currently plain JS, but can adopt these
 * incrementally with JSDoc and `// @ts-check`, e.g.:
 *
 *   /** @typedef {import('../shared/api-contracts').Contact} Contact *\/
 *
 * Most backend handlers wrap their payload in `ApiEnvelope`.
 */

/** HTTP verbs used across the app -- the frontend `request()` wrapper and the backend's Telnyx REST caller. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** Standard `{ status, message, data }` envelope returned by most endpoints. */
export interface ApiEnvelope<T = unknown> {
  status: boolean | string
  message?: string
  data: T
}

/**
 * Hono-era success body: just the payload. No `status`/`message` — the frontend reads neither on success (success
 * toasts are hardcoded client-side). Pair with `sendDoc<T>` / `c.json`. Supersedes `ApiEnvelope` as groups migrate;
 * once no handler emits the old envelope, `ApiEnvelope`/`ApiErrorEnvelope` are deleted (see `error-handling-plan.md`).
 */
export interface Ok<T> {
  data: T
}

/**
 * The single error shape on the wire — `message` is the one field the client consumes (`handleError` →
 * `swalError(err.data.message)`). Thrown server-side as `HTTPException` and rendered once in `app.onError`; never part
 * of a success contract (the client gets it as a swallowed/rejected response, not a resolved value).
 */
export interface ApiError {
  message: string
}

/**
 * Error-path envelope: `status` (a falsy `false`/`'false'`) and an optional `message`, with **no** payload — error
 * responses don't carry data. Union it with `ApiEnvelope<T>` in a contract so a typed `res` lets the error branches
 * omit `data` while the success branch still requires it. `data?: undefined` (rather than dropping the key) keeps
 * `response.data` readable on the union, so the frontend can guard with `if (res && res.data)` without narrowing on
 * `status` first.
 */
export interface ApiErrorEnvelope {
  status: boolean | string
  message?: string
  data?: undefined
}

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

/** A messaging/calling profile and its provider Setting (Twilio or Telnyx). */
export interface Profile {
  _id: string
  profile: string
  number?: string
  type?: 'twilio' | 'telnyx' | string
  /** Unviewed-message count for this profile (Mongoose virtual). */
  messageCount?: number
  /** Total-message count for the owning user (Mongoose virtual). */
  totalCount?: number
  /** Whether email notifications are on. Mongoose enum, so a string not a boolean. */
  emailnotification?: StringBoolean
  /** Provider credentials, present once the profile is configured. */
  api_key?: string
  twilio_sid?: string
  twilio_token?: string
  sip_username?: string
  sip_password?: string
}

export interface Contact {
  _id: string
  first_name: string
  last_name: string
  number: string
  note?: string
}

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

/** Response of `profile/getdata` — every Setting/profile the signed-in user owns. */
export type ProfilesResponse = ApiEnvelope<Profile[]>

/** Response of `auth/get-version` -- the latest git short hash (or fallback). */
export type VersionResponse = Ok<string>

/** Payload of `call/token` — a provider access token plus the chosen profile. */
export interface CallToken {
  type: 'twilio' | 'telnyx' | string
  token: string
  setting: Profile
}
