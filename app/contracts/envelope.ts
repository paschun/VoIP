/**
 * The cross-cutting response envelope every backend handler sends and the frontend `request()` wrapper reads:
 * `Ok<T>` on success, `ApiError` on failure, `ApiResult<T>` as the discriminated union of the two. The frontend gets
 * these shapes through RPC inference (`AppType`), so it never imports this file directly. Per-endpoint request/response
 * contracts live alongside it in `app/contracts/*`.
 */
/** HTTP verbs used across the app -- the frontend `request()` wrapper and the backend's Telnyx REST caller. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Success body: just the payload. No `status`/`message` — the frontend reads neither on success (success toasts are
 * hardcoded client-side). Send via `c.json({ data } satisfies Ok, 200)`.
 */
export interface Ok<T = unknown> {
  data: T
}

/**
 * The single error shape on the wire — `message` is the one field the client consumes. Thrown server-side as
 * `HTTPException` and rendered once in `app.onError`; never part of a success contract. The frontend `request` helper
 * surfaces it (plus the HTTP status) as the failure arm of {@link ApiResult}.
 */
export interface ApiError {
  message: string
}

/**
 * Discriminated result of a frontend API call, built from the two wire shapes: on success the `Ok<T>` body tagged
 * `ok: true`; on failure the `ApiError` body plus the HTTP `status`, tagged `ok: false`. Call sites branch with
 * `if (!res.ok)` and read `res.data` / `res.message` -- no lossy `false` sentinel, no try/catch.
 */
export type ApiResult<T> = (Ok<T> & { ok: true }) | (ApiError & { ok: false; status?: number })

