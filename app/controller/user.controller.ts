import { execSync } from 'node:child_process'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import bcrypt from 'bcryptjs'
import { SignJWT } from 'jose'
import Speakeasy from 'speakeasy'
import QRCode from 'qrcode'

import pkg from '../../package.json' with { type: 'json' }
import User from '../model/user.model.ts'
import Hardwarekey from '../model/hardwarekey.model.ts'
import Contact from '../model/contact.model.ts'
import Email from '../model/email.model.ts'
import Message from '../model/message.model.ts'
import Setting from '../model/setting.model.ts'
import * as telnyxHelper from '../helper/telnyx.helper.ts'
import * as twilioHelper from '../helper/twilio.helper.ts'
import { env } from '../../config/env.ts'

import { factory } from '../factory.ts'
import type { Env, JsonCtx, QueryCtx } from '../factory.ts'
import { auth } from '../middleware/auth.hono.ts'
import { jsonBody, queryParams } from '../validate.ts'
import { ack } from '../util/respond.hono.ts'
import type { Ok, StringBoolean } from '../../shared/api-contracts.ts'
import type { HardwarekeyListItem } from '../../shared/contracts/hardwarekey.ts'
import {
  loginBody, type LoginRequest,
  registerBody, type RegisterRequest,
  otpVerifyBody, type OtpVerifyRequest,
  directoryNameQuery, type DirectoryNameQuery,
  updateUsernameBody, type UpdateUsernameRequest,
  updatePasswordBody, type UpdatePasswordRequest,
  passwordBody, type PasswordRequest,
  saveMfaBody, type SaveMfaRequest,
  type UserData, type LoginResponse, type OtpVerifyResponse, type MfaQrResponse,
  type CheckDirectoryName, type CheckDirectoryNameResponse, type UpdateAvailableResponse,
} from '../../shared/contracts/auth.ts'

const saltRounds = 10
// HS256 algo expects a key size of >= 256 Bits == 32 chars.
// Uint8Array.BYTES_PER_ELEMENT === 1 , each character becomes a single element in byte array, so each char is 8 bits.
// 256 bits / 8 bits per char == 32 chars
const joseSecret = new TextEncoder().encode(env.COOKIE_KEY)
const remoteVersionURL = 'https://api.github.com/repos/paschun/VoIP/commits?per_page=1'

/** The user fields echoed to the client (also persisted in the `userdata` cookie). */
const userDataResponseGen = (u: {
  _id: { toString(): string }; name?: string | null; token?: string | null; mfa?: StringBoolean | null
}): UserData => ({ _id: u._id.toString(), name: u.name ?? '', token: u.token ?? '', mfa: u.mfa ?? 'false' })

/** Running build id: the short git commit, falling back to `package.json`'s version. */
const currentVersion = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: import.meta.dirname }).toString().trim()
  } catch (err) {
    console.error(err)
    return pkg.version
  }
})()

/** Authenticate; on success mint a 30d JWT and report whether a hardware-key or OTP second factor is still required. */
async function authenticate(c: JsonCtx<LoginRequest>) {
  const { name: rawName, password } = c.req.valid('json')
  const name = rawName.toLowerCase()
  const user = await User.findOne({ name: { $eq: name } })
  if (!user || !bcrypt.compareSync(password, user.password ?? '')) {
    throw new HTTPException(401, { message: 'Unauthorized Access!' })
  }

  // https://github.com/panva/jose/blob/HEAD/docs/jwt/sign/classes/SignJWT.md
  // HS256 requires a 256-bit (32-byte) secret (symmetric encryption)
  const token = await new SignJWT({ id: user.id, name: user.name })
    .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('30d').sign(joseSecret)
  // 3 parts (b64 encoded) : header.payload.signature
  // decoded JOSE (JSON Object Signing and Encryption) header: { "alg": "HS256" }
  // decoded payload:{ "id": "6322cb0813d8a71034f6efcc", "name": "example", "exp": 1782625311 }
  // signature: MAC of the encoded JOSE Header and encoded JWS Payload with the HMAC SHA-256 algorithm and base64url encoding the HMAC value

  user.token = token
  await user.save()

  let status: LoginResponse['status'] = 'true'
  let hardwarekey: LoginResponse['hardwarekey'] = false
  let mfa = false
  if (user.hardwarekey === 'true') {
    status = 'hardwarekey'
    mfa = user.mfa === 'true'
    // todo: dont type cast here
    hardwarekey = await Hardwarekey.find({ user: user._id, registrationComplete: true }) as unknown as HardwarekeyListItem[]
  } else if (user.mfa === 'true') {
    status = 'mfa'
    mfa = true
  }
  return c.json({
    status, message: 'Successfully logged in.', data: userDataResponseGen(user), token, hardwarekey, mfa,
  } satisfies LoginResponse)
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

/** Verify a TOTP code during the OTP login step. */
async function verifyOtp(c: JsonCtx<OtpVerifyRequest>) {
  const { user: userId, verification_code } = c.req.valid('json')
  const user = await User.findOne({ _id: { $eq: userId } })
  if (!user) throw new HTTPException(404, { message: 'User not found!' })
  const ok = Speakeasy.totp.verify({ secret: user.mfa_token ?? '', encoding: 'base32', token: verification_code })
  if (!ok) throw new HTTPException(400, { message: 'Please enter valid verification code!' })
  return c.json({ status: 'true', data: [], message: 'verified successfully!' } satisfies OtpVerifyResponse)
}

/** Whether self-signup is enabled (the `SIGNUPS` env flag, `'on'`/`'off'`). */
function readSignupOption(c: Context<Env>) {
  return c.json({ data: env.SIGNUPS } satisfies Ok<boolean>, 200)
}

/** The running build id (see `currentVersion`). */
function readVersion(c: Context<Env>) {
  return c.json({ data: currentVersion } satisfies Ok<string>, 200)
}

/** Whether a newer build than the running one exists upstream; any lookup failure reports `'false'`. */
async function readUpdateAvailable(c: Context<Env>) {
  let update: StringBoolean = 'false'
  try {
    const response = await fetch(remoteVersionURL)
    if (response.ok) {
      // TODO: zod-validate the GitHub "commits" API schema rather than trusting the shape.
      const commits = await response.json() as Array<{ sha: string }>
      const remoteVersion = commits[0]?.sha.slice(0, 7)
      update = currentVersion !== remoteVersion ? 'true' : 'false'
    }
  } catch (err) {
    console.error(err)
  }
  return c.json({ update } satisfies UpdateAvailableResponse)
}

/** Compare the caller's app-directory against the configured `APPDIRECTORY`, reporting match/mismatch/unconfigured. */
async function matchDirectoryName(c: QueryCtx<DirectoryNameQuery>) {
  const dirname = c.req.valid('query').name
  const dir = env.APPDIRECTORY
  let result: CheckDirectoryName
  if (dir) {
    if (!dirname) result = { status: 'no-name', dir }
    else result = { status: dir === dirname ? 'true' : 'false', dir }
  } else if (dirname === 'voip') {
    result = { status: 'nodir', dir: 'voip' }
  } else if (dirname) {
    result = { status: 'false', dir }
  } else {
    result = { status: 'no-name', dir: 'voip' }
  }
  return c.json({ data: result } satisfies CheckDirectoryNameResponse, 200)
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
  return c.json({ data: userDataResponseGen(user) } satisfies Ok<UserData>, 200)
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
  return c.json({ data: userDataResponseGen(user) } satisfies Ok<UserData>, 200)
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
  return c.json({ data: [] } satisfies Ok<never[]>, 200)
}

/** The caller's user record. */
async function readUser(c: Context<Env>) {
  const user = await User.findOne({ _id: { $eq: c.get('user').id } })
  if (!user) throw new HTTPException(404, { message: 'User not found!' })
  return c.json({ data: userDataResponseGen(user) } satisfies Ok<UserData>, 200)
}

/** Toggle MFA: mint a secret+QR (`qr:'true'`), verify the code to enable (`qr:'false'`), or disable (`status:'false'`). */
async function saveMfaSetting(c: JsonCtx<SaveMfaRequest>) {
  const authUser = c.get('user')
  const body = c.req.valid('json')
  const user = await User.findOne({ _id: { $eq: authUser.id } })
  if (!user) throw new HTTPException(404, { message: 'User not found!' })

  // todo: bah, stringbools!!
  if (body.status === 'true') {
    if (body.qr === 'true') {
      const secretCode = Speakeasy.generateSecret({ name: `Operation Privacy (${authUser.name})` })
      user.mfa_token = secretCode.base32
      await user.save()
      const image = await QRCode.toDataURL(secretCode.otpauth_url ?? '')
      return c.json({ image, secret: secretCode.base32 } satisfies MfaQrResponse)
    }
    const ok = Speakeasy.totp.verify({ secret: user.mfa_token ?? '', encoding: 'base32', token: body.code ?? '' })
    if (!ok) throw new HTTPException(400, { message: 'Please enter valid verification code!' })
    user.mfa = 'true'
  } else {
    user.mfa = body.status as StringBoolean
  }
  await user.save()
  return c.json({ data: userDataResponseGen(user) } satisfies Ok<UserData>, 200)
}

/** Best-effort teardown of every record + provider resource owned by `userid`, then the user itself. */
async function deleteAllAccountData(userid: string) {
  await Contact.deleteMany({ user: userid })
  await Email.deleteMany({ user: userid })
  await Message.deleteMany({ user: userid })
  const settings = await Setting.find({ user: { $eq: userid } })
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
    } catch { /* best-effort: ignore provider failures so one bad credential can't block account deletion */ }
  }
  await Setting.deleteMany({ user: userid })
  await User.deleteOne({ _id: userid })
}

export const login = factory.createHandlers(jsonBody(loginBody), authenticate)
export const register = factory.createHandlers(jsonBody(registerBody), createUser)
export const otpVerify = factory.createHandlers(jsonBody(otpVerifyBody), verifyOtp)
export const signupEnabled = factory.createHandlers(readSignupOption)
export const getVersion = factory.createHandlers(readVersion)
export const getUpdateAvailable = factory.createHandlers(readUpdateAvailable)
export const getDirectoryName = factory.createHandlers(queryParams(directoryNameQuery), matchDirectoryName)
export const updateUsername = factory.createHandlers(auth, jsonBody(updateUsernameBody), changeUsername)
export const updatePassword = factory.createHandlers(auth, jsonBody(updatePasswordBody), changePassword)
export const passwordVerify = factory.createHandlers(auth, jsonBody(passwordBody), verifyPassword)
export const deleteAccount = factory.createHandlers(auth, jsonBody(passwordBody), removeAccount)
export const getCurrentUser = factory.createHandlers(auth, readUser)
export const saveMfa = factory.createHandlers(auth, jsonBody(saveMfaBody), saveMfaSetting)
