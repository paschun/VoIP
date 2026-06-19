import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import crypto from 'node:crypto'
import Hardwarekey from '../model/hardwarekey.model.ts'
import User from '../model/user.model.ts'
import Handel from '../model/handel.model.ts'
import { factory } from '../factory.ts'
import type { Env, JsonCtx, ParamCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody, pathParams } from '../validate.ts'
import type { Ok } from '../../shared/api-contracts.ts'
import {
  registerKeyBody, type RegisterKeyRequest,
  verifyBody, type VerifyRequest,
  loginKeyBody, type LoginKeyRequest,
  deleteKeyParams, type DeleteKeyParams,
  type HardwarekeyListItem,
} from '../../shared/contracts/hardwarekey.ts'

// TODO(security): the WebAuthn ceremony's cross-request state (title/user/challenge/id) lives in this single
// module-global, shared by ALL users and valid only within one process -- concurrent enrolments/logins race and
// clobber each other, and it breaks entirely under multiple workers. This is a faithful port of the original behavior;
// the real fix is a short-lived, per-user challenge store (keyed by user id) replacing this global.
let sessData: Record<string, any> = {}

const randomId = () => crypto.getRandomValues(new Uint8Array(32)).toBase64({ alphabet: 'base64url', omitPadding: true })

// Status codes: 409 for a duplicate title; 403 (`Access denied!`) when a registration step is called out of order or
// after its ceremony state expired; 401 (`Wrong username or password!` / `Something is wrong!`) for login failures.

/** Begin enrolment: reject a duplicate completed title, (re)seed the pending key + ceremony state. */
async function beginRegistration(c: JsonCtx<RegisterKeyRequest>) {
  const userId = c.get('user').id
  const title = c.req.valid('json').title
  const completed = await Hardwarekey.findOne({ title, user: userId, id: sessData.id })
  if (completed && completed.registrationComplete) throw new HTTPException(409, { message: 'Title already exists!' })

  await Hardwarekey.deleteOne({ title, user: userId })
  const id = randomId()
  await addUser(title, { title, id, credentials: [] }, userId)
  sessData.title = title
  sessData.user = userId
  sessData.id = id
  return c.json({ status: 'startFIDOEnrolment' })
}

/** Build the WebAuthn `create()` challenge (publicKey) plus the user's existing keys (to exclude). */
async function buildRegistrationChallenge(c: Context<Env>) {
  if (!sessData.title) throw new HTTPException(403, { message: 'Access denied!' })
  const keyUser = await getUser(sessData.title, sessData.user)
  if (!keyUser) throw new HTTPException(403, { message: 'Access denied!' })
  const userData = await User.findOne({ _id: sessData.user })

  sessData.challenge = randomId()
  const publicKey: Record<string, any> = {
    challenge: sessData.challenge,
    rp: { name: 'Operation Privacy' },
    user: { id: keyUser.id, name: userData?.email, displayName: userData?.name },
    pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
    attestation: 'direct',
  }

  const options = (await readJsonBody(c)).options
  if (options) {
    publicKey.authenticatorSelection ??= {}
    if (options.attestation) publicKey.attestation = options.attestation
    if (options.rpId) publicKey.rp.id = options.rpId
    if (options.uv) publicKey.authenticatorSelection.userVerification = 'required'
  }
  if (sessData.rk) {
    publicKey.authenticatorSelection ??= {}
    publicKey.authenticatorSelection.requireResidentKey = true
  }

  const hardwarekey = await Hardwarekey.find({ user: c.get('user').id, registrationComplete: true })
  return c.json({ publicKey, hardwarekey })
}

/** Finish enrolment: store the new credential, mark the key (and the user) registration-complete. */
async function verifyRegistration(c: JsonCtx<VerifyRequest>) {
  const payload = c.req.valid('json')
  if (!sessData.title) throw new HTTPException(403, { message: 'Access denied!' })
  const keyUser = await getUser(sessData.title, sessData.user)
  if (!keyUser) throw new HTTPException(403, { message: 'Access denied!' })

  keyUser.credentials.push(payload.id)
  keyUser.registrationComplete = true
  keyUser.aaguid = payload.aaguid
  await keyUser.save()
  await User.updateOne({ _id: sessData.user }, { hardwarekey: 'true' })
  sessData = {}
  return c.json({ status: 'ok' })
}

/** Begin login: build the WebAuthn `get()` assertion challenge for the named key. */
async function buildAuthenticationChallenge(c: JsonCtx<LoginKeyRequest>) {
  const { title, user } = c.req.valid('json')
  if (!(await userExists(title, user))) throw new HTTPException(401, { message: 'Wrong username or password!' })

  sessData.title = title
  sessData.user = user
  sessData.challenge = randomId()
  const keyUser = await getUser(title, user)
  if (!keyUser) throw new HTTPException(401, { message: 'Wrong username or password!' })

  const publicKey: Record<string, any> = {
    challenge: sessData.challenge,
    status: 'ok',
    allowCredentials: keyUser.credentials.map((credId) => ({ type: 'public-key', id: credId })),
  }
  if (sessData.rk) delete publicKey.allowCredentials
  if (sessData.uv) publicKey.userVerification = 'required'
  return c.json(publicKey)
}

/** Finish login: accept the assertion if the ceremony state or the resolved user handle checks out. */
async function verifyAuthentication(c: Context<Env>) {
  const payload = await readJsonBody(c)
  const checkHandel = await getUserByUserHandle(payload.response?.userHandle, sessData.user)
  if (!sessData.title && !checkHandel) throw new HTTPException(401, { message: 'Something is wrong!' })
  sessData = {}
  return c.json({ status: 'true' })
}

/** List the caller's completed hardware keys. */
async function getKeys(c: Context<Env>) {
  const keys = await Hardwarekey.find({ user: c.get('user').id, registrationComplete: true })
  const data = keys.map((d) => d.toObject({ flattenObjectIds: true }))
  return c.json({ data } satisfies Ok, 200)
}

/** Delete one of the caller's keys (owner-scoped, so a non-owned id can't be removed); idempotent. */
async function deleteRecord(c: ParamCtx<DeleteKeyParams>) {
  const userId = c.get('user').id
  const key = await Hardwarekey.findOne({ _id: c.req.valid('param').id, user: userId })
  if (key) {
    await Handel.deleteOne({ username: key.title ?? '', user: userId })
    await key.deleteOne()
  }
  const remaining = await Hardwarekey.findOne({ user: userId, registrationComplete: true })
  if (!remaining) await User.updateOne({ _id: userId }, { hardwarekey: 'false' })
  return c.json({ data: [] } satisfies Ok<HardwarekeyListItem[]>, 200)
}

/** Parse a JSON body, tolerating an empty/absent one (the ceremony's `register`/`login` posts vary). */
async function readJsonBody(c: Context<Env>): Promise<Record<string, any>> {
  return c.req.json<Record<string, any>>().catch(() => ({}))
}

/** Resolve the Handel user-handle row to its Hardwarekey, scoped by `userwhere`; `false`/`{}` when not found. */
async function getUserByUserHandle(userHandle: string | undefined, user: string) {
  try {
    const handel = await Handel.findOne({ id: userHandle ?? '' })
    if (!handel) return false
    const key = await Hardwarekey.findOne({ user, title: handel.username ?? '' })
    if (!key) throw new Error(`Username "${handel.username}" does not exist!`)
    return key
  } catch {
    return {}
  }
}

/** Create the Handel handle row + the pending Hardwarekey for a new enrolment. */
async function addUser(title: string, struct: Record<string, any>, user: string) {
  const handel = await Handel.create({ id: struct.id, username: title, user })
  sessData.handelId = handel._id
  await Hardwarekey.create({ ...struct, user })
}

/** True if a key with this title already exists for the user. */
async function userExists(title: string, user: string) {
  return !!(await Hardwarekey.findOne({ title, user }))
}

/** The user's key by title (hydrated doc, or `null`). */
async function getUser(title: string, user: string) {
  return Hardwarekey.findOne({ title, user })
}

export const registrationBegin = factory.createHandlers(auth, jsonBody(registerKeyBody), beginRegistration)
export const registrationChallenge = factory.createHandlers(auth, buildRegistrationChallenge)
export const registrationVerify = factory.createHandlers(auth, jsonBody(verifyBody), verifyRegistration)
export const authenticationChallenge = factory.createHandlers(jsonBody(loginKeyBody), buildAuthenticationChallenge)
export const authenticationVerify = factory.createHandlers(verifyAuthentication)
export const listKeys = factory.createHandlers(auth, getKeys)
export const deleteKey = factory.createHandlers(auth, pathParams(deleteKeyParams), deleteRecord)
