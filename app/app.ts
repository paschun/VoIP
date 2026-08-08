import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { bodyLimit } from 'hono/body-limit'
import type { ApplyGlobalResponse } from 'hono/client'
import { compress } from 'hono/compress'
import { etag } from 'hono/etag'
import { secureHeaders } from 'hono/secure-headers'
import type { ApiError } from './contracts/envelope.ts'
import { MAX_UPLOAD_BYTES } from './controller/media.controller.ts'
import { startUpdateChecker } from './controller/user.controller.ts'
import { connectDB } from './core/db.ts'
import { env } from './core/env.ts'
import { onError } from './core/error.ts'
import { factory } from './core/factory.ts'
import { eventRoutes } from './core/sse.ts'
import { manifestPath, webManifest } from './helper/manifest.helper.ts'
import { appDir, appDirectoryGate } from './middleware/app-directory.ts'
import { cacheControl } from './middleware/cache-control.ts'
import { rateLimit } from './middleware/rate-limit.ts'
import { authRoutes } from './routes/auth.route.ts'
import { callRoutes } from './routes/call.route.ts'
import { contactRoutes } from './routes/contact.route.ts'
import { emailRoutes } from './routes/email.route.ts'
import { hardwarekeyRoutes } from './routes/hardwarekey.route.ts'
import { mediaRoutes } from './routes/media.route.ts'
import { profileRoutes } from './routes/profile.route.ts'
import { providerRoutes } from './routes/provider.route.ts'
import { pushRoutes } from './routes/push.route.ts'
import { settingRoutes } from './routes/setting.route.ts'
// Branded static error page served by the backend for the HTTPS backstop and the app-directory gate's 404s.
const errorPage = await readFile('./app/static/error.html', 'utf8')

// `factory.createApp()` (not `new Hono()`) so the root app carries the factory's `Env` -- `c.get('user')` is typed
// `AuthUser` on guarded routes without re-declaring the generic here (the same factory builds every group's handlers).
const app = factory.createApp()

// Every uncaught error from any handler/sub-app funnels here and is rendered once as `{ message }` (see core/error.ts).
app.onError(onError)

// First middleware, applied to every request
app.use('*', rateLimit)

// HTTPS enforcement (prod only)
// -----------------------------
// Render terminates TLS upstream, so the original client protocol is read from x-forwarded-proto; anything that arrived
// over plain HTTP gets the static error page. In dev (HTTP, no proxy) this is skipped.
if (env.HTTPS) {
  app.use('*', async (c, next) => {
    if (c.req.header('x-forwarded-proto') !== 'https') return c.html(errorPage)
    await next()
  })
}

// Core middleware
// ---------------
app.use(compress())
app.use('*', cacheControl)

// Security headers. Only two directives are provider-specific: connect-src allows wss: for the
// Twilio and Telnyx WebRTC signaling sockets, and media-src allows sdk.twilio.com for Twilio's hosted ringtone/DTMF
// audio (blob:/mediastream: cover the live WebRTC audio, maybe unnecessary). Everything else is same-origin -- both SDKs are bundled, not
// pulled from a CDN. COOP/CORP/Origin-Agent-Cluster keep secure-headers' defaults; unsafe-eval/unsafe-inline are for
// the bundled Vue runtime and its scoped styles.
app.use(
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      connectSrc: ["'self'", 'wss:'],
      fontSrc: ["'self'", 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      mediaSrc: ["'self'", 'blob:', 'mediastream:', 'https://sdk.twilio.com'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      upgradeInsecureRequests: [],
    },
  }),
)

// Coarse request-body backstop. The only large body is the media upload, which enforces its own MAX_UPLOAD_BYTES cap
// per-request (media.controller); every other endpoint is small JSON -- text, IDs, provider config, media URLs (never
// base64). This global ceiling is that same cap scaled up for multipart boundary/header/field overhead, so it never
// preempts the media route's stricter limit while still rejecting absurd payloads.
const MULTIPART_OVERHEAD_FACTOR = 1.2
app.use(bodyLimit({ maxSize: Math.ceil(MAX_UPLOAD_BYTES * MULTIPART_OVERHEAD_FACTOR) }))

// API routes
// ----------
// Registered before the static handlers so `/api/*` never falls through to the SPA. The /api/call and /api/setting
// mounts must match the prefix baked into the provider webhook URLs (see WEBHOOKS in helper/webhook-paths.ts).
// Chained (not statement-per-line) so the accumulated per-route schema is captured in one type: `AppType` is the RPC
// contract the frontend `hc<AppType>` client consumes (see frontend/src/core/rpc.client.ts). `app` is the same
// instance, so the later static/SPA `app.use`/`app.get` statements below still apply.
const routes = app
  .route('/api/auth', authRoutes)
  .route('/api/call', callRoutes)
  .route('/api/contact', contactRoutes)
  .route('/api/email', emailRoutes)
  .route('/api/hardwarekey', hardwarekeyRoutes)
  .route('/api/media', mediaRoutes)
  .route('/api/profile', profileRoutes)
  .route('/api/provider', providerRoutes)
  .route('/api/setting', settingRoutes)
  .route('/api/push', pushRoutes)

// Server->client push over SSE (`GET /api/events`). Registered outside the `routes` RPC chain: the frontend connects
// with a native EventSource (see frontend composables/useServerEvents.ts), not the hc client, so it needs no `AppType` entry.
app.route('/api', eventRoutes)

// `onError` (core/error.ts) renders every thrown error as `{ message }` at the HTTPException's status, but `hc` can't
// infer responses from a global error handler -- so `ApplyGlobalResponse` merges the error contract into every route.
// Statuses: controllers throw 400/401/403/404/409/422; onError adds 502 (ProviderError) and 500 (fallback).
type ApiErrors = {
  400: { json: ApiError }
  401: { json: ApiError }
  403: { json: ApiError }
  404: { json: ApiError }
  409: { json: ApiError }
  422: { json: ApiError }
  500: { json: ApiError }
  502: { json: ApiError }
}

/** The RPC API surface: every `/api/...` route with its validated input, `c.json()` output, and error contract. Consumed by `hc<AppType>`. */
export type AppType = ApplyGlobalResponse<typeof routes, ApiErrors>

// Static assets + SPA fallback
// ----------------------------
// Gate the SPA entry behind the configured secret directory (app/middleware/app-directory.ts). Registered after the
// API mounts (so `/api/*` is handled first and passes through) but before the static handlers (so it wraps them);
// it's a plain `app.use`, not part of the `routes` chain, so `AppType`/RPC inference is untouched.
app.use('*', appDirectoryGate(errorPage))

// Uploaded media, then the built frontend; any unmatched path serves index.html so the Vue router handles deep links.
app.use('/uploads/*', serveStatic({ root: './' }))

// ETag/304 revalidation for the static tier below (manifest, icons, sw.js, hashed assets, SPA HTML). Placed after the
// API mounts so it never hashes JSON/SSE bodies, and after /uploads so immutable multi-MB media isn't buffered for a
// digest. Weak: compress() encodes the body downstream of the digest, so the tag can't promise byte-identity.
app.use('*', etag({ weak: true }))

// The PWA manifest is generated, not a build asset, so start_url/scope track the configured directory. Serving it only
// at the directory's own path keeps it from disclosing that directory; index.html links it relatively to match.
app.get(manifestPath(appDir), (c) => c.json(webManifest(appDir), 200, { 'Content-Type': 'application/manifest+json' }))
// Only mount the built-frontend handlers when a build exists; in dev the Vite server serves the SPA and proxies /api,
// so skipping them here avoids serveStatic's "root path not found" warning on every request.
if (existsSync('./frontend/dist')) {
  app.use('/*', serveStatic({ root: './frontend/dist' })) // static assets
  app.get('*', serveStatic({ path: './frontend/dist/index.html' })) // SPA fallback
}

// Startup
// -------
await connectDB()
startUpdateChecker() // Poll GitHub for a newer build in the background (once now, then daily)
serve({ fetch: app.fetch, port: env.PORT })
// render.com does not support using HTTP2 on the backend. Must be http1.1 to talk to tls termination proxy
console.log('hono listening on PORT', env.PORT)

// import { showRoutes } from 'hono/dev'
// showRoutes(app, {
//   verbose: true,
// })