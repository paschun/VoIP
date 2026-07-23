import { execSync } from 'node:child_process'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Octokit, RequestError } from 'octokit'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import QRCode from 'qrcode'
import Speakeasy from 'speakeasy'
import pkg from '../../package.json' with { type: 'json' }
import type { Ok } from '../contracts/envelope.ts'
import {
  loginBody,
  type LoginRequest,
  registerBody,
  type RegisterRequest,
  totpVerifyBody,
  type TotpVerifyRequest,
  updateUsernameBody,
  type UpdateUsernameRequest,
  updatePasswordBody,
  type UpdatePasswordRequest,
  passwordBody,
  type PasswordRequest,
  enableTotpBody,
  type EnableTotpRequest,
  type UserData,
  type TotpQrInfo,
} from '../contracts/auth.ts'
import { env } from '../core/env.ts'
import { factory } from '../core/factory.ts'
import type { Env, JsonCtx } from '../core/factory.ts'
import { signToken } from '../middleware/auth.ts'
import { ack } from '../helper/respond.helper.ts'
import * as telnyxHelper from '../helper/telnyx.helper.ts'
import * as twilioHelper from '../helper/twilio.helper.ts'
import { auth } from '../middleware/auth.ts'
import { jsonBody } from '../middleware/validate.ts'
import Contact from '../model/contact.model.ts'
import Email from '../model/email.model.ts'
import HardwareKey from '../model/hardwarekey.model.ts'
import { Message } from '../model/message.model.ts'
import Setting from '../model/setting.model.ts'
import User from '../model/user.model.ts'

const saltRounds = 10
const upstreamRepo = { owner: 'paschun', repo: 'VoIP' } as const
// github has abandoned octokit : https://github.com/octokit/openapi-types.ts/issues/494#issuecomment-4185069938
const octokit = new Octokit()

/** Only the field we need off the GitHub "list commits" response; extra keys are ignored.
 * Mandates an array of objects that all have the same shape: `{ sha: "a" }`, but there is at least one element in the arr.
 * https://github.com/colinhacks/zod/blob/v4.4.3/packages/zod/src/v4/core/regexes.ts#L173
 * https://github.com/colinhacks/zod/blob/v4.4.3/packages/zod/src/v4/classic/schemas.ts#L948
 */
const commitsSchema = z.tuple([z.object({ sha: z.hash('sha1') })]).rest(z.object({ sha: z.hash('sha1') }))

/** Project a user doc onto the client-facing {@link UserData}: strips secrets; `totp` = secret present.
 * 
 * authenticate (login) -- needs all three
 * changeUsername -- needs all three
 * readUser (/me) -- Mfa.vue reads only .totp
 */
const toUserData = (u: InstanceType<typeof User>): UserData => ({ _id: u._id.toString(), name: u.name, totp: Boolean(u.totpSecret) })

/** Running build id: the short git commit, falling back to `package.json`'s version. */
const currentVersion = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: import.meta.dirname })
      .toString()
      .trim()
  } catch (err) {
    console.error(err)
    return pkg.version
  }
})()

/** Authenticate; on success mint a 30d JWT and report which second factor (if any) the client must still clear. */
async function authenticate(c: JsonCtx<LoginRequest>) {
  const { name: rawName, password } = c.req.valid('json')
  const name = rawName.toLowerCase()
  const user = await User.findOne({ name: { $eq: name } })
  if (!user || !bcrypt.compareSync(password, user.password ?? '')) {
    throw new HTTPException(401, { message: 'Unauthorized Access!' })
  }

  // Auth is stateless (the middleware verifies the header JWT token), so the minted token isn't persisted -- it's
  // returned once here for the client to hold.
  const token = await signToken(user._id.toString(), user.name)

  // Report the available second factors; the client picks which to use (TOTP availability is `user.totp`).
  const keys = await HardwareKey.find({ user: user._id, registrationComplete: true })
  const hardwareKeys = keys.map((k) => ({ _id: k._id.toString(), title: k.title ?? null }))
  const data = { user: toUserData(user), token, hardwareKeys }
  return c.json({ data } satisfies Ok, 200)
}

/** Create an account; reject a duplicate username. */
async function createUser(c: JsonCtx<RegisterRequest>) {
  const valid = c.req.valid('json')
  // todo: do tolowercase in zod validator
  const name = valid.name.toLowerCase()
  const { password } = valid

  if (await User.findOne({ name: { $eq: name } })) {
    throw new HTTPException(409, { message: 'Username already exists!' })
  }

  const hash = bcrypt.hashSync(password, saltRounds)
  await User.create({ name, password: hash })
  // No body: registration isn't authentication (no token issued), so the client just redirects to login.
  return c.body(null, 201)
}

/** Verify a TOTP code during the login second-factor step. */
async function verifyTotp(c: JsonCtx<TotpVerifyRequest>) {
  const { userId, code } = c.req.valid('json')
  const user = await User.findOne({ _id: { $eq: userId } })
  if (!user) throw new HTTPException(404, { message: 'User not found!' })
  const ok = Speakeasy.totp.verify({ secret: user.totpSecret ?? '', encoding: 'base32', token: code })
  if (!ok) throw new HTTPException(400, { message: 'Please enter valid verification code!' })
  return ack(c)
}

/** Whether self-signup is enabled (the `SIGNUPS` env flag, `'on'`/`'off'`). */
function readSignupOption(c: Context<Env>) {
  return c.json({ data: env.SIGNUPS } satisfies Ok<boolean>, 200)
}

/** The running build id (see `currentVersion`). */
function readVersion(c: Context<Env>) {
  return c.json({ data: currentVersion } satisfies Ok<string>, 200)
}

// GitHub's unauthenticated REST limit is 60 req/hr per IP
const DAY_MS = 24 * 60 * 60 * 1000
// `at: 0` is stale forever-ago, so the first read always fetches.
const updateCache = { isUpdateAvailable: false, at: 0 }
/** Latest upstream short commit, or `null` if GitHub is unreachable or returns an unexpected shape. */
async function fetchRemoteVersion() {
  try {
    // https://github.com/octokit/plugin-rest-endpoint-methods.js/blob/main/docs/repos/listCommits.md
    const { data } = await octokit.rest.repos.listCommits({ ...upstreamRepo, per_page: 1 })
    const [latest] = commitsSchema.parse(data)
    // if (!latest) throw
    return latest.sha.slice(0, 7)
  } catch (err) {
    if (err instanceof RequestError || err instanceof z.ZodError) console.error(err)
    else throw err
    return null
  }
}

/** Whether a newer build than the running one exists upstream; the result is cached for a day, and any lookup
 * failure reports `false`. */
async function readUpdateAvailable(c: Context<Env>) {
  if (Date.now() - updateCache.at > DAY_MS) {
    const remoteVersion = await fetchRemoteVersion()
    updateCache.isUpdateAvailable = remoteVersion !== null && currentVersion !== remoteVersion
    updateCache.at = Date.now()
  }
  return c.json({ data: updateCache.isUpdateAvailable } satisfies Ok<boolean>, 200)
}

/** Rename the caller; reject if the new username is taken by another account. */
async function changeUsername(c: JsonCtx<UpdateUsernameRequest>) {
  // todo: handle if user tries to change username to the same username. I think right now it would return 409 ?
  const userId = c.get('user').id
  const name = c.req.valid('json').name
  if (await User.findOne({ name: { $eq: name }, _id: { $ne: userId } })) {
    throw new HTTPException(409, { message: 'Username already exists!' })
  }
  const user = await User.findOne({ _id: { $eq: userId } })
  if (!user) throw new HTTPException(404, { message: 'User not found!' })
  user.name = name
  await user.save()
  return c.json({ data: toUserData(user) } satisfies Ok<UserData>, 200)
}

/** Change the caller's password after checking the old one. */
async function changePassword(c: JsonCtx<UpdatePasswordRequest>) {
  const { old_password, password } = c.req.valid('json')
  const user = await User.findOne({ _id: { $eq: c.get('user').id } })
  if (!user) throw new HTTPException(404, { message: 'User not found!' })
  if (!bcrypt.compareSync(old_password, user.password ?? '')) {
    throw new HTTPException(400, { message: 'Please enter a valid old password!' })
  }
  user.password = bcrypt.hashSync(password, saltRounds)
  await user.save()
  return ack(c)
}

/** Confirm the caller's password (gate before showing a protected settings menu). */
async function verifyPassword(c: JsonCtx<PasswordRequest>) {
  const user = await User.findOne({ _id: { $eq: c.get('user').id } })
  if (!user) throw new HTTPException(404, { message: 'User not found!' })
  if (!bcrypt.compareSync(c.req.valid('json').password, user.password ?? '')) {
    throw new HTTPException(400, { message: 'please enter valid password!' })
  }
  return ack(c)
}

/** Verify the caller's password, then irreversibly delete the account and all its data. */
async function removeAccount(c: JsonCtx<PasswordRequest>) {
  const userId = c.get('user').id
  const user = await User.findOne({ _id: { $eq: userId } })
  if (!user) throw new HTTPException(404, { message: 'User not found!' })
  if (!bcrypt.compareSync(c.req.valid('json').password, user.password ?? '')) {
    throw new HTTPException(400, { message: 'Please enter a valid password!' })
  }
  await deleteAllAccountData(userId)
  return ack(c)
}

/** The caller's user record. */
async function readUser(c: Context<Env>) {
  const user = await User.findOne({ _id: { $eq: c.get('user').id } })
  if (!user) throw new HTTPException(404, { message: 'User not found!' })
  // only `totp` field is used by caller in Mfa.vue
  return c.json({ data: toUserData(user) } satisfies Ok<UserData>, 200)
}

/** Mint a fresh TOTP secret + QR for enrollment. NOT persisted -- the client passes it back to {@link enableTotp} to confirm. */
async function mintTotpQr(c: Context<Env>) {
  const authUser = c.get('user')
  const secretCode = Speakeasy.generateSecret({ name: `Operation Privacy (${authUser.name})` })
  const image = await QRCode.toDataURL(secretCode.otpauth_url ?? '')
  // 202 Accepted: enrollment is provisional until `enableTotp` verifies a code -- the secret here is never persisted.
  return c.json({ data: { image, secret: secretCode.base32 } } satisfies Ok<TotpQrInfo>, 202)
}

/**
 * Enable TOTP: verify the client-held secret (minted by the QR step) against `code`, then store it.
 * An unverified/abandoned secret never reaches the DB, so presence of `totpSecret` implies TOTP is enabled.
 * We get the secret from the client, but its not a security issue, because if they want to screw up their own account
 * by sending an invalid secret that's fine.
 */
async function enableTotp(c: JsonCtx<EnableTotpRequest>) {
  const { secret, code } = c.req.valid('json')
  const user = await User.findOne({ _id: { $eq: c.get('user').id } })
  if (!user) throw new HTTPException(404, { message: 'User not found!' })
  const ok = Speakeasy.totp.verify({ secret, encoding: 'base32', token: code })
  if (!ok) throw new HTTPException(400, { message: 'Please enter valid verification code!' })
  user.totpSecret = secret
  await user.save()
  // 201 Created: the TOTP credential now exists. No body -- the client refetches state.
  return c.body(null, 201)
}

/** Disable TOTP: clear the stored secret. */
async function disableTotp(c: Context<Env>) {
  const user = await User.findOne({ _id: { $eq: c.get('user').id } })
  if (!user) throw new HTTPException(404, { message: 'User not found!' })
  user.totpSecret = null
  await user.save()
  return ack(c)
}

/** Best-effort teardown of every record + provider resource owned by `userid`, then the user itself. */
async function deleteAllAccountData(userid: string) {
  await Contact.deleteMany({ user: userid })
  await Email.deleteMany({ user: userid })
  await Message.deleteMany({ user: userid })
  const settings = env.DEV ? [] : await Setting.find({ user: { $eq: userid } })
  for (const s of settings) {
    // Destructure first so the truthiness guards narrow these (a doc property's narrowing would reset across `await`).
    const { api_key, sid, sip_id, telnyx_outbound, telnyx_twiml, setting } = s
    const { twilio_sid, twilio_token, app_key, twiml_app } = s
    try {
      if (s.type === 'telnyx') {
        if (api_key && sid) await telnyxHelper.updatePhoneNumber(api_key, sid)
        if (api_key && sip_id) await telnyxHelper.deleteSIPApp(api_key, sip_id)
        if (api_key && telnyx_outbound) await telnyxHelper.deleteOutboundVoice(api_key, telnyx_outbound)
        if (api_key && telnyx_twiml) await telnyxHelper.deleteTexmlApp(api_key, telnyx_twiml)
        if (api_key && sid) await telnyxHelper.emptyMessageProfile(api_key, sid)
        if (api_key && setting) await telnyxHelper.deleteMessageProfile(api_key, setting)
      }
      if (s.type === 'twilio' && twilio_sid && twilio_token) {
        if (app_key) await twilioHelper.removeAPIKey(twilio_sid, twilio_token, app_key)
        if (app_key && twiml_app) await twilioHelper.deleteTwiml(twilio_sid, twilio_token, twiml_app)
        if (app_key && sid) await twilioHelper.unlinkNumber(twilio_sid, twilio_token, sid)
      }
    } catch {
      /* best-effort: ignore provider failures so one bad credential can't block account deletion */
    }
  }
  await Setting.deleteMany({ user: userid })
  await User.deleteOne({ _id: userid })
}

export const login = factory.createHandlers(jsonBody(loginBody), authenticate)
export const register = factory.createHandlers(jsonBody(registerBody), createUser)
export const totpVerify = factory.createHandlers(jsonBody(totpVerifyBody), verifyTotp)
export const signupEnabled = factory.createHandlers(readSignupOption)
export const getVersion = factory.createHandlers(readVersion)
export const getUpdateAvailable = factory.createHandlers(readUpdateAvailable)

export const updateUsername = factory.createHandlers(auth, jsonBody(updateUsernameBody), changeUsername)
export const updatePassword = factory.createHandlers(auth, jsonBody(updatePasswordBody), changePassword)
export const passwordVerify = factory.createHandlers(auth, jsonBody(passwordBody), verifyPassword)
export const deleteAccount = factory.createHandlers(auth, jsonBody(passwordBody), removeAccount)
export const getCurrentUser = factory.createHandlers(auth, readUser)
export const totpQr = factory.createHandlers(auth, mintTotpQr)
export const totpEnable = factory.createHandlers(auth, jsonBody(enableTotpBody), enableTotp)
export const totpDisable = factory.createHandlers(auth, disableTotp)
