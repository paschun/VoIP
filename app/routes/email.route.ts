import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as email from '../controller/email.controller.ts'

// Hono route group for `/api/email` (migrated off Express). Methods are chained and each controller export is a
// `factory.createHandlers(...)` array spread in — chaining + spreading is what lets RPC infer this group later. Mounted
// via `app.route('/api/email', emailRoutes)` once the server swap lands; until then it's defined but not served.
export const emailRoutes = new Hono<Env>()
  .post('/create', ...email.create)
  .get('/setting-get', ...email.getEmail)
  .post('/save/setting', ...email.saveSetting)
