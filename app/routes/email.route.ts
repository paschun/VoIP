import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as email from '../controller/email.controller.ts'

// Hono route group for `/api/email` (migrated off Express). Methods are chained and each controller export is a
// `factory.createHandlers(...)` array spread in — chaining + spreading is what lets RPC infer this group later. Mounted
// via `app.route('/api/email', emailRoutes)` once the server swap lands; until then it's defined but not served.
export const emailRoutes = new Hono<Env>()
  // The user's email (SMTP/PGP) settings are a singleton resource (one doc per user), so an idempotent upsert is a PUT.
  .put('/setting', ...email.create)
  .get('/setting', ...email.getEmail)
  // TODO: `/notification` doesn't belong under `/api/email` — it flips `emailnotification` on a profile's `Setting`
  // doc, not the email-settings resource. Move it into the `setting` controller/route group (e.g.
  // `PATCH /api/setting/:id/notification`) when that group is ported.
  .patch('/notification', ...email.saveSetting)
