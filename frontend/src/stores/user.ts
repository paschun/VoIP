import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useLocalStorage, StorageSerializers } from '@vueuse/core'
import { client, request } from '@/core/rpc.client.ts'
import type { UserData } from '@shared/contracts/auth.ts'

/** Signed-in user + auth token, persisted to localStorage (reactive, survives refresh). Single source for both; written/cleared together. */
export const useUserStore = defineStore('user', () => {
  const userData = useLocalStorage<UserData | null>('userdata', null, { serializer: StorageSerializers.object })
  // token is attached to each API request as the `token:` header
  const token = useLocalStorage<string | null>('access_token', null)

  const isLoggedIn = computed(() => token.value !== null)

  /** Persist user + token together (login, key/OTP verify). */
  function login (data: UserData, accessToken: string) {
    userData.value = data
    token.value = accessToken
  }

  /** Update the stored user without touching the token (username/password change). */
  function setUser (data: UserData) {
    userData.value = data
  }

  /** Change the username on the backend and store the returned user. */
  async function changeUsername (email: string) {
    const { data } = await request(client.api.auth.username.$patch({ json: { email } }))
    setUser(data)
  }

  /** Clear user + token (logout, 401). */
  function logout () {
    userData.value = null
    token.value = null
  }

  return { userData, token, isLoggedIn, login, setUser, changeUsername, logout }
})
