import { readFile } from 'node:fs/promises'
import { Hono } from 'hono'
import { compress } from 'hono/compress'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { bodyLimit } from 'hono/body-limit'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { env } from './config/env.ts'
import { connectDB } from './config/db.config.ts'
import { initIO } from './app/socket.ts'
import { onError } from './app/error.ts'
import { rateLimit } from './app/middleware/rate-limit.ts'
import { authRoutes } from './app/routes/auth.route.ts'
import { callRoutes } from './app/routes/call.route.ts'
import { contactRoutes } from './app/routes/contact.route.ts'
import { emailRoutes } from './app/routes/email.route.ts'
import { hardwarekeyRoutes } from './app/routes/hardwarekey.route.ts'
import { mediaRoutes } from './app/routes/media.route.ts'
import { MAX_UPLOAD_BYTES } from './app/controller/media.controller.ts'
import { profileRoutes } from './app/routes/profile.route.ts'
import { providerRoutes } from './app/routes/provider.route.ts'
import { settingRoutes } from './app/routes/setting.route.ts'

const app = new Hono()

// Every uncaught error from any handler/sub-app funnels here and is rendered once as `{ message }` (see app/error.ts).
app.onError(onError)

// First middleware, applied to every request
app.use('*', rateLimit)

// HTTPS enforcement (prod only)
// -----------------------------
// Render terminates TLS upstream, so the original client protocol is read from x-forwarded-proto; anything that arrived
// over plain HTTP gets the static error page. In dev (HTTP, no proxy) this is skipped.
if (env.HTTPS) {
  const errorPage = await readFile('./error/index.html', 'utf8')
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
app.use(secureHeaders({
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  originAgentCluster: false,
  contentSecurityPolicy: {
    defaultSrc: ["'self'", "sdk.twilio.com", "wss:", "ws:", "eventgw.twilio.com"],
    baseUri: ["'self'"],
    fontSrc: ["'self'", "https:", "data:"],
    formAction: ["'self'"],
    frameAncestors: ["'self'"],
    imgSrc: ["'self'", "data:"],
    objectSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
    scriptSrcAttr: ["'none'"],
    styleSrc: ["'self'", "https:", "'unsafe-inline'"],
    upgradeInsecureRequests: [],
  },
}))

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
app.route('/api/auth', authRoutes)
app.route('/api/call', callRoutes)
app.route('/api/contact', contactRoutes)
app.route('/api/email', emailRoutes)
app.route('/api/hardwarekey', hardwarekeyRoutes)
app.route('/api/media', mediaRoutes)
app.route('/api/profile', profileRoutes)
app.route('/api/provider', providerRoutes)
app.route('/api/setting', settingRoutes)

// Static assets + SPA fallback
// ----------------------------
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
