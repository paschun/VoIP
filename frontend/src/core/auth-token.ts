import { useLocalStorage } from '@vueuse/core'
import { z } from 'zod'

const expClaim = z.object({ exp: z.number() })

/** Unix-seconds `exp` off a JWT payload, or null when unreadable. The signature is never checked here -- that is the server's job. */
function expiry(token: string): number | null {
  const payload = token.split('.')[1]
  if (!payload) return null
  try {
    // JWT segments are base64url; `atob` only reads standard base64, so map its two differing chars back.
    return expClaim.safeParse(JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/')))).data?.exp ?? null
  } catch (e) {
    console.error(e)
    return null
  }
}

/** An unreadable/absent `exp` counts as live: only the server can rule on such a token. */
const expired = (token: string) => {
  const exp = expiry(token)
  return exp !== null && exp * 1000 <= Date.now()
}

/** `''` is the logged-out sentinel, so it has to pass alongside a real token. */
const storedToken = z
  .jwt()
  .refine((token) => !expired(token))
  .or(z.literal(''))

/**
 * Bearer token sent as the `Authorization` header on every API call, persisted to localStorage (survives refresh). Lives in a
 * leaf module (imports nothing app-level) so the RPC client and the user store can both read/write it without an import
 * cycle -- the client must stay independent of the store so route types can be inferred from `client`.
 *
 * Empty string (not null) is the logged-out value; the serializer stores the token raw (unquoted) and drops a stored
 * value that is not a well-formed JWT.
 *
 * module-level singleton ref. Not a `use*` composable because it does not have logic that would be re-used across components.
 * There is only one of these refs per-app that is shared across all components.
 * Having it be a `use*` would mean there are many copies across the app.
 */
export const authToken = useLocalStorage('access_token', '', {
  serializer: {
    read: (raw) => storedToken.safeParse(raw).data ?? '',
    write: (value) => value,
  },
})

/**
 * Whether a usable token is held -- present and not past its own `exp`. Expiry is time-dependent, so this is a call,
 * not a computed: read it at the moment the answer matters (a navigation), never cache it.
 */
export const sessionActive = () => authToken.value !== '' && !expired(authToken.value)
