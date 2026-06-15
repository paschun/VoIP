import { jwtVerify } from 'jose'
import { env } from '../../config/env.ts'
import { factory } from '../factory.ts'
import type { AuthUser } from './auth.middleware.ts'

const joseSecret = new TextEncoder().encode(env.COOKIE_KEY)

// Hono port of `auth.middleware.ts`. Verifies the JWT in the `token` header (jose), stashes the payload as
// `c.set('user', …)` for downstream handlers, and short-circuits with the SAME 401 JSON body the Express version
// returned (`{ error: 'Unauthorized Access!' }`) so the frontend's 401 handling is unchanged. Returning a Response
// from middleware (instead of calling `next()`) is how Hono short-circuits.
export const auth = factory.createMiddleware(async (c, next) => {
  const token = c.req.header('token')
  if (token) {
    try {
      const { payload } = await jwtVerify(token, joseSecret)
      c.set('user', payload as unknown as AuthUser)
      await next()
      return
    } catch {
      /* invalid/expired token → fall through to 401 below */
    }
  }
  return c.json({ error: 'Unauthorized Access!' }, 401)
})
