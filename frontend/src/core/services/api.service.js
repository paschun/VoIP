import Vue from 'vue'
import { combineURLs } from '../../helper'

/**
 * Tiny fetch wrapper.
 *
 *   await api.post('auth/register', { ... })  // → parsed JSON body
 *   await api.get('users/me')
 *
 * On non-2xx responses, throws an Error with `.status` and `.data`.
 * Network failures throw a regular Error with no `.status`.
 */

const baseURL = combineURLs(
  window.location.origin === 'http://localhost:8080' ? 'http://localhost:3000' : '',
  '/api'
)

/**
 * Error thrown by `api.*` calls on non-2xx responses.
 * @typedef {Error & { status?: number, data?: * }} ApiError
 */

/**
 * Issue a fetch request and return the parsed JSON body.
 * @param {'GET'|'POST'|'PUT'|'DELETE'} method  HTTP method.
 * @param {string} resource  Relative path (gets baseURL prepended) or absolute URL.
 * @param {*}      [body]    JSON-serializable request body.
 * @returns {Promise<*>}     Parsed JSON response body (or the raw text if not JSON).
 * @throws  {ApiError}       On non-2xx responses; `status` and `data` are populated.
 */
async function request(method, resource, body) {
  const url = /^https?:\/\//i.test(resource)
    ? resource
    : combineURLs(baseURL, resource)

  const headers = {
    'Cache-Control': 'no-cache',
    token: Vue.cookie.get('access_token') ?? ''
  }
  const init = { method, headers }
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
    const err = new Error(`HTTP ${response.status}`)
    err.status = response.status
    err.data = data
    throw err
  }
  return data
}

export const api = {
  /**
   * Send a GET request.
   * @param {string} url  Relative path or absolute URL.
   * @returns {Promise<*>} Parsed JSON response body.
   */
  get: (url) => request('GET', url),

  /**
   * Send a POST request with a JSON body.
   * @param {string} url   Relative path or absolute URL.
   * @param {*}     [body] JSON-serializable request body.
   * @returns {Promise<*>} Parsed JSON response body.
   */
  post: (url, body) => request('POST', url, body)
}
