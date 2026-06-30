import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { StorageSerializers, useLocalStorage } from '@vueuse/core'
import type { InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { client, request } from '@/core/rpc.client.ts'

// getProfile and getAllProfiles routes include virtual counts
// create + delete do not

/**
 * A profile as returned by create/delete -- the plain Setting wire doc, fully inferred from the `POST /api/profile`
 * 200 body (`{ data: Profile }`). No `messageCount`/`totalCount`: those routes don't populate the count virtuals.
 */
type Profile = InferResponseType<typeof client.api.profile.$post, SuccessStatusCode>['data']

/**
 * A profile as returned by list/getOne, which additionally `.populate()` the unread + total message counts. Extends
 * {@link Profile} with the two count fields
 */
type ProfileWithUnread = InferResponseType<typeof client.api.profile[':id']['$get'], SuccessStatusCode>['data']

// The currently-selected profile, shared across the app and persisted to localStorage. Selection is reactive state;
// interested components `watch` it.
//
// Two flavours of "change" to watch, depending on intent:
//   - activeProfileId   -> the *selection* changed (different profile). Gate side effects (refetch lists, re-init the
//                          call SDK) on this so a detail refresh of the same profile doesn't trigger a refetch storm.
//   - activeProfile      -> any change incl. detail refresh (unread counts, provider creds). Bind displays to this.
export const useProfileStore = defineStore('profile', () => {
  // `object` serializer = JSON read/write (the default `any` serializer would mangle objects). `null` = none selected.
  const activeProfile = useLocalStorage<Profile | ProfileWithUnread | null>('activeProfile', null, {
    serializer: StorageSerializers.object
  })

  const profiles = ref<ProfileWithUnread[]>([])
  const profileIsLoading = ref(false) // used in ProfileView

  // these are refs inside here, but on the outside they are unwrapped by store proxy. use `storeToRefs` to get refs on the outside.
  const activeProfileId = computed(() => activeProfile.value?._id ?? '')
  const activeProfileType = computed(() => activeProfile.value?.type ?? '')
  const hasActiveProfile = computed(() => activeProfile.value !== null)

  /** Set the active profile (a new object reference each call -> watchers fire). */
  function setActiveProfile (profile: Profile | ProfileWithUnread) {
    activeProfile.value = profile
  }

  /** Clear the selection (fires watchers). Used after deleting the selected profile. */
  function clearActiveProfile () {
    activeProfile.value = null
  }

  /**
   * Fetch every profile into `profiles` (selector list + unread badges). Pure refresh: does NOT change the selection
   * or fire the change watchers, so it's safe on pull-to-refresh / incoming messages. Returns the list; throws (after
   * the central toast) on failure.
   */
  async function loadProfiles (): Promise<ProfileWithUnread[]> {
    profileIsLoading.value = true
    try {
      const { data } = await request(client.api.profile.$get())
      profiles.value = data
      return data
    } finally {
      profileIsLoading.value = false
    }
  }

  /** Resolve the stored selection against a list (matching id, else the first). */
  function resolveActiveProfile (list: ProfileWithUnread[]): ProfileWithUnread | undefined {
    return list.find(p => p._id === activeProfile.value?._id) ?? list[0]
  }

  /** Create a profile, select it (fires watchers), and refresh the list. Returns it; throws on failure. */
  async function createProfile (name: string): Promise<Profile> {
    profileIsLoading.value = true
    try {
      const { data } = await request(client.api.profile.$post({ json: { profile: name } }))
      setActiveProfile(data)
      await loadProfiles()
      return data
    } finally {
      // omitting `catch` means the error isn't caught and keeps propagating
      profileIsLoading.value = false
    }
  }

  /** Re-fetch the active profile's detail (unread counts, settings) in place. */
  async function refreshActiveProfile (): Promise<void> {
    if (!activeProfile.value) return
    const { data } = await request(client.api.profile[':id'].$get({ param: { id: activeProfile.value._id } }))
    setActiveProfile(data)
  }

  /** Delete the active profile, clear the selection, and refresh the list. */
  async function deleteActiveProfile (): Promise<void> {
    if (!activeProfile.value) return
    await request(client.api.profile[':id'].$delete({ param: { id: activeProfile.value._id } }))
    clearActiveProfile()
    await loadProfiles()
  }

  return {
    activeProfile,
    profiles,
    profileIsLoading,
    activeProfileId,
    activeProfileType,
    hasActiveProfile,
    setActiveProfile,
    clearActiveProfile,
    loadProfiles,
    resolveActiveProfile,
    createProfile,
    refreshActiveProfile,
    deleteActiveProfile
  }
})
