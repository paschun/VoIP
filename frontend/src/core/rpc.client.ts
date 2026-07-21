import { hc, parseResponse, DetailedError } from 'hono/client'
import type { ClientResponse } from 'hono/client'
import { authToken } from '@/core/auth-token.ts'
import { notifyApiError, serverError } from '@/core/handle-error.ts'
import type { AppType, WsAppType } from '../../../app/app.ts'

// The API is same-origin on both dev + prod
const origin = window.location.origin

/** The token comes from the {@link authToken} leaf module. */
export const client = hc<AppType>(origin, {
  headers: () => ({ Authorization: `Bearer ${authToken.value}`, 'Cache-Control': 'no-cache' }),
})

/** Client for the websocket route only */
export const wsClient = hc<WsAppType>(origin)

/*
https://github.com/honojs/hono/blob/v4.12.26/src/client/utils.ts#L92
https://github.com/honojs/hono/blob/v4.12.26/src/client/fetch-result-please.ts
^ for parseResponse and DetailedError

from parseResponse:
```
if (!_fetchRes.ok) {
  throw new DetailedError(`${_fetchRes.status} ${_fetchRes.statusText}`, {
    statusCode: _fetchRes?.status,
    detail: {
      data: _fetchRes?._data,
      statusText: _fetchRes?.statusText,
    },
  })
}
```
from DetailedError:
```
  constructor(
    message: string,
    options: { detail?: any; code?: any; statusCode?: number; log?: any } = {}
  ) {
    super(message)
    this.name = 'DetailedError'
    this.log = options.log
    this.detail = options.detail
    this.code = options.code
    this.statusCode = options.statusCode
  }
```
*/

/**
 * Wrap an `hc` call: on success resolve to the unwrapped, RPC-inferred 200 body (e.g. `{ data: Profile }`); on any
 * non-2xx or network fault run the central {@link notifyApiError} (401 bounce / 4xx-5xx toast), mark the error as
 * reported, and re-throw so it's never swallowed. Since it's marked, callers can simply let it bubble (the global net
 * in main.ts skips reported errors) -- reach for `try/catch` only to branch on failure or to run cleanup in `finally`.
 *
 * Built on hono's {@link parseResponse}, which maximizes success-side inference (the resolved type is exactly the 200
 * body, status-filtered) but discards all error typing: a non-2xx throws a {@link DetailedError} whose fields are
 * `any`. Our server `{ message }` lives at `err.detail.data.message`, the status at `err.statusCode`; `err.message`
 * is only `"<status> <statusText>"`. `instanceof DetailedError` distinguishes an HTTP error (response arrived) from a
 * network/parse fault (fetch rejected before a Response).
 *
 * if you need a typed failure shape, don't use {@link parseResponse}.`
 */
export function request<T extends ClientResponse<unknown>>(req: T | Promise<T>) {
  return parseResponse(req).catch((err: unknown) => {
    console.error(err)
    if (err instanceof DetailedError) {
      // DetailedError from parseResponse only carries `.{name,message,statusCode,detail.{data,statusText}}`; our backend
      // always sends a `{ message }` body, reachable at `.detail.data.message` (see serverError, which types the `any`s).
      const { status, message } = serverError(err)
      // A 401 on a live session means the token is dead: clear it (the mirror of attaching it in `headers` above). The
      // user store drops its data and the router bounces to login, both reacting to this auth state. Gate on a present
      // token so a failed login (no token yet) just notifies and lets the user retry in place.
      if (status === 401 && authToken.value) authToken.value = ''
      notifyApiError(status, message)
    } else if (err instanceof Error) {
      notifyApiError(undefined, err.toString())
    }
    throw err
  })
}
