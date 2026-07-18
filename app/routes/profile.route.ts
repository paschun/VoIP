import { Hono } from 'hono'
import * as profile from '../controller/profile.controller.ts'
import type { Env } from '../core/factory.ts'

// Routes for `/api/profile`: profile lifecycle (CRD) plus provider config.
export const profileRoutes = new Hono<Env>()
  .post('/', ...profile.create)
  .patch('/:id', ...profile.rename)
  .post('/provider', ...profile.saveProvider)
  .get('/', ...profile.getAll)
  .get('/:id', ...profile.getOne)
  .delete('/:id/provider', ...profile.disconnectProvider)
  .delete('/:id', ...profile.deleteProfile)
