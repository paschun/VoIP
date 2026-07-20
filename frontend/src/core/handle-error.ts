import type { ClientErrorStatusCode, ServerErrorStatusCode } from 'hono/utils/http-status'
import { DetailedError } from 'hono/client'
import Swal from 'sweetalert2'
import router from '@/router/routes.ts'
import { useUserStore } from '@/stores/user.ts'

/**
 * Every HTTP error status the hono RPC surface can return: the 4xx client + 5xx server codes from hono's own status
 * unions. `undefined` means a network/parse fault (no Response). We can't narrow this to the specific subset the app
 * actually throws (401/404/409/...) by inferring from `AppType`: those come from `HTTPException` rendered in
 * `app.onError`, which isn't part of the typed route output -- `AppType` only carries the 200s passed to `c.json`.
 */
export type ApiErrorStatus = ClientErrorStatusCode | ServerErrorStatusCode

/** promise is resolved when user dismisses the alert */
const swalError = ({ title, text }: { title?: string | number; text?: string }) =>
  Swal.fire({
    title: `Error ${title}`.trim(),
    text,
    icon: 'error',
    customClass: { confirmButton: 'btn btn-secondary' },
    heightAuto: false,
  })

/**
 * Central reaction to a failed API call, keyed on the HTTP status and the server `{ message }`. `request`
 * (rpc.client) calls it for the side effects before re-throwing. Always notifies (no opt-out yet).
 *
 * TODO: notification is mixed here with navigating. Separate those concerns.
 */
export function notifyApiError(status?: ApiErrorStatus, message?: string): void {
  console.error(`HTTP error status:`, status, '- message:', message)

  if (!status) {
    void swalError({ title: 'Unknown', text: message })

    // 401 Unauthorized: a logged-in session's token is missing/expired/invalid, OR a login attempt failed. Only the
    // former should log out + bounce to login -- gate that on an actual session cookie, so a failed login (no token yet,
    // e.g. a wrong security key) just notifies and lets the user retry in place.
  } else if (status === 401) {
    void swalError({ title: status, text: message })
    const user = useUserStore()
    if (user.isLoggedIn) {
      user.logout()
      // we aren't awaitng the redirect, because its a side effect and shouldn't gate error propagation. Awaiting it
      // up the chain (into request()) would hold the API-error rejection until navigation settles
      void router.push({ name: 'login' })
    }
    // 400 Bad Request (malformed/invalid input)
    // 403 Forbidden (authenticated but not allowed / called out of order),
    // 409 Conflict (duplicate, e.g. a name/number that already exists)
    // 422 Unprocessable (well-formed but breaks a business rule or fails validation, e.g. the 500-contact cap) -> show the server message.
    // 5xx server fault (500 internal, 502 provider failure): the body is `{ message }`
  } else {
    void swalError({ title: status, text: message })
  }
}

/**
 * In a form submit's `catch`: copy the server's `{ message }` onto Regle external errors, shaped by `toErrors`
 * (`(m) => ({ name: [m] })`, or `(m) => [m]` for a single-ref form). Non-HTTP errors are ignored; caller rethrows.
 */
export function setServerErrors<E>(
  r$: { $setExternalErrors: (errors: E) => void },
  err: unknown,
  toErrors: (message: string) => E,
): void {
  if (err instanceof DetailedError) r$.$setExternalErrors(toErrors(err.detail?.data?.message))
}
