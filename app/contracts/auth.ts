import { z } from 'zod'

export const loginBody = z.object({ name: z.string().min(1), password: z.string().min(1) })
export type LoginRequest = z.infer<typeof loginBody>

export const registerBody = z.object({ name: z.string().min(1), password: z.string().min(6).max(100) })
export type RegisterRequest = z.infer<typeof registerBody>

/** `POST /totp/verify` body: the user id (from the login step) + the 6-digit TOTP code to check. */
export const totpVerifyBody = z.object({ userId: z.string().min(1), code: z.string().min(1) })
export type TotpVerifyRequest = z.infer<typeof totpVerifyBody>

export const updateUsernameBody = z.object({ name: z.string().min(1) })
export type UpdateUsernameRequest = z.infer<typeof updateUsernameBody>

export const updatePasswordBody = z.object({
  old_password: z.string().min(1),
  password: z.string().min(1),
  c_password: z.string().min(1),
})
export type UpdatePasswordRequest = z.infer<typeof updatePasswordBody>

/** Shared by `password/verify` and `password/check` (account deletion). */
export const passwordBody = z.object({ password: z.string().min(1) })
export type PasswordRequest = z.infer<typeof passwordBody>

/** `POST /totp` body: the client-held secret (minted by `POST /totp/qr`) + a code proving the user scanned it. */
export const enableTotpBody = z.object({ secret: z.string().min(1), code: z.string().min(1) })
export type EnableTotpRequest = z.infer<typeof enableTotpBody>

/** The user projection echoed back on auth/profile actions (also stored in the `userdata` cookie). The auth token is
 * not part of it -- it's stateless and returned separately, only by login. */
export type UserData = { _id: string; name: string; totp: boolean }

/** `POST /totp/qr`: the enrollment QR data-URL + base32 secret to display (and pass back on enable). Not persisted. */
export type TotpQrInfo = { image: string; secret: string }
