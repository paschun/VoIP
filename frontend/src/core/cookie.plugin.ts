import type { App } from 'vue'
import Cookies from 'js-cookie'

/**
 * Replacement for the (Vue-2-only) `vue-cookie` plugin, backed by `js-cookie`.
 * Preserves the old API surface so call sites don't change:
 *   this.$cookie.get(name)            -> string | null
 *   this.$cookie.set(name, val, days) -> void   (days defaults the same as before)
 *   this.$cookie.delete(name)         -> void
 */
export interface CookieApi {
  get(name: string): string | null
  set(name: string, value: string, days: number): void
  delete(name: string): void
}

export const cookie: CookieApi = {
  // js-cookie returns `undefined` when absent; vue-cookie returned `null`.
  get: (name) => Cookies.get(name) ?? null,
  set: (name, value, days) => { Cookies.set(name, value, { expires: days }) },
  delete: (name) => Cookies.remove(name),
}

export default {
  install (app: App) {
    app.config.globalProperties.$cookie = cookie
  },
}
