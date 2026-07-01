import { Hono } from 'hono'
import type { Env } from '../core/factory.ts'
import * as email from '../controller/email.controller.ts'

// Routes for `/api/email`: the user's SMTP/PGP email config. It's a singleton (one Email doc per user), so the group
// root IS the resource -- an idempotent upsert is a PUT, the read is a GET.
export const emailRoutes = new Hono<Env>()
  .put('/', ...email.create)
  .get('/', ...email.getEmail)
