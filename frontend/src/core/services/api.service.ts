import Vue from 'vue'
import { combineURLs } from '../../helper'

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
export interface ApiError extends Error {
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
    token: Vue.cookie.get('access_token') ?? ''
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
    const err = new Error(`HTTP ${response.status}`) as ApiError
    err.status = response.status
    err.data = data
    throw err
  }
  return data as T
}

export const api = {
  /** Send a GET request. Returns the parsed JSON response body. */
  get: <T = unknown>(url: string): Promise<T> => request<T>('GET', url),

  /** Send a POST request with a JSON body. Returns the parsed JSON response body. */
  post: <T = unknown>(url: string, body?: unknown): Promise<T> => request<T>('POST', url, body)
}
