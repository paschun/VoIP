import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as profile from '../controller/profile.controller.ts'

// Hono route group for `/api/profile` (migrated off Express). Mounted via `app.route('/api/profile', profileRoutes)`
// at the server swap.
export const profileRoutes = new Hono<Env>()
  .post('/', ...profile.create)
  .get('/', ...profile.getData)
  .get('/:id', ...profile.getOne)
  .delete('/:id', ...profile.deleteProfile)
