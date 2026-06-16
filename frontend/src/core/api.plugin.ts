import type { App } from 'vue'
import Swal from 'sweetalert2'
import router from '@/router/index.ts'
import Cookies from 'js-cookie'
import { api } from '@/core/services/api.service.ts'
import { ApiError, type ApiClientGet, type ApiClientPost, type ApiClientPut, type ApiClientPatch } from '@/core/services/api.service.ts'

// Shared API error handler (formerly in core/module/common.module.js).
// 401 → notify + clear auth + bounce to the app login; 400 → notify.
// Always resolves to `false` so callers can guard on a falsy return
// instead of try/catch — i.e. $post/$get never reject in normal operation.
const swalError = (text?: string) => Swal.fire({
  title: 'Error',
  text,
  icon: 'error',
  customClass: { confirmButton: 'btn btn-secondary' },
  heightAuto: false
})

const handleError = (err: ApiError): false => {
  if (err.status === 401) {
    void swalError(err.data?.error ?? 'Unauthorized Access!')
    Cookies.remove('access_token')
    Cookies.remove('userdata')
    const path = window.location.pathname.split('/')[1]
    void router.push(`/${path}/`)
  } else if (err.status === 400) {
    void swalError(err.data?.message)
  }
  return false
}

// Signatures of the globals installed below: the raw client signatures with
// `false` folded into the return (401/400 are swallowed by `handleError`) and a
// `T = any` default so untyped call sites stay `any`. Pass a contract type for a
// typed response: `this.$post<ApiEnvelope<Foo>>(url)`.
// Re-used by the `ComponentCustomProperties` augmentation in shims-global.d.ts.
export type ApiPost = ApiClientPost<false, any>
export type ApiGet = ApiClientGet<false, any>
export type ApiPut = ApiClientPut<false, any>
export type ApiPatch = ApiClientPatch<false, any>

/**
 * Installs `this.$post/$get/$put/$patch(url, data)` on every component.
 * Thin wrappers around `api.*` that swallow errors via `handleError`,
 * resolving to the parsed body on success or `false` on failure.
 */
export default {
  install (app: App) {
    const $post: ApiPost = <T = any>(url: string, data?: unknown) => api.post<T>(url, data).catch(handleError)
    const $get: ApiGet = <T = any>(url: string) => api.get<T>(url).catch(handleError)
    const $put: ApiPut = <T = any>(url: string, data?: unknown) => api.put<T>(url, data).catch(handleError)
    const $patch: ApiPatch = <T = any>(url: string, data?: unknown) => api.patch<T>(url, data).catch(handleError)
    app.config.globalProperties.$post = $post
    app.config.globalProperties.$get = $get
    app.config.globalProperties.$put = $put
    app.config.globalProperties.$patch = $patch
  }
}
