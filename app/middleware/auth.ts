import type { Context } from 'hono'
import { jwtVerify } from 'jose'
import type { ApiError } from '../../shared/api-contracts.ts'
import { factory } from '../core/factory.ts'
import type { AuthUser, Env } from '../core/factory.ts'
import { jwtSecret } from '../helper/common.helper.ts'

// todo: look at https://hono.dev/docs/middleware/builtin/bearer-auth
// https://hono.dev/docs/middleware/builtin/jwt

/** Verify a JWT (jose) and return its payload, or null when missing/invalid/expired. */
export async function verifyAuthToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, jwtSecret)
    // todo: no cast
    return payload as unknown as AuthUser
  } catch {
    return null
  }
}

// Verifies the JWT, stashes the payload as `c.set('user', …)` for downstream handlers, and short-circuits with a 401
// carrying the shared `ApiError` shape (`{ message }`) -- the frontend's `handleError` reads `data.message` (it still
// falls back to the legacy `data.error`). Returning a Response from middleware (instead of calling `next()`) is how
// Hono short-circuits.
const makeAuth = (getToken: (c: Context<Env>) => string | undefined) =>
  factory.createMiddleware(async (c, next) => {
    const user = await verifyAuthToken(getToken(c))
    if (!user) return c.json({ message: 'Unauthorized Access!' } satisfies ApiError, 401)
    c.set('user', user)
    await next()
  })

export const auth = makeAuth((c) => c.req.header('token'))

/** For the websocket upgrade: the JWT rides in `?token=` (browsers can't set headers on `new WebSocket`). */
export const wsAuth = makeAuth((c) => c.req.query('token'))
