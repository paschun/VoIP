import { jwtVerify } from 'jose'
import { factory } from '../core/factory.ts'
import type { AuthUser } from '../core/factory.ts'
import type { ApiError } from '../../shared/api-contracts.ts'
import { jwtSecret } from '../helper/common.helper.ts'

// todo: look at https://hono.dev/docs/middleware/builtin/bearer-auth
// https://hono.dev/docs/middleware/builtin/jwt

// Verifies the JWT in the `token` header (jose), stashes the payload as `c.set('user', …)` for downstream handlers,
// and short-circuits with a 401 carrying the shared `ApiError` shape (`{ message }`) -- the frontend's `handleError`
// reads `data.message` (it still falls back to the legacy `data.error`). Returning a Response from middleware (instead
// of calling `next()`) is how Hono short-circuits.
export const auth = factory.createMiddleware(async (c, next) => {
  const token = c.req.header('token')
  if (token) {
    try {
      const { payload } = await jwtVerify(token, jwtSecret)
      // todo: no cast
      c.set('user', payload as unknown as AuthUser)
      await next()
      return
    } catch {
      /* invalid/expired token → fall through to 401 below */
    }
  }
  return c.json({ message: 'Unauthorized Access!' } satisfies ApiError, 401)
})
