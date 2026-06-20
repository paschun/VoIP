import { combineURLs } from '@/helper.ts'
import { useUserStore } from '@/stores/user.ts'
import type { HttpMethod } from '@shared/api-contracts.ts'

/**
 * Tiny fetch wrapper.
 *
 *   await api.post('auth/register', { ... })  // → parsed JSON body
 *   await api.get('users/me')
 *
 * On non-2xx responses, throws an `ApiError` with `.status` and `.data`.
 * Network failures throw a regular Error with no `.status`.
 */

/**
 * API scheme + hostname + port, prepended to every API path.
 *
 * Prod: empty string '' -- a root-relative URL, so the browser resolves it against the page's own origin (frontend and
 * backend are served behind one host). Dev: the Vite server (:8080) and Express backend (:3000) are different
 * origins, so we need the absolute `http://localhost:3000` prefix; a relative `/api` on dev would hit Vite instead.
 */
const API_HOST = window.location.origin === 'http://localhost:8080' ? 'http://localhost:3000' : ''

/** Error thrown by `api.*` calls on non-2xx responses. */
export class ApiError extends Error {
  status?: number
  data?: any
}

/**
 * Issue a fetch request and return the parsed JSON body (or raw text if not
 * JSON). Throws an `ApiError` (with `status`/`data`) on non-2xx responses.
 */
async function request<T = unknown>(method: HttpMethod, resource: string, body?: unknown): Promise<T> {
  const url = combineURLs(API_HOST, '/api', resource)

  // todo: this is kind of odd that it is stored in localStorage but passed as an http token header instead of `credentials: include`
  const headers: HeadersInit = {
    'Cache-Control': 'no-cache',
    token: useUserStore().token,
  }
  const init: RequestInit = { method, headers }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(body)
  }

  const response = await fetch(url, init)
  const isJson = (response.headers.get('Content-Type') ?? '').includes('application/json')
  const data = isJson
    ? await response.json().catch(() => null)
    : (await response.text()) || null

  if (!response.ok) {
    // Every non-2xx (404 included) throws here; `handleError` in api.plugin maps any status it doesn't special-case
    // to a silent `false`, so e.g. a 404 from a by-id GET/DELETE just resolves falsy at the call site. Keep that
    // behaviour (throw on non-2xx with `status`/`data`) if you rework this.
    const err = new ApiError(`HTTP ${response.status}`)
    err.status = response.status
    err.data = data
    throw err
  }
  return data as T
}

// Call signatures shared by the raw client (`api.*`) and the `$get`/`$post`
// globals it's wrapped in (core/api.plugin). `F` is the extra failure return the
// wrapper folds in (`false`); `D` is the response type untyped call sites get.
export type ApiClientGet<F = never, D = unknown> = <T = D>(url: string) => Promise<T | F>
export type ApiClientPost<F = never, D = unknown> = <T = D>(url: string, body?: unknown) => Promise<T | F>
// PUT/PATCH share POST's call shape (url + JSON body); aliased so the globals can carry method-specific names.
export type ApiClientPut<F = never, D = unknown> = ApiClientPost<F, D>
export type ApiClientPatch<F = never, D = unknown> = ApiClientPost<F, D>
// DELETE usually carries the resource id in the path, but allows an optional JSON body (e.g. a password to confirm).
export type ApiClientDelete<F = never, D = unknown> = ApiClientPost<F, D>

export const api: { get: ApiClientGet, post: ApiClientPost, put: ApiClientPut, patch: ApiClientPatch, delete: ApiClientDelete } = {
  /** Send a GET request. Returns the parsed JSON response body. */
  get: <T = unknown>(url: string): Promise<T> => request<T>('GET', url),

  /** Send a POST request with a JSON body. Returns the parsed JSON response body. */
  post: <T = unknown>(url: string, body?: unknown): Promise<T> => request<T>('POST', url, body),

  /** Send a PUT request with a JSON body (idempotent create-or-replace). Returns the parsed JSON response body. */
  put: <T = unknown>(url: string, body?: unknown): Promise<T> => request<T>('PUT', url, body),

  /** Send a PATCH request with a JSON body (partial update). Returns the parsed JSON response body. */
  patch: <T = unknown>(url: string, body?: unknown): Promise<T> => request<T>('PATCH', url, body),

  /** Send a DELETE request (optional JSON body to confirm). Returns the parsed JSON response body. */
  delete: <T = unknown>(url: string, body?: unknown): Promise<T> => request<T>('DELETE', url, body)
}
