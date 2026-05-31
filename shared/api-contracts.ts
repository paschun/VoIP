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

/** Standard `{ status, message, data }` envelope returned by most endpoints. */
export interface ApiEnvelope<T = unknown> {
  status: boolean | string
  message?: string
  data: T
}

/**
 * Several Mongoose models persist booleans as the string enum `'true' | 'false'`
 * (e.g. `Setting.emailnotification`, `User.mfa`, `Message.isview`). Type them as
 * this so the frontend can compare/bind against the literal strings.
 */
export type StringBoolean = 'true' | 'false'

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
  created_at?: string
}

export interface HardwareKey {
  _id: string
  title: string
  credentials?: string[]
}

/** Response of `profile/getdata` — every Setting/profile the signed-in user owns. */
export type ProfilesResponse = ApiEnvelope<Profile[]>

/** Response of `email/save/setting` — the profile after toggling its email-notification flag. */
export type SaveEmailSettingResponse = ApiEnvelope<Profile>

/** Response of `auth/get-version` — the latest git short hash (or fallback). */
export type VersionResponse = ApiEnvelope<string>

/** Payload of `call/token` — a provider access token plus the chosen profile. */
export interface CallToken {
  type: 'twilio' | 'telnyx' | string
  token: string
  setting: Profile
}
