import { createFactory } from 'hono/factory'
import type { AuthUser } from './middleware/auth.middleware.ts'

// Shared, typed Hono factory for the (in-progress) migration off Express. One factory means the `Env` below is
// defined once: every middleware/handler built from it sees `c.get('user')` / `c.var.user` as `AuthUser` without
// re-declaring the type. `Variables.user` is populated by the auth middleware (`./middleware/auth.hono.ts`) and is
// only present on routes guarded by it — same contract the old Express `req.user` had.
export type Env = { Variables: { user: AuthUser } }

export const factory = createFactory<Env>()
