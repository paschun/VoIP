// https://vuejs.org/guide/typescript/options-api.html#augmenting-global-properties
// Module augmentation for globals installed on every component instance via `app.config.globalProperties`

export {}

import type Swal from 'sweetalert2'
import type { CookieApi } from '@/core/cookie.plugin.ts'

declare module 'vue' {
  interface ComponentCustomProperties {
    // core/api.plugin — resolve to the parsed body on success, or `false` on
    // failure (401/400 are swallowed there). Guard on a falsy return.
    // Pass a contract type to get a typed response: `this.$post<ApiEnvelope<Foo>>(url)`.
    // Default `T = any` keeps untyped call sites returning `any`.
    $post<T = any>(url: string, data?: unknown): Promise<T | false>
    $get<T = any>(url: string): Promise<T | false>

    // core/cookie.plugin (js-cookie adapter).
    $cookie: CookieApi

    // vue-sweetalert2 (also self-declares this; kept for clarity).
    $swal: typeof Swal
  }
}