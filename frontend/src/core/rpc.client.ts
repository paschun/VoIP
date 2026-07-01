import { hc, parseResponse, DetailedError } from 'hono/client'
import type { ClientResponse } from 'hono/client'
import { authToken } from '@/core/auth-token.ts'
import { notifyApiError } from '@/core/handle-error.ts'
import type { AppType } from '../../../app/app.ts'

// Dev serves the SPA on :8080 with the API on :3000; in prod the API is same-origin. `/api` is baked into `AppType`'s
// route tree, so the base is the origin only (e.g. `client.api.auth.login.$post`).
const origin = window.location.origin === 'http://localhost:8080' ? 'http://localhost:3000' : window.location.origin

/**
 * Typed RPC client over the backend `AppType`: paths, inputs, and outputs are inferred from the server routes, e.g.
 * `client.api.auth.login.$post({ json: { email, password } })`. The token + no-cache headers attach per request (a
 * function, so the current token is read fresh each time). The token comes from the {@link authToken} leaf module, not
 * the user store: keeping `client` store-independent is what lets the stores infer their types from `client`.
 */
export const client = hc<AppType>(origin, {
  headers: () => ({ token: authToken.value, 'Cache-Control': 'no-cache' }),
})

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
  return parseResponse(req).catch(async (err: unknown) => {
    console.error(err)
    if (err instanceof DetailedError) {
      // DetailedError from parseResponse will only have `.{name,message,statusCode,detail.{data,statusText}}
      // Our error from backend always sends a response body with `{ message }`, which will be `.detail.data.message` on DetailedError
      await notifyApiError(err.statusCode, err.detail?.data?.message)
    } else if (err instanceof Error) {
      await notifyApiError(undefined, err.toString())
    }
    throw err
  })
}
