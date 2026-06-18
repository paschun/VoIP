import type { App } from 'vue'
import Swal from 'sweetalert2'
import router from '@/router/index.ts'
import Cookies from 'js-cookie'
import { api } from '@/core/services/api.service.ts'
import { ApiError, type ApiClientGet, type ApiClientPost, type ApiClientPut, type ApiClientPatch, type ApiClientDelete } from '@/core/services/api.service.ts'

// Shared API error handler (formerly in core/module/common.module.js).
// 401 -> notify (+ clear auth & bounce to login only if a session cookie exists); 400/403/409/422 and 5xx -> notify.
// Always resolves to `false` so callers can guard on a falsy return
// instead of try/catch -- i.e. $post/$get never reject in normal operation.
const swalError = (text?: string) => Swal.fire({
  title: 'Error',
  text,
  icon: 'error',
  customClass: { confirmButton: 'btn btn-secondary' },
  heightAuto: false
})

const handleError = (err: ApiError): false => {
  // 401 Unauthorized: a logged-in session's token is missing/expired/invalid, OR a login attempt failed. Only the
  // former should log out + bounce to login -- gate that on an actual session cookie, so a failed login (no token yet,
  // e.g. a wrong security key) just notifies and lets the user retry in place.
  if (err.status === 401) {
    void swalError(err.data?.message ?? err.data?.error ?? 'Unauthorized Access!')
    if (Cookies.get('access_token')) {
      Cookies.remove('access_token')
      Cookies.remove('userdata')
      const path = window.location.pathname.split('/')[1]
      void router.push(`/${path}/`)
    }
  // 400 Bad Request (malformed/invalid input)
  // 403 Forbidden (authenticated but not allowed / called out of order),
  // 409 Conflict (duplicate, e.g. a name/number that already exists)
  // 422 Unprocessable (well-formed but breaks a business rule or fails validation, e.g. the 500-contact cap) -> show
  // the server message.
  } else if (err.status === 400 || err.status === 403 || err.status === 409 || err.status === 422) {
    void swalError(err.data?.message)
  // 5xx server fault (500 internal, 502 provider failure): the body is `{ message }` but may be generic, so fall back
  // to a friendly default rather than surfacing a bare status.
  } else if (err.status !== undefined && err.status >= 500) {
    void swalError(err.data?.message ?? 'Something went wrong')
  }
  // Any other status (404, ...) falls through to a silent `false`; callers guard on the falsy return.
  return false
}

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
