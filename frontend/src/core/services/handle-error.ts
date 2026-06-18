import Swal from 'sweetalert2'
import Cookies from 'js-cookie'
import router from '@/router/index.ts'
import type { ApiError } from '@/core/services/api.service.ts'

const swalError = (text?: string) => Swal.fire({
  title: 'Error',
  text,
  icon: 'error',
  customClass: { confirmButton: 'btn btn-secondary' },
  heightAuto: false
})

/**
 * Central reaction to a failed API call, keyed on the HTTP status and the server `{ message }`. Returns `false` so the
 * legacy `$post`/`$get` wrappers (via {@link handleError}) resolve falsy; `request` (rpc.client) calls it for the side
 * effects and returns an `ApiResult` failure arm instead. Always notifies (no opt-out yet).
 *
 * TODO: notification is mixed here with removing cookies/navigating. Separate those concerns.
 */
export const notifyApiError = (status: number | undefined, message?: string): false => {
  // 401 Unauthorized: a logged-in session's token is missing/expired/invalid, OR a login attempt failed. Only the
  // former should log out + bounce to login -- gate that on an actual session cookie, so a failed login (no token yet,
  // e.g. a wrong security key) just notifies and lets the user retry in place.
  if (status === 401) {
    void swalError(message ?? 'Unauthorized Access!')
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
  } else if (status === 400 || status === 403 || status === 409 || status === 422) {
    void swalError(message)
  // 5xx server fault (500 internal, 502 provider failure): the body is `{ message }` but may be generic, so fall back
  // to a friendly default rather than surfacing a bare status.
  } else if (status !== undefined && status >= 500) {
    void swalError(message ?? 'Something went wrong')
  }
  // Any other status (404, ...) falls through to a silent `false`; callers guard on the falsy return.
  // todo: maybe we throw here instead?
  return false
}

/**
 * Legacy adapter for the `api.*` throw path: unpacks the thrown `ApiError` (status + `{ message }` body) into
 * {@link notifyApiError}, so `$post`/`$get` keep their `T | false` contract. New code should prefer `request`.
 */
export const handleError = (err: ApiError): false => notifyApiError(err.status, err.data?.message ?? err.data?.error)
