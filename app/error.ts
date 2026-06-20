import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import mongoose from 'mongoose'
import { ProviderError } from './provider-error.ts'
import type { ApiError } from '../shared/api-contracts.ts'

/**
 * A thrown `HTTPException` carries an intended client message + status (translated failures, 401 auth, etc.); anything
 * else is an unexpected server fault — logged ONCE here (not per-handler) and returned as a generic 500. Both paths
 * emit the one wire shape, `{ message } satisfies ApiError`.
 */
export function onError(err: Error, c: Context) {
  console.error(err)

  // unused rn
  // https://github.com/Automattic/mongoose/blob/9.7.1/lib/query.js#L4718
  // https://github.com/Automattic/mongoose/blob/9.7.1/lib/error/notFound.js#L25
  if (err instanceof mongoose.Error.DocumentNotFoundError) {
    // err.message has internal info (query filter + model name)
    return c.json({ message: err.message } satisfies ApiError, 404)
  }

  if (err instanceof HTTPException) {
    // returning err.status here widens the return type to CotentfulStatusCode
    return c.json({ message: err.message } satisfies ApiError, err.status)
  }

  // An upstream provider failed -- our server is healthy, so 502 (Bad Gateway), not 500. Log the detail (provider/op/
  // cause) but return a generic message; provider internals shouldn't reach the client.
  if (err instanceof ProviderError) {
    const { provider, op, status, cause } = err
    // after a thruthy check, TS narrows unknown to the "empty object type" `{}`
    // oxlint-disable-next-line typescript/no-base-to-string
    const ifx = (x: unknown) => x ? ` - ${x.toString()}` : ''
    return c.json({ message: `Upstream ${provider} request failed - ${op}${ifx(status)}${ifx(cause)}` } satisfies ApiError, 502)
  }

  return c.json({ message: err.toString() } satisfies ApiError, 500)
}
