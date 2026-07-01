import { Hono } from 'hono'
import * as media from '../controller/media.controller.ts'
import type { Env } from '../core/factory.ts'

// Routes for `/api/media`. POST to the `uploads` collection creates a new file (each upload writes a fresh hashed
// file -> non-idempotent), so it stays a POST.
export const mediaRoutes = new Hono<Env>().post('/uploads', ...media.upload)
