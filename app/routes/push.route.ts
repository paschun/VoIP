import { Hono } from 'hono'
import * as push from '../controller/push.controller.ts'
import type { Env } from '../core/factory.ts'

// Routes for `/api/push`.
export const pushRoutes = new Hono<Env>()
  .get('/key', ...push.publicKey)
  .post('/subscribe', ...push.create)
  .delete('/subscribe', ...push.remove)
