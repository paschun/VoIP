import { ref } from 'vue'
import { defineStore } from 'pinia'
import { client, request } from '@/core/rpc.client.ts'

/** Fetch-once deployment facts: the running build id, whether upstream has a newer one, and whether self-signup is open. */
export const useServerMetaStore = defineStore('server-meta', () => {
  const version = ref('')
  const updateAvailable = ref(false)
  const signupEnabled = ref(false)

  async function loadVersion() {
    const { data } = await request(client.api.auth.version.$get())
    version.value = data
  }

  async function loadUpdateAvailable() {
    const { data } = await request(client.api.auth.version['update-available'].$get())
    updateAvailable.value = data
  }

  async function loadSignupEnabled() {
    const { data } = await request(client.api.auth['signup-enabled'].$get())
    signupEnabled.value = data
  }

  // Eager, on first store use; if fetch-once state like this spreads, consider a data-fetching layer (e.g. Pinia Colada).
  void loadVersion()
  void loadUpdateAvailable()
  /** Resolves once `signupEnabled` reflects the server, for checks that must not read the placeholder `false`. */
  const signupReady = loadSignupEnabled()

  return { version, updateAvailable, signupEnabled, signupReady }
})
