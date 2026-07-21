import type { Context } from 'hono'
import { getConnInfo } from '@hono/node-server/conninfo'
import { env } from '../core/env.ts'
import { factory } from '../core/factory.ts'

// Could also use: https://honohub.dev/docs/rate-limiter

// Fixed-window in-memory rate limiter -- 60s window, 100 requests/IP. Entries for inactive IPs linger until the process
// restarts; for this app's traffic that's fine, and a single instance keeps the counter coherent.
const RATE_WINDOW_MS = 60 * 1000
const RATE_LIMIT = 100
const rateHits = new Map<string, { count: number; resetAt: number }>()

// Real client IP: behind Render's TLS proxy (HTTPS) trust the first X-Forwarded-For hop (like Express `trust proxy: 1`);
// in dev there's no proxy, so use the socket peer. Trusting XFF only behind a known proxy avoids client IP spoofing.
const clientIp = (c: Context): string => {
  if (env.HTTPS) {
    const firstHop = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    if (firstHop) return firstHop
  }
  return getConnInfo(c).remote.address ?? 'unknown'
}

/** Per-IP fixed-window rate limit. Mount first (`app.use('*', rateLimit)`) so it guards every request. */
export const rateLimit = factory.createMiddleware(async (c, next) => {
  const key = clientIp(c)
  const now = Date.now()
  const entry = rateHits.get(key)
  if (!entry || now > entry.resetAt) {
    rateHits.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS })
  } else if (++entry.count > RATE_LIMIT) {
    return c.text('Slow down your requests!', 429)
  }
  await next()
})
