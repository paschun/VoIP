import { hc } from 'hono/client'
import type { ClientResponse } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import Cookies from 'js-cookie'
import { notifyApiError } from '@/core/api.plugin.ts'
import type { ApiResult, Ok, ApiError } from '@shared/api-contracts.ts'
import type { AppType } from '../../../app.ts'

// Dev serves the SPA on :8080 with the API on :3000; in prod the API is same-origin. `/api` is baked into `AppType`'s
// route tree, so the base is the origin only (e.g. `client.api.auth.login.$post`).
const origin = window.location.origin === 'http://localhost:8080' ? 'http://localhost:3000' : window.location.origin

/**
 * Typed RPC client over the backend `AppType`: paths, inputs, and outputs are inferred from the server routes, e.g.
 * `client.api.auth.login.$post({ json: { email, password } })`. The token + no-cache headers attach per request (a
 * function, so the current cookie is always read). Pair with {@link request} to get an `ApiResult`.
 */
export const client = hc<AppType>(origin, {
  headers: () => ({ token: Cookies.get('access_token') ?? '', 'Cache-Control': 'no-cache' })
})

/** The 2xx JSON body of an `hc` request promise (after `res.ok`), with non-success status variants dropped. */
type OkJson<R> = Awaited<R> extends infer CR
  ? CR extends ClientResponse<infer T, infer S, 'json'>
    ? S extends SuccessStatusCode ? T : never
    : never
  : never

/** The payload inside the `Ok<T>` success body -- what `request` unwraps into `ApiResult.data`. */
type OkBody<R> = OkJson<R> extends Ok<infer T> ? T : never

/**
 * Guard against silent `never`. When a response has no `Ok<T>` success body (a bespoke multi-field endpoint that
 * doesn't fit this wrapper, or a broken type), `OkBody` is `never` -- which propagates invisibly because `never` is
 * assignable to everything. This swaps it for a branded object so any use of `res.data` is a readable compile error
 * instead. `[T] extends [never]` is tuple-wrapped so it detects `never` without distributing.
 */
type RequireBody<T> = [T] extends [never]
  ? { readonly __error: 'request(): endpoint has no Ok<T> success body -- handle it without request()' }
  : T

/**
 * Sends a typed `hc` request and returns an {@link ApiResult}: `{ ok: true, data }` with the unwrapped payload on
 * success, or `{ ok: false, status, message }` on failure -- after running the central {@link notifyApiError} (401
 * bounce / 4xx-5xx toast). Call sites branch with `if (!res.ok)` and never try/catch for HTTP errors.
 *
 * TODO: do we even need ok: true | false ??
 */
export async function request<R extends Promise<ClientResponse<unknown, number, 'json'>>> (req: R): Promise<ApiResult<RequireBody<OkBody<R>>>> {
  let res
  try {
    res = await req
  } catch {
    notifyApiError(undefined)
    return { ok: false, message: 'Network error' }
  }
  if (res.ok) {
    // todo: this seems wrong, to wrap the result in an Ok<> shape. Because not all the backend route handlers' responses use the Ok<> shape.
    const body = await res.json() as Ok<RequireBody<OkBody<R>>>
    return { ok: true, ...body }
  }
  const body = await res.json().catch(() => null) as ApiError | null
  notifyApiError(res.status, body?.message)
  return { ok: false, status: res.status, message: body?.message ?? `Request failed (${res.status})` }
}
