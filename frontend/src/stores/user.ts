import { defineStore } from 'pinia'
import { computed } from 'vue'
import { useCookie } from '@/composables/useCookie.ts'
import { client, request } from '@/core/rpc.client.ts'
import type { UserData } from '@shared/contracts/auth.ts'

const expiresOpts = { expires: 30 }

/** Signed-in user + auth token, persisted to cookies (reactive in-app). Single source for both; written/cleared together. */
export const useUserStore = defineStore('user', () => {
  const userdata = useCookie<UserData>('userdata', expiresOpts)
  // token is attached to each API request as `token:` header
  const token = useCookie<string>('access_token', expiresOpts)

  const isLoggedIn = computed(() => token.value !== null)

  /** Persist user + token together (login, key/OTP verify). */
  function login (data: UserData, accessToken: string) {
    userdata.value = data
    token.value = accessToken
  }

  /** Update the stored user without touching the token (username/password change). */
  function setUser (data: UserData) {
    userdata.value = data
  }

  /** Change the username on the backend and store the returned user. */
  async function changeUsername (email: string) {
    const { data } = await request(client.api.auth.username.$patch({ json: { email } }))
    setUser(data)
  }

  /** Clear user + token (logout, 401). */
  function logout () {
    userdata.value = null
    token.value = null
  }

  return { userdata, token, isLoggedIn, login, setUser, changeUsername, logout }
})
