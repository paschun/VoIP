import type { ApiEnvelope, ApiErrorEnvelope } from '../api-contracts.ts'
import type { EmailDoc } from '../schema/email.ts'

/** Response of `email/setting-get` — the full saved document, `null` when the user has none yet, or an error envelope. */
export type EmailSettingsResponse = ApiEnvelope<EmailDoc | null> | ApiErrorEnvelope

/**
 * Response of `email/create` — the saved document on success; failures omit `data` (a 419 validation failure also
 * carries a field-keyed `errors` dict).
 */
export type SaveEmailSettingsResponse =
  | ApiEnvelope<EmailDoc>
  | (ApiErrorEnvelope & { errors?: Record<string, string[]> })

/** Response of `email/save/setting` — toggling a profile's email-notification flag (no payload), or an error envelope. */
export type SaveEmailSettingResponse = ApiEnvelope<null> | ApiErrorEnvelope
