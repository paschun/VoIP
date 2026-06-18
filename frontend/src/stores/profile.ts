import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ZodType } from 'zod'
import { useValidatedStorage } from '@/composables/useValidatedStorage.ts'
import { profileSchema, profileService } from '@/core/services/profile.service.ts'
import type { Profile } from '@shared/api-contracts.ts'

// The currently-selected profile, shared across the app and persisted to
// localStorage (validated on every read/write). Replaces the old
// changeProfile/changeProfile2/getOneProfile EventBus signals: selection is now
// reactive state and interested components `watch` it.
//
// Two flavours of "change" to watch, depending on intent:
//   - activeProfileId   -> the *selection* changed (different profile). Gate
//                          side effects (refetch lists, re-init the call SDK) on
//                          this so a detail refresh of the same profile doesn't
//                          trigger a refetch storm / re-entrancy.
//   - activeProfile      -> any change incl. detail refresh (unread counts,
//                          provider creds). Bind displays/payloads to this.
export const useProfileStore = defineStore('profile', () => {
  // Source of truth: persisted + schema-validated. `_id: ''` means "none yet".
  const activeProfile = useValidatedStorage<Profile>(
    'activeProfile',
    profileSchema as unknown as ZodType<Profile>,
    { _id: '', profile: '' }
  )

  // refs become state
  const profiles = ref<Profile[]>([])
  const loading = ref(false)

  // computed become getters
  const activeProfileId = computed(() => activeProfile.value._id)
  const activeProfileType = computed(() => activeProfile.value.type ?? '')
  const hasActiveProfile = computed(() => activeProfile.value._id !== '')

  // functions become actions

  /** Set the active profile (a new object reference each call -> watchers fire). */
  function setActiveProfile (profile: Profile) {
    activeProfile.value = profile
  }

  /**
   * Fetch every profile into `profiles` (for the selector list + unread badges).
   * Pure refresh: does NOT change the selection or fire the change watchers, so
   * it's safe to call on pull-to-refresh / incoming messages. Returns the list.
   */
  async function loadProfiles (): Promise<Profile[] | false> {
    loading.value = true
    try {
      const list = await profileService.list()
      if (list) profiles.value = list
      return list
    } finally {
      loading.value = false
    }
  }

  /** Resolve the stored selection against a list (matching id, else the first). */
  function resolveActiveProfile (list: Profile[]): Profile | undefined {
    return list.find(p => p._id === activeProfile.value._id) ?? list[0]
  }

  /** Create a profile, select it (fires watchers), and refresh the list. */
  async function createProfile (name: string): Promise<Profile | false> {
    loading.value = true
    try {
      const created = await profileService.create(name)
      if (!created) return false
      setActiveProfile(created)
      await loadProfiles()
      return created
    } finally {
      loading.value = false
    }
  }

  /** Re-fetch the active profile's detail (unread counts, settings) in place. */
  async function refreshActiveProfile (): Promise<void> {
    if (activeProfile.value._id === '') return
    const fresh = await profileService.getOne(activeProfile.value._id)
    if (fresh) setActiveProfile(fresh)
  }

  return {
    activeProfile,
    profiles,
    loading,
    activeProfileId,
    activeProfileType,
    hasActiveProfile,
    setActiveProfile,
    loadProfiles,
    resolveActiveProfile,
    createProfile,
    refreshActiveProfile
  }
})
