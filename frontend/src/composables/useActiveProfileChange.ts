import { watch } from 'vue'
import { useProfileStore } from '@/stores/profile.ts'

/**
 * Run `fn` immediately and again whenever another profile is selected. Keyed on the id, so a same-id detail
 * refresh (which reassigns the profile object) doesn't refire.
 */
export function useActiveProfileChange(fn: () => void | Promise<void>) {
  const profileStore = useProfileStore()
  watch(
    () => profileStore.activeProfileId,
    () => {
      void fn()
    },
    { immediate: true },
  )
}
