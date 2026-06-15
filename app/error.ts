import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ApiError } from '../shared/api-contracts.ts'

/**
 * The single error sink for the Hono server (`error-handling-plan.md` §2). Attach it to the **root** app at the
 * server-swap step: `app.onError(onError)`. It can't be wired yet — there's no root Hono app while Express still serves
 * and each group is a standalone `new Hono<Env>()` built in parallel — but handlers already `throw new HTTPException(…)`
 * against this contract, so wiring it is a one-liner when the root app is created.
 *
 * A thrown `HTTPException` carries an intended client message + status (translated failures, 401 auth, etc.); anything
 * else is an unexpected server fault — logged ONCE here (not per-handler) and returned as a generic 500. Both paths
 * emit the one wire shape, `{ message } satisfies ApiError`.
 */
export function onError(err: Error, c: Context) {
  if (err instanceof HTTPException) {
    return c.json({ message: err.message } satisfies ApiError, err.status)
  }
  console.error(err)
  // todo: can we be more informative than "something went wrong"
  return c.json({ message: 'Something went wrong' } satisfies ApiError, 500)
}
