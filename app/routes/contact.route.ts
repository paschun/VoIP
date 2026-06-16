import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as contact from '../controller/contact.controller.ts'

// Hono route group for `/api/contact` (migrated off Express). Mounted via `app.route('/api/contact', contactRoutes)`
// at the server swap.
export const contactRoutes = new Hono<Env>()
  .get('/lookup', ...contact.lookup)
  .get('/', ...contact.getAll)
  .post('/', ...contact.create)
  .post('/bulk', ...contact.bulk)
  .put('/:id', ...contact.update)
  .delete('/:id', ...contact.remove)
  .delete('/', ...contact.removeAll)
