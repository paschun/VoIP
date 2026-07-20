import { useColorMode } from '@vueuse/core'

/**
 * App color mode driven through Bootstrap's native `data-bs-theme` on <html>, persisted and defaulting to the OS
 * preference. Imported for side effects at startup so the theme applies app-wide, not only where the toggle mounts.
 */
export const colorMode = useColorMode({
  selector: 'html',
  attribute: 'data-bs-theme',
  storageKey: 'color-mode',
})

/** Flip to the opposite of the currently-rendered mode (`state` resolves `auto` via the OS preference first). */
export function toggleColorMode() {
  colorMode.value = colorMode.state.value === 'dark' ? 'light' : 'dark'
}
