import { useColorMode, useMutationObserver } from '@vueuse/core'

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

/** Sync the browser-chrome tint (mobile address bar, PWA title bar) with the page background of the current mode.
 * The moment the page is up, the in-document <meta name="theme-color"> overrides the theme_color in PWA webmanifest.
 */
function syncThemeColorMeta() {
  const color = getComputedStyle(document.documentElement).getPropertyValue('--background-color-secondary').trim()
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}

useMutationObserver(document.documentElement, syncThemeColorMeta, { attributeFilter: ['data-bs-theme'] })
syncThemeColorMeta()
