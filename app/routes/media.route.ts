import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as media from '../controller/media.controller.ts'

// Hono route group for `/api/media` (migrated off Express). Mounted via `app.route('/api/media', mediaRoutes)` once the
// server swap lands; until then it's defined but not served. POST to the `uploads` collection creates a new file
// (each upload writes a fresh hashed file → non-idempotent), so it stays a POST.
export const mediaRoutes = new Hono<Env>().post('/uploads', ...media.upload)
