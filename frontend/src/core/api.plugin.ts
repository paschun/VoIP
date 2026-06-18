import type { App } from 'vue'
import { api } from '@/core/services/api.service.ts'
import { type ApiClientGet, type ApiClientPost, type ApiClientPut, type ApiClientPatch, type ApiClientDelete } from '@/core/services/api.service.ts'
import { handleError } from '@/core/services/handle-error.ts'

// Signatures of the globals installed below: the raw client signatures with
// `false` folded into the return (401/400 are swallowed by `handleError`) and a
// `T = any` default so untyped call sites stay `any`. Pass a contract type for a
// typed response: `this.$post<Ok<Foo>>(url)`.
// Re-used by the `ComponentCustomProperties` augmentation in shims-global.d.ts.
export type ApiPost = ApiClientPost<false, any>
export type ApiGet = ApiClientGet<false, any>
export type ApiPut = ApiClientPut<false, any>
export type ApiPatch = ApiClientPatch<false, any>
export type ApiDelete = ApiClientDelete<false, any>

/**
 * Installs `this.$post/$get/$put/$patch/$del(url, data)` on every component (`$del` because Vue reserves `$delete`).
 * Thin wrappers around `api.*` that swallow errors via `handleError`,
 * resolving to the parsed body on success or `false` on failure.
 */
export default {
  install (app: App) {
    const $post: ApiPost = <T = any>(url: string, data?: unknown) => api.post<T>(url, data).catch(handleError)
    const $get: ApiGet = <T = any>(url: string) => api.get<T>(url).catch(handleError)
    const $put: ApiPut = <T = any>(url: string, data?: unknown) => api.put<T>(url, data).catch(handleError)
    const $patch: ApiPatch = <T = any>(url: string, data?: unknown) => api.patch<T>(url, data).catch(handleError)
    const $del: ApiDelete = <T = any>(url: string, data?: unknown) => api.delete<T>(url, data).catch(handleError)
    app.config.globalProperties.$post = $post
    app.config.globalProperties.$get = $get
    app.config.globalProperties.$put = $put
    app.config.globalProperties.$patch = $patch
    app.config.globalProperties.$del = $del
  }
}
