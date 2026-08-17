import { ref, watch } from 'vue'
import { useLocalStorage, StorageSerializers } from '@vueuse/core'
import type { InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { defineStore } from 'pinia'
import { authToken as token, sessionActive } from '@/core/auth-token.ts'
import { disablePush } from '@/core/push.ts'
import { client, request } from '@/core/rpc.client.ts'

/** The signed-in user, inferred from the `PATCH /api/auth/username` 200 body (`{ data: UserData }`). */
export type UserData = InferResponseType<typeof client.api.auth.username.$patch, SuccessStatusCode>['data']

/** Signed-in user + auth token, persisted to localStorage (reactive, survives refresh). Single source for both; written/cleared together. */
export const useUserStore = defineStore('user', () => {
  const userData = useLocalStorage<UserData | null>('user-data', null, { serializer: StorageSerializers.object })

  /** The token the server has accepted/validated. As opposed to loading the token from local storage.
   * Only used in this file.
   */
  const verifiedToken = ref('')

  // userData follows the token: a 401 (handle-error) clears the token, and the persisted user goes with it.
  watch(token, (t) => { if (!t) userData.value = null })

  /**
   * Whether the session is usable: unexpired locally, then confirmed by the cheapest authenticated call. The router's
   * gate awaits this before entering a protected route, so a dead session never mounts a view that fans out requests.
   */
  async function verifySession(): Promise<boolean> {
    if (!sessionActive()) {
      token.value = ''
      return false
    }
    if (verifiedToken.value === token.value) return true
    const probed = token.value
    try {
      const { data } = await request(client.api.auth.me.$get())
      // A logout or a fresh login can land while the probe is in flight; this reply describes neither of those
      // sessions, and committing it would restore the user a logout just cleared.
      if (token.value === probed) {
        setUser(data)
        verifiedToken.value = probed
      }
    } catch (e) {
      console.error(e)
      // Only a 401 is a verdict on the token, and `request` has already cleared it by then; a network fault or 5xx says
      // nothing about the session, so read the answer off the token rather than ending it over a blip.
    }
    return sessionActive()
  }

  /** Persist user + token together (login, key/OTP verify). The server minted this token for this user, so it counts
   * as verified and the gate below can skip its probe. */
  function login(data: UserData, accessToken: string) {
    userData.value = data
    token.value = accessToken
    verifiedToken.value = accessToken
  }

  /** Update the stored user without touching the token (username/password change).
   * only used in this file
   */
  function setUser(data: UserData) {
    userData.value = data
  }

  /** Change the username on the backend and store the returned user. */
  async function changeUsername(name: string) {
    const { data } = await request(client.api.auth.username.$patch({ json: { name } }))
    setUser(data)
  }

  /**
   * Clear the session; the watcher above drops userData when the token empties. Push is revoked first, while the token
   * is still valid.
   */
  async function logout() {
    try {
      await disablePush()
    } catch (e) {
      console.error('Failed to revoke push subscription', e)
    } finally {
      token.value = ''
    }
  }

  return { userData, token, verifySession, login, setUser, changeUsername, logout }
})
