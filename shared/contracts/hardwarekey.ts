import { z } from 'zod'

/** `POST /registration/begin` body: the user-chosen label for the new key. */
export const registerKeyBody = z.object({ title: z.string().trim().min(1) })
export type RegisterKeyRequest = z.infer<typeof registerKeyBody>

/** `POST /registration/verify` body: the new credential id + authenticator AAGUID from the WebAuthn attestation. */
export const verifyBody = z.object({ id: z.string(), aaguid: z.string() })
export type VerifyRequest = z.infer<typeof verifyBody>

/** `POST /authentication/challenge` body: which stored key (by owner id + title) to build an assertion challenge for. */
export const loginKeyBody = z.object({ userId: z.string(), title: z.string() })
export type LoginKeyRequest = z.infer<typeof loginKeyBody>

/** `POST /registration/challenge` body: optional WebAuthn knobs (the client usually sends `{}`). */
export const registrationChallengeBody = z.object({
  options: z.object({
    attestation: z.string().optional(),
    rpId: z.string().optional(),
    uv: z.boolean().optional(),
  }).optional(),
})
export type RegistrationChallengeRequest = z.infer<typeof registrationChallengeBody>

// `POST /authentication/verify` body. The server only needs the owner id it scopes by + the assertion's `userHandle`
// (to resolve which key), so that's all the client sends and all we validate. TODO(security): real assertion
// verification will additionally need the signature/clientDataJSON/authenticatorData sent and checked here.
export const authVerifyBody = z.object({
  userId: z.string().min(1),
  response: z.object({ userHandle: z.string().nullish() }),
})
export type AuthVerifyRequest = z.infer<typeof authVerifyBody>

/** `DELETE /:id` path param: the hardware-key document id to remove. */
export const deleteKeyParams = z.object({ id: z.string() })
export type DeleteKeyParams = z.infer<typeof deleteKeyParams>

// The WebAuthn ceremony endpoints (registration begin/challenge/verify, authentication challenge/verify) exchange
// authenticator-shaped payloads straight with the browser credential API, so their bodies/responses are intentionally
// loose (not modelled here) -- only the plain `title`/`id` inputs above are validated.
