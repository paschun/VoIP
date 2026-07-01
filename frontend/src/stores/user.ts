import { computed } from 'vue'
import { useLocalStorage, StorageSerializers } from '@vueuse/core'
import type { InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { defineStore } from 'pinia'
import { authToken as token } from '@/core/auth-token.ts'
import { client, request } from '@/core/rpc.client.ts'

/** The signed-in user, inferred from the `PATCH /api/auth/username` 200 body (`{ data: UserData }`). */
type UserData = InferResponseType<typeof client.api.auth.username.$patch, SuccessStatusCode>['data']

/** Signed-in user + auth token, persisted to localStorage (reactive, survives refresh). Single source for both; written/cleared together. */
export const useUserStore = defineStore('user', () => {
  const userData = useLocalStorage<UserData | null>('user-data', null, { serializer: StorageSerializers.object })

  // todo: activeUser? but its only used in Login.vue so maybe not

  const isLoggedIn = computed(() => token.value.length > 0)

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

  /** Clear user + token (logout, 401). */
  function logout() {
    userData.value = null
    token.value = ''
  }

  return { userData, token, isLoggedIn, login, setUser, changeUsername, logout }
})
