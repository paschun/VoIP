import { useColorMode, useMutationObserver } from '@vueuse/core'

/**
 * App color mode driven through Bootstrap's native `data-bs-theme` on <html>, persisted and defaulting to the OS
 * preference. Creating it applies the mode app-wide, not only where the toggle mounts.
 *
 * This has a side-effect on import, it runs immediately and modifies html tag.
 * This is imported by ThemeButton.vue, so must live at top-level, not inside initThemeMetaSync() below.
 */
export const colorMode = useColorMode({
  selector: 'html',
  attribute: 'data-bs-theme',
  storageKey: 'color-mode',
})

/** Sync the browser-chrome tint (mobile address bar, PWA title bar) with the page background of the current mode.
 * The moment the page is up, the in-document <meta name="theme-color"> overrides the theme_color in PWA webmanifest.
 */
function syncThemeColorMeta() {
  const color = getComputedStyle(document.documentElement).getPropertyValue('--background-color-secondary').trim()
  if (color) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
}

/** Start the theme-color meta sync. Called once from main.ts. */
export function initThemeMetaSync() {
  useMutationObserver(document.documentElement, syncThemeColorMeta, { attributeFilter: ['data-bs-theme'] })
  syncThemeColorMeta()
}
