import { computed, watch } from 'vue'
import { useLocalStorage, StorageSerializers } from '@vueuse/core'
import type { InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { defineStore } from 'pinia'
import { authToken as token } from '@/core/auth-token.ts'
import { disablePush } from '@/core/push.ts'
import { client, request } from '@/core/rpc.client.ts'

/** The signed-in user, inferred from the `PATCH /api/auth/username` 200 body (`{ data: UserData }`). */
export type UserData = InferResponseType<typeof client.api.auth.username.$patch, SuccessStatusCode>['data']

/** Signed-in user + auth token, persisted to localStorage (reactive, survives refresh). Single source for both; written/cleared together. */
export const useUserStore = defineStore('user', () => {
  const userData = useLocalStorage<UserData | null>('user-data', null, { serializer: StorageSerializers.object })

  const isLoggedIn = computed(() => token.value.length > 0)

  // userData follows the token: a 401 (handle-error) clears the token, and the persisted user goes with it.
  watch(token, (t) => { if (!t) userData.value = null })

  /** Persist user + token together (login, key/OTP verify). */
  function login(data: UserData, accessToken: string) {
    userData.value = data
    token.value = accessToken
  }

  /** Update the stored user without touching the token (username/password change). */
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

  return { userData, token, isLoggedIn, login, setUser, changeUsername, logout }
})
