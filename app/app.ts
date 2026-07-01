import { readFile } from 'node:fs/promises'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { bodyLimit } from 'hono/body-limit'
import type { ApplyGlobalResponse } from 'hono/client'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import type { ApiError } from '../shared/api-contracts.ts'
import { MAX_UPLOAD_BYTES } from './controller/media.controller.ts'
import { connectDB } from './core/db.ts'
import { env } from './core/env.ts'
import { onError } from './core/error.ts'
import { factory } from './core/factory.ts'
import { initIO } from './core/socket.ts'
import { appDirectoryGate } from './middleware/app-directory.ts'
import { rateLimit } from './middleware/rate-limit.ts'
import { authRoutes } from './routes/auth.route.ts'
import { callRoutes } from './routes/call.route.ts'
import { contactRoutes } from './routes/contact.route.ts'
import { emailRoutes } from './routes/email.route.ts'
import { hardwarekeyRoutes } from './routes/hardwarekey.route.ts'
import { mediaRoutes } from './routes/media.route.ts'
import { profileRoutes } from './routes/profile.route.ts'
import { providerRoutes } from './routes/provider.route.ts'
import { settingRoutes } from './routes/setting.route.ts'

// `factory.createApp()` (not `new Hono()`) so the root app carries the factory's `Env` -- `c.get('user')` is typed
// `AuthUser` on guarded routes without re-declaring the generic here (the same factory builds every group's handlers).
const app = factory.createApp()

// Every uncaught error from any handler/sub-app funnels here and is rendered once as `{ message }` (see core/error.ts).
app.onError(onError)

// Branded static error page served by the backend for the HTTPS backstop and the app-directory gate's 404s.
const errorPage = await readFile('./app/static/error.html', 'utf8')

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

// Cache headers (set after the handler so they win): hashed build assets under /static/ are content-addressed and cached
// forever; everything else (index.html, API JSON) and every mutating request must revalidate so deploys show up at once.
app.use('*', async (c, next) => {
  await next()
  if (c.req.method !== 'GET') c.header('Cache-Control', 'no-store')
  else if (c.req.path.startsWith('/static/')) c.header('Cache-Control', 'public, max-age=31536000, immutable')
  else c.header('Cache-Control', 'no-store')
})

// Security headers (helmet equivalent). CSP mirrors the directives the app shipped: default-src allows the Twilio SDK +
// ws/wss for the voice socket; script-src keeps unsafe-eval/inline; style-src keeps unsafe-inline for Vue's scoped CSS.
// COOP/CORP/Origin-Agent-Cluster are left off to preserve the exact header set this app shipped before.
// todo: audit these
app.use(
  secureHeaders({
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    originAgentCluster: false,
    contentSecurityPolicy: {
      defaultSrc: ["'self'", 'sdk.twilio.com', 'wss:', 'ws:', 'eventgw.twilio.com'],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      upgradeInsecureRequests: [],
    },
  }),
)

// Dev only: the Vite dev server (localhost:8080) calls the API cross-origin. In prod the API and UI are same-origin, so
// CORS never applies and this is skipped.
if (!env.HTTPS) app.use(cors({ origin: ['http://localhost:8080'] }))

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
app.use('/*', serveStatic({ root: './frontend/dist' })) // static assets
app.get('*', serveStatic({ path: './frontend/dist/index.html' })) // SPA fallback

// Startup
// -------
await connectDB()
const server = serve({ fetch: app.fetch, port: env.PORT })
initIO(server)
console.log('hono listening on PORT', env.PORT)
