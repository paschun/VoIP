import { z } from 'zod'
import type { Ok } from '../api-contracts.ts'

/** `POST /registration/begin` body: the user-chosen label for the new key. */
export const registerKeyBody = z.object({ title: z.string().trim().min(1) })
export type RegisterKeyRequest = z.infer<typeof registerKeyBody>

/** `POST /registration/verify` body: the new credential id + authenticator AAGUID from the WebAuthn attestation. */
export const verifyBody = z.object({ id: z.string(), aaguid: z.string() })
export type VerifyRequest = z.infer<typeof verifyBody>

/** `POST /authentication/challenge` body: which stored key (by owner id + title) to build an assertion challenge for. */
export const loginKeyBody = z.object({ user: z.string(), title: z.string() })
export type LoginKeyRequest = z.infer<typeof loginKeyBody>

/** `DELETE /:id` path param: the hardware-key document id to remove. */
export const deleteKeyParams = z.object({ id: z.string() })
export type DeleteKeyParams = z.infer<typeof deleteKeyParams>

// The WebAuthn ceremony endpoints (registration begin/challenge/verify, authentication challenge/verify) exchange
// authenticator-shaped payloads straight with the browser credential API, so their bodies/responses are intentionally
// loose (not modelled here) -- only the plain `title`/`id` inputs above are validated.

/** A registered hardware key as the settings list (`GET /api/hardwarekey`) consumes it. */
export type HardwarekeyListItem = {
  _id: string
  title: string | null
  credentials: string[]
}
export type HardwarekeyListResponse = Ok<HardwarekeyListItem[]>
