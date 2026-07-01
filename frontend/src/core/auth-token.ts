import { useLocalStorage } from '@vueuse/core'

/**
 * Bearer token sent as the `token` header on every API call, persisted to localStorage (survives refresh). Lives in a
 * leaf module (imports nothing app-level) so the RPC client and the user store can both read/write it without an import
 * cycle -- the client must stay independent of the store so route types can be inferred from `client`.
 *
 * Empty string (not null) is the logged-out value, so the string serializer stores the token raw (unquoted).
 *
 * module-level singleton ref. Not a `use*` composable because it does not have logic that would be re-used across components.
 * There is only one of these refs per-app that is shared across all components.
 * Having it be a `use*` would mean there are many copies across the app.
 */
export const authToken = useLocalStorage('access_token', '')
