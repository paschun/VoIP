import { hc } from 'hono/client'
import type { ClientResponse } from 'hono/client'
import type { SuccessStatusCode, StatusCode } from 'hono/utils/http-status'
import Cookies from 'js-cookie'
import { notifyApiError } from '@/core/services/handle-error.ts'
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

/**
 * Sends a typed `hc` request and returns an {@link ApiResult}: `{ ok: true, data }` with the unwrapped payload on
 * success, or `{ ok: false, status, message }` on failure -- after running the central {@link notifyApiError} (401
 * bounce / 4xx-5xx toast). Call sites branch with `if (!res.ok)` and never try/catch for HTTP errors.
 *
 * Why handlers must pass a concrete success status (`c.json(data, 200)`):
 * - Backend: hono derives `ok` from the status type `U` as `U extends SuccessStatusCode ? true : ...? false : boolean`.
 *   A status-less `c.json(data)` defaults `U` to the broad `ContentfulStatusCode` (which spans both success and error
 *   codes), so `res.ok` widens from the literal `true` to `boolean` -- it's no longer a usable discriminant.
 * - Frontend: the param below is a discriminated union keyed on `ok` -- a `SuccessStatusCode` arm (whose `ok` computes
 *   to the literal `true`) and an error arm (literal `false`). `if (res.ok)` is discriminant narrowing: TS knows `ok`
 *   is a disjoint unit type across the members, so the truthiness test filters the union to the member(s) whose `ok`
 *   can be `true` and drops the `false` arm. Inside the block `res` is the success member alone, so `res.json()`
 *   resolves to that member's overload returning `Ok<T>`. This hinges on `ok` being a unit literal: a
 *   `ContentfulStatusCode` success member has `ok: boolean` (not disjoint), fits neither arm, and wouldn't typecheck;
 *   `if (res.ok)` couldn't drop it from either branch. A pinned `200` lands it in the success arm. The data shape
 *   itself stays fully RPC-inferred -- `200` pins only the status.
 *
 * TODO: do we even need ok: true | false ??
 */
export async function request<T> (
  req: Promise<
    | ClientResponse<Ok<T>, SuccessStatusCode, 'json'>
    | ClientResponse<unknown, Exclude<StatusCode, SuccessStatusCode>, 'json'>
  >
): Promise<ApiResult<T>> {
  let res
  try {
    res = await req
  } catch {
    notifyApiError(undefined)
    return { ok: false, message: 'Network error' }
  }
  if (res.ok) {
    const body = await res.json()
    return { ok: true, ...body }
  }
  const body = await res.json().catch(() => null) as ApiError | null
  notifyApiError(res.status, body?.message)
  return { ok: false, status: res.status, message: body?.message ?? `Request failed (${res.status})` }
}
