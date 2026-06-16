import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as profile from '../controller/profile.controller.ts'

// Routes for `/api/profile`.
export const profileRoutes = new Hono<Env>()
  .post('/', ...profile.create)
  .get('/', ...profile.getData)
  .get('/:id', ...profile.getOne)
  .delete('/:id', ...profile.deleteProfile)
