import { z } from 'zod'
import type { Ok, StringBoolean } from '../api-contracts.ts'
import type { HardwarekeyListItem } from './hardwarekey.ts'

export const loginBody = z.object({ email: z.string().min(1), password: z.string().min(1) })
export type LoginRequest = z.infer<typeof loginBody>

export const registerBody = z.object({ email: z.string().min(1), password: z.string().min(6).max(100) })
export type RegisterRequest = z.infer<typeof registerBody>

export const otpVerifyBody = z.object({ user: z.string().min(1), verification_code: z.string().min(1) })
export type OtpVerifyRequest = z.infer<typeof otpVerifyBody>

/** `GET /directory-name`: `name` is optional -- the handler distinguishes "no name supplied" from a mismatch. */
export const directoryNameQuery = z.object({ name: z.string().optional() })
export type DirectoryNameQuery = z.infer<typeof directoryNameQuery>

export const updateUsernameBody = z.object({ email: z.string().min(1) })
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

/** `status` toggles MFA on/off; with `status:'true'`, `qr:'true'` mints a secret+QR and `qr:'false'`+`code` verifies it. */
export const saveMfaBody = z.object({ status: z.string().min(1), qr: z.string().optional(), code: z.string().optional() })
export type SaveMfaRequest = z.infer<typeof saveMfaBody>

/** The user projection echoed back on auth/profile actions (also stored in the `userdata` cookie). */
export type UserData = { _id: string; name: string; email: string; token: string; mfa: StringBoolean }
export type UserResponse = Ok<UserData>
// todo: is UserData ever actually used by the clients?

/** Bespoke (not `Ok<T>`): the login result drives three frontend branches (key challenge / OTP / straight in). */
export type LoginResponse = {
  status: 'true' | 'hardwarekey' | 'mfa'
  message: string
  data: UserData
  token: string
  hardwarekey: HardwarekeyListItem[] | false
  mfa: boolean
}

/** `POST /otp-verify` success body; the frontend gates on `status === 'true'`. */
export type OtpVerifyResponse = { status: 'true'; data: never[]; message: string }

/** `POST /mfa/save` with `qr:'true'`: the enrolment QR data-URL + the base32 secret to display. */
export type MfaQrResponse = { image: string; secret: string }

export type CheckDirectoryName = { status: 'true' | 'false' | 'nodir' | 'no-name'; dir: string }
export type CheckDirectoryNameResponse = Ok<CheckDirectoryName>

/** `GET /get-update-version`: whether a newer build than the running one exists upstream. */
export type UpdateAvailableResponse = { update: StringBoolean }
