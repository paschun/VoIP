import { SignJWT } from 'jose'
import { env } from '../../config/env.ts'

// Mint a real token the way the app expects it: HS256 over COOKIE_KEY, carrying the AuthUser payload the auth
// middleware (app/middleware/auth.hono.ts) verifies and stashes as `c.get('user')`. Tests pass it in the `token` header.
const secret = new TextEncoder().encode(env.COOKIE_KEY)

/** Sign a JWT for a test user; only `id` matters to the profile/hardwarekey controllers. */
export function signToken (id: string, name = 'Test User'): Promise<string> {
  return new SignJWT({ id, name }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('30d').sign(secret)
}
