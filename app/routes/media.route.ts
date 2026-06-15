import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as media from '../controller/media.controller.ts'

export const mediaRoutes = new Hono<Env>().post('/upload-files', ...media.upload)
