import type { ApiEnvelope } from '../api-contracts.ts'
import type { EmailDoc } from '../schema/email.ts'

/** Response of `email/setting-get` — the full saved document, or `null` when the user has none yet. */
export type EmailSettingsResponse = ApiEnvelope<EmailDoc | null>

/** Response of `email/create` — the full saved document. */
export type SaveEmailSettingsResponse = ApiEnvelope<EmailDoc>

/** Response of `email/save/setting` — toggling a profile's email-notification flag (no payload). */
export type SaveEmailSettingResponse = ApiEnvelope<null>
