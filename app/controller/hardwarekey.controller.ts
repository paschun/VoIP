import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import crypto from 'node:crypto'
import HardwareKey from '../model/hardwarekey.model.ts'
import User from '../model/user.model.ts'
import { factory } from '../factory.ts'
import type { Env, JsonCtx, ParamCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody, pathParams } from '../validate.ts'
import { ack } from '../util/respond.hono.ts'
import type { Ok } from '../../shared/api-contracts.ts'
import {
  registerKeyBody, type RegisterKeyRequest,
  verifyBody, type VerifyRequest,
  loginKeyBody, type LoginKeyRequest,
  registrationChallengeBody, type RegistrationChallengeRequest,
  authVerifyBody, type AuthVerifyRequest,
  deleteKeyParams, type DeleteKeyParams,
} from '../../shared/contracts/hardwarekey.ts'

// Login-ceremony state, keyed by user id (login has no JWT yet, so it can't key off an authed user). In-memory: a
// restart drops an in-flight login, which just means the user retries -- acceptable. Registration is stateless *for
// now*: its three steps are all authed, so the in-flight key is found by the user's single `registrationComplete: false`
// doc -- but only because nothing per-ceremony has to survive between steps yet. Finishing the TODO reintroduces that
// state (the single-use challenge) -- persisted on the pending doc, not in this Map, so it stays restart-safe.
//
// TODO(security, deferred -- known and intentional): the challenge is issued but NEVER cryptographically verified --
// verify*() doesn't check the authenticator's signature / clientDataJSON against the issued challenge, public key, and
// signature counter. Until it does, a hardware key is an identity hint, not a real second factor.
//
// The fix (don't hand-roll the crypto -- use `@simplewebauthn/server`):
//  - persist a single-use challenge (this is the per-ceremony state to re-add): on the pending doc for registration,
//    here/a TTL store for login;
//  - store the credential's COSE `publicKey` + `signCount` on the key doc at registration (verifyRegistrationResponse);
//  - at login, verify the assertion signature against them and that signCount increased (verifyAuthenticationResponse);
//  - needs real `rpID`/`origin`/`rpName` config per environment -- a mismatch silently rejects every ceremony.
// This re-expands the verify payloads back to the full `credential.toJSON()` (we currently send only id/userHandle).
// 
// schema: https://simplewebauthn.dev/docs/packages/server#additional-data-structures
// what is the difference between ._id and .credentialId in the schema? their schema calls ._id == cred_id . so what is our cred_id
type Ceremony = { title: string; user: string; challenge?: string }
const ceremonies = new Map<string, Ceremony>()

type CredentialDescriptor = { type: 'public-key'; id: string }
// These mirror the WebAuthn JSON wire types (`PublicKeyCredentialCreationOptionsJSON` / `...RequestOptionsJSON`). The
// backend has no DOM lib, so they're hand-rolled here; the frontend feeds them straight to
// `PublicKeyCredential.parse{Creation,Request}OptionsFromJSON`, which won't compile if this shape drifts from the spec.
interface RegistrationPublicKey {
  challenge: string
  rp: { name: string; id?: string }
  user: { id: string; name: string; displayName: string }
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>
  attestation: string
  authenticatorSelection?: { userVerification?: 'required' }
}
interface AuthenticationPublicKey {
  challenge: string
  allowCredentials: CredentialDescriptor[]
}

const randomId = () => crypto.getRandomValues(new Uint8Array(32)).toBase64({ alphabet: 'base64url', omitPadding: true })

// Status codes: 409 for a duplicate title; 403 (`Access denied!`) when a registration step is called out of order (no
// pending key for the user); 401 (`Wrong username or password!` / `Something is wrong!`) for login failures.

/** Begin enrollment: reject a duplicate completed title; (re)seed the user's single pending key. */
async function beginRegistration(c: JsonCtx<RegisterKeyRequest>) {
  const userId = c.get('user').id
  const { title } = c.req.valid('json')
  const completed = await HardwareKey.findOne({ title, user: userId, registrationComplete: true })
  if (completed) throw new HTTPException(409, { message: 'Title already exists!' })

  // A user has one in-flight enrollment at a time; clearing prior pending docs keeps the challenge/verify steps
  // unambiguous -- registration is stateless, so the pending doc itself IS the ceremony.
  await HardwareKey.deleteMany({ user: userId, registrationComplete: false })
  const userHandle = randomId()
  await HardwareKey.create({ title, userHandle, user: userId, registrationComplete: false })
  return c.body(null, 202)
}

/** Build the WebAuthn `create()` challenge (publicKey) plus the user's existing keys (to exclude). */
async function buildRegistrationChallenge(c: JsonCtx<RegistrationChallengeRequest>) {
  const userId = c.get('user').id
  const { options } = c.req.valid('json')

  const keyUser = await HardwareKey.findOne({ user: userId, registrationComplete: false })
  if (!keyUser) throw new HTTPException(403, { message: 'Access denied!' })
  const userData = await User.findOne({ _id: userId })

  // Challenge isn't persisted: it's never verified yet (see TODO). When it becomes load-bearing, store it on `keyUser`.
  const publicKey: RegistrationPublicKey = {
    challenge: randomId(),
    rp: { name: 'Operation Privacy' },
    user: { id: keyUser.userHandle, name: userData?.name ?? '', displayName: userData?.name ?? '' },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    attestation: 'direct',
  }

  // todo: why are these options in here if they are never sent by the client?
  if (options) {
    publicKey.authenticatorSelection ??= {}
    if (options.attestation) publicKey.attestation = options.attestation
    if (options.rpId) publicKey.rp.id = options.rpId
    if (options.uv) publicKey.authenticatorSelection.userVerification = 'required'
  }

  // Only the credential ids are needed (to exclude already-registered authenticators); don't leak handle/aaguid.
  const completed = await HardwareKey.find({ user: userId, registrationComplete: true })
  const hardwareKeys = completed.map(({ credentialId }) => ({ credentialId }))
  return c.json({ data: { publicKey, hardwareKeys } } satisfies Ok, 202)
}

/** Finish enrollment: store the new credential and mark the key registration-complete. */
async function verifyRegistration(c: JsonCtx<VerifyRequest>) {
  const userId = c.get('user').id
  const payload = c.req.valid('json')
  const keyUser = await HardwareKey.findOne({ user: userId, registrationComplete: false })
  if (!keyUser) throw new HTTPException(403, { message: 'Access denied!' })

  keyUser.credentialId = payload.id
  keyUser.registrationComplete = true
  keyUser.aaguid = payload.aaguid
  await keyUser.save()
  return c.body(null, 201)
}

/** Begin login: build the WebAuthn `get()` assertion challenge for the named key. */
async function buildAuthenticationChallenge(c: JsonCtx<LoginKeyRequest>) {
  const { title, userId } = c.req.valid('json')
  const keyUser = await HardwareKey.findOne({ title, user: userId })
  if (!keyUser) throw new HTTPException(401, { message: 'Wrong username or password!' })

  const challenge = randomId()
  ceremonies.set(userId, { title, user: userId, challenge })
  const publicKey: AuthenticationPublicKey = {
    challenge,
    allowCredentials: keyUser.credentialId ? [{ type: 'public-key', id: keyUser.credentialId }] : [],
  }
  return c.json({ data: { publicKey } } satisfies Ok, 202)
}

/** Finish login: accept the assertion if a ceremony is in flight for this user or the user handle resolves to a key. */
async function verifyAuthentication(c: JsonCtx<AuthVerifyRequest>) {
  const { userId, response } = c.req.valid('json')
  const ceremony = ceremonies.get(userId)
  const key = await getUserByUserHandle(response.userHandle ?? undefined, userId)
  if (!ceremony && !key) throw new HTTPException(401, { message: 'Something is wrong!' })
  ceremonies.delete(userId)
  return ack(c)
}

/** List the caller's completed hardware keys. */
async function getKeys(c: Context<Env>) {
  const keys = await HardwareKey.find({ user: c.get('user').id, registrationComplete: true })
  // Project to just what the settings list shows -- don't leak userHandle/aaguid/internal fields.
  const data = keys.map((k) => ({ _id: k._id.toString(), title: k.title }))
  return c.json({ data } satisfies Ok, 200)
}

/** Delete one of the caller's keys (owner-scoped, so a non-owned id can't be removed); idempotent. */
async function deleteRecord(c: ParamCtx<DeleteKeyParams>) {
  const userId = c.get('user').id
  const key = await HardwareKey.findOne({ _id: c.req.valid('param').id, user: userId })
  if (key) await key.deleteOne()
  return ack(c)
}

/** Resolve a WebAuthn user handle to the caller's matching key (owner-scoped); `null` when absent or not found. */
async function getUserByUserHandle(userHandle: string | undefined, user: string) {
  if (!userHandle || !user) return null
  return HardwareKey.findOne({ user, userHandle })
}

export const registrationBegin = factory.createHandlers(auth, jsonBody(registerKeyBody), beginRegistration)
export const registrationChallenge = factory.createHandlers(auth, jsonBody(registrationChallengeBody), buildRegistrationChallenge)
export const registrationVerify = factory.createHandlers(auth, jsonBody(verifyBody), verifyRegistration)
export const authenticationChallenge = factory.createHandlers(jsonBody(loginKeyBody), buildAuthenticationChallenge)
export const authenticationVerify = factory.createHandlers(jsonBody(authVerifyBody), verifyAuthentication)
export const listKeys = factory.createHandlers(auth, getKeys)
export const deleteKey = factory.createHandlers(auth, pathParams(deleteKeyParams), deleteRecord)
