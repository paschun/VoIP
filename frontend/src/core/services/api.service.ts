import Cookies from 'js-cookie'
import { combineURLs } from '../../helper.ts'

/**
 * Tiny fetch wrapper.
 *
 *   await api.post('auth/register', { ... })  // → parsed JSON body
 *   await api.get('users/me')
 *
 * On non-2xx responses, throws an `ApiError` with `.status` and `.data`.
 * Network failures throw a regular Error with no `.status`.
 */

const baseURL = combineURLs(
  window.location.origin === 'http://localhost:8080' ? 'http://localhost:3000' : '',
  '/api'
)

/** Error thrown by `api.*` calls on non-2xx responses. */
export class ApiError extends Error {
  status?: number
  data?: any
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/**
 * Issue a fetch request and return the parsed JSON body (or raw text if not
 * JSON). Throws an `ApiError` (with `status`/`data`) on non-2xx responses.
 */
async function request<T = unknown>(method: HttpMethod, resource: string, body?: unknown): Promise<T> {
  const url = /^https?:\/\//i.test(resource)
    ? resource
    : combineURLs(baseURL, resource)

  const headers: Record<string, string> = {
    'Cache-Control': 'no-cache',
    token: Cookies.get('access_token') ?? ''
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

export const api: { get: ApiClientGet, post: ApiClientPost } = {
  /** Send a GET request. Returns the parsed JSON response body. */
  get: <T = unknown>(url: string): Promise<T> => request<T>('GET', url),

  /** Send a POST request with a JSON body. Returns the parsed JSON response body. */
  post: <T = unknown>(url: string, body?: unknown): Promise<T> => request<T>('POST', url, body)
}
