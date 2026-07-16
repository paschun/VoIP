import { ref } from 'vue'
import { defineStore } from 'pinia'
import { client, request } from '@/core/rpc.client.ts'

/** Facts about the running build, fetched once per session: its id, and whether upstream has a newer one. */
export const useVersionStore = defineStore('version', () => {
  const version = ref('')

  /** Whether the upstream repo has a newer build than this deployment (shown as the update ribbon). */
  const updateAvailable = ref(false)

  async function load() {
    const { data } = await request(client.api.auth.version.$get())
    version.value = data
  }

  let updateRequested = false

  /** Ask once whether upstream has a newer build. Explicit (not eager) so the pre-auth login page skips the GitHub round-trip. */
  async function checkUpdateAvailable() {
    if (updateRequested) return
    updateRequested = true
    const { data } = await request(client.api.auth.version['update-available'].$get())
    updateAvailable.value = data
  }

  void load() // eager, on first store use; if fetch-once state like this spreads, consider a data-fetching layer (e.g. Pinia Colada)

  return { version, updateAvailable, checkUpdateAvailable }
})
