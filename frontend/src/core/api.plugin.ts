import Vue from 'vue'
import router from '@/router'
import { api } from '@/core/services/api.service'
import type { ApiError } from '@/core/services/api.service'

// Shared API error handler (formerly in core/module/common.module.js).
// 401 → notify + clear auth + bounce to the app login; 400 → notify.
// Always resolves to `false` so callers can guard on a falsy return
// instead of try/catch — i.e. $post/$get never reject in normal operation.
const swalError = (text?: string) => Vue.swal.fire({
  title: 'Error',
  text,
  icon: 'error',
  customClass: { confirmButton: 'btn btn-secondary' },
  heightAuto: false
})

const handleError = (err: ApiError): false => {
  if (err.status === 401) {
    void swalError(err.data?.error ?? 'Unauthorized Access!')
    Vue.cookie.delete('access_token')
    Vue.cookie.delete('userdata')
    const path = window.location.pathname.split('/')[1]
    void router.push(`/${path}/`)
  } else if (err.status === 400) {
    void swalError(err.data?.message)
  }
  return false
}

/**
 * Installs `this.$post(url, data)` and `this.$get(url)` on every component.
 * Thin wrappers around `api.*` that swallow errors via `handleError`,
 * resolving to the parsed body on success or `false` on failure.
 */
export default {
  install () {
    Vue.prototype.$post = (url: string, data?: unknown) => api.post(url, data).catch(handleError)
    Vue.prototype.$get = (url: string) => api.get(url).catch(handleError)
  }
}
