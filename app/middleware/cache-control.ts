import { factory } from '../core/factory.ts'
import { manifestPath } from '../helper/manifest.helper.ts'
import { appDir } from './app-directory.ts'

// Cache-Control tiers, keyed on whether a URL's bytes can change. Applied after the handler so the header wins.
// no-store forbids keeping a copy
// no-cache allows keeping a copy but requires revalidating it

/** `/` redirects into the appdir or gets a 404, depending on APPDIRECTORY -- never index.html. */
const NO_STORE = new Set(['/', '/index.html'])
/** Stored but revalidated on every fetch: SW update checks must see new bytes immediately; unchanged checks 304 via ETag. */
const NO_CACHE = new Set(['/sw.js'])
/** A week rather than a year, since these URLs aren't content-addressed and a replaced icon still has to propagate.
 * ETag helps with these.
 */
const STABLE = new Set([
  '/favicon.ico',
  '/chat-cat.svg',
  '/apple-touch-icon-180x180.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/maskable-icon-512x512.png',
  manifestPath(appDir),
])
/** Content-hashed builds and write-once provider media, so a URL's bytes never change. */
const IMMUTABLE = ['/static/', '/uploads/']

/**
 * Sets the Cache-Control tier for every response. The catch-all must stay no-store: the SPA fallback serves
 * index.html for *any* unmatched path, and API JSON lands there too.
 */
export const cacheControl = factory.createMiddleware(async (c, next) => {
  await next()
  const { method, path } = c.req
  const cache =
    method !== 'GET' || NO_STORE.has(path) ? 'no-store'
    : NO_CACHE.has(path) ? 'no-cache'
    : IMMUTABLE.some((prefix) => path.startsWith(prefix)) ? 'public, max-age=31536000, immutable'
    : STABLE.has(path) ? 'public, max-age=604800'
    : 'no-store'
  c.header('Cache-Control', cache)
})
