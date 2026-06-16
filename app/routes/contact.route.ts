import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as contact from '../controller/contact.controller.ts'

// Routes for `/api/contact`.
export const contactRoutes = new Hono<Env>()
  .get('/lookup', ...contact.lookup)
  .get('/', ...contact.getAll)
  .post('/', ...contact.create)
  .post('/bulk', ...contact.bulk)
  .put('/:id', ...contact.update)
  .delete('/:id', ...contact.remove)
  .delete('/', ...contact.removeAll)
