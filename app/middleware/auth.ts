import type { Context } from 'hono'
import { sign, verify } from 'hono/jwt'
import { z } from 'zod'
import type { ApiError } from '../../shared/api-contracts.ts'
import { env } from '../core/env.ts'
import { factory } from '../core/factory.ts'
import type { Env } from '../core/factory.ts'

// Stays custom rather than hono's builtin jwt() middleware: the builtin can't read the ws upgrade's `?token=`
// query, and it stashes the payload as `c.get('jwtPayload')` instead of our typed `user`.

/** The claims `signToken` puts in the JWT payload. */
const authUserClaims = z.object({ id: z.string(), name: z.string() })

/** The verified JWT payload, attached as `c.get('user')` on auth-guarded routes. */
export type AuthUser = z.infer<typeof authUserClaims>

/** Token lifetime: 30 days, in seconds (`exp` is a unix-seconds claim). */
const THIRTY_DAYS_IN_SECONDS = 30 * 24 * 60 * 60

/** Sign a 30-day HS256 JWT. Only `id` matters to the profile/hardwarekey controllers. */
export const signToken = (id: string, name: string): Promise<string> =>
  sign({ id, name, exp: Math.floor(Date.now() / 1000) + THIRTY_DAYS_IN_SECONDS }, env.COOKIE_KEY, 'HS256')

/** Verify a JWT and return its payload, or null when missing/invalid/expired. */
export async function verifyAuthToken(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null
  try {
    return authUserClaims.parse(await verify(token, env.COOKIE_KEY, 'HS256'))
  } catch (e) {
    // verify() errors on invalid/expired tokens
    // - https://hono.dev/docs/helpers/jwt#custom-error-types
    // - https://github.com/honojs/hono/blob/v4.12.30/src/utils/jwt/jwt.ts#L114
    // parse() error would mean a validly signed token but with wrong/different claims i.e. claims in payload changed
    console.error(e)
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

/** Extract the JWT from an `Authorization: Bearer <token>` header. */
const bearerToken = (c: Context<Env>) => {
  const [scheme, token] = c.req.header('Authorization')?.split(/\s+/) ?? []
  return scheme?.toLowerCase() === 'bearer' ? token : undefined
}

export const auth = makeAuth(bearerToken)

/** For the websocket upgrade: the JWT rides in `?token=` (browsers can't set headers on `new WebSocket`). */
export const wsAuth = makeAuth((c) => c.req.query('token'))
