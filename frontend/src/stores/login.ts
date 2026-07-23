import { ref } from 'vue'
import type { InferRequestType, InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { defineStore } from 'pinia'
import { client, request } from '@/core/rpc.client.ts'
import { useUserStore, type UserData } from '@/stores/user.ts'

type LoginRequest = InferRequestType<typeof client.api.auth.login.$post>['json']

/** A registered hardware key offered as a second factor at login. */
export type HardwareKey = InferResponseType<typeof client.api.auth.login.$post, SuccessStatusCode>['data']['hardwareKeys'][number]

/** The login flow: holds the password-authenticated session while a second factor is verified, then completes sign-in
 * through the user store. Not persisted -- a refresh mid-flow restarts the login. */
export const useLoginStore = defineStore('login', () => {
  const userStore = useUserStore()

  /** The session waiting on a second factor; set by `passwordLogin`, consumed by a verify* action. */
  const pending = ref<{ user: UserData; token: string } | null>(null)

  /** Second factors available to the pending session. */
  const hardwareKeys = ref<HardwareKey[]>([])
  const totpAvailable = ref(false)

  function pendingSession() {
    if (!pending.value) throw new Error('No login is pending second-factor verification')
    return pending.value
  }

  /** Drop the pending session and its second-factor options (on completion or cancel). */
  function reset() {
    pending.value = null
    hardwareKeys.value = []
    totpAvailable.value = false
  }

  function completeLogin(user: UserData, token: string) {
    userStore.login(user, token)
    reset()
  }

  /** Password step. Signs in directly when no second factor is registered; otherwise parks the session in `pending`. */
  async function passwordLogin(json: LoginRequest) {
    const { data } = await request(client.api.auth.login.$post({ json }))
    const { user, token, hardwareKeys: keys } = data
    hardwareKeys.value = keys
    totpAvailable.value = user.totp
    if (keys.length || user.totp) pending.value = { user, token }
    else completeLogin(user, token)
  }

  /** Ask the server for a WebAuthn assertion challenge for the pending user's key. */
  async function hardwareKeyChallenge({ title }: HardwareKey) {
    const { user } = pendingSession()
    const { data } = await request(
      client.api.hardwarekey.authentication.challenge.$post({ json: { userId: user._id, title: title ?? '' } }),
    )
    return data.publicKey
  }

  /** Complete the hardware-key factor with the assertion's user handle, then sign in. */
  async function verifyHardwareKey(userHandle: string | null | undefined) {
    const { user, token } = pendingSession()
    await request(client.api.hardwarekey.authentication.verify.$post({ json: { userId: user._id, response: { userHandle } } }))
    completeLogin(user, token)
  }

  /** Complete the TOTP factor, then sign in. */
  async function verifyTotp(code: string) {
    const { user, token } = pendingSession()
    await request(client.api.auth.totp.verify.$post({ json: { userId: user._id, code } }))
    completeLogin(user, token)
  }

  return { hardwareKeys, totpAvailable, passwordLogin, hardwareKeyChallenge, verifyHardwareKey, verifyTotp, reset }
})
