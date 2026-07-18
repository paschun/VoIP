import { Hono } from 'hono'
import * as contact from '../controller/contact.controller.ts'
import type { Env } from '../core/factory.ts'

// Routes for `/api/contact`.
export const contactRoutes = new Hono<Env>()
  .get('/', ...contact.getAll)
  .post('/', ...contact.create)
  .post('/bulk', ...contact.bulk)
  .put('/:id', ...contact.update)
  .delete('/:id', ...contact.remove)
  .delete('/', ...contact.removeAll)
