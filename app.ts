import path from 'node:path'
import http from 'node:http'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import cors from 'cors'
import cookieSession from 'cookie-session'
import compression from 'compression'
import { env } from './config/env.ts'
import { connectDB } from './config/db.config.ts'
import { initIO } from './app/socket.ts'
import authRoute from './app/routes/auth.route.ts'
import settingRoute from './app/routes/setting.route.ts'
// NOTE: email, media, profile and contact are migrated to Hono (their route files now export Hono groups,
// `emailRoutes` / `mediaRoutes` / `profileRoutes` / `contactRoutes`). They are not wired here anymore; they get served
// by the Hono server at the upcoming server-swap step. The other 4 groups still run on Express below.
import callRoute from './app/routes/call.route.ts'
import hardwarekeyRoute from './app/routes/hardwarekey.route.ts'

// App & settings
// --------------
const app = express()
app.disable('x-powered-by')

// Rate limiting
// -------------
// First middleware, so it applies to all requests.
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100,
  message: "Slow down your requests!",
  legacyHeaders: false,
  standardHeaders: 'draft-8',
});
app.use(limiter);

// Proxy & HTTPS (prod only)
// -------------------------
// Behind Render's TLS-terminating proxy, two concerns:
//   1. trust proxy → trust X-Forwarded-* so req.ip (and the rate limiter above) see real client IPs, not the
//      proxy's, and secure cookies work. Only enabled here because trusting X-Forwarded-For when NOT behind a
//      trusted proxy lets clients spoof their IP. Set to 1 (trust first hop), not the permissive `true`.
//   2. HTTPS enforcement → the proxy makes req.secure false, so the original client protocol is read from
//      x-forwarded-proto directly; anything that arrived over plain HTTP gets a static error page.
// In dev (HTTP, no proxy) none of this is registered.
if (env.HTTPS) {
  app.set('trust proxy', 1)
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.sendFile(path.join(import.meta.dirname, './error/index.html'));
    } else {
      next()
    }
  })
}

// Core middleware
// ---------------
// Compression, session, cache headers.
app.use(compression())

app.use(cookieSession({
  name: 'session',
  keys: [env.COOKIE_KEY], // could hypothetically have a COOKIE_KEY2 , but need to change other refs
  httpOnly: true,
  secure: env.HTTPS,
  sameSite: 'strict',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
}))

const setCache = (req, res, next) => {
  if (req.method !== 'GET') {
    res.set('Cache-Control', 'no-store') // Mutating requests should never be cached.
  } else if (req.path.startsWith('/static/')) {
    // Hashed build assets (e.g. /static/index-DIsi5uhx.js) are content-addressed, so they can be cached aggressively.
    res.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else {
    // Everything else (index.html, API JSON, etc.) must revalidate so users see new deploys immediately.
    res.set('Cache-Control', 'no-store')
  }
  next()
}
app.use(setCache)

// Security
// --------
// helmet headers + CORS. helmet() applies all its default protections in one call. The three defaults disabled below
// (COOP/CORP/Origin-Agent-Cluster) are off to preserve the exact header set this app shipped before — re-enable them
// deliberately if desired.
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    reportOnly: false,
    directives: {
      "default-src": ["'self'", "sdk.twilio.com", "wss:", "ws:", "eventgw.twilio.com"],
      "object-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-eval'", "'unsafe-inline'"]
    },
  },
}));

// Dev only: the Vite dev server (localhost:8080) calls the API cross-origin, so it needs an allowlist entry. In prod
// (HTTPS=true) the API and UI are same-origin, so CORS never applies and this is skipped.
if (!env.HTTPS) { // assume dev when HTTPS is false
  app.use(cors({ origin: ['http://localhost:8080'] }))
}

// Body parsing
// ------------
// Must run before the route modules, which read req.body.

// parse requests of content-type - application/json
app.use(express.json({ limit: '500mb' }));
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true, limit: '500mb', parameterLimit: 10000000 }));

// Static assets
// -------------
// Registered BEFORE the catch-all routes below, otherwise requests like /static/index-XXX.js fall through to the
// wildcard handler and get index.html (causing MIME type errors).
app.use(express.static(path.join(import.meta.dirname, './frontend/dist')));
app.use('/uploads', express.static('uploads'));

// API routes
// ----------
// Must be registered BEFORE the SPA wildcard below, otherwise the wildcard swallows them and returns index.html.
authRoute(app);
settingRoute(app);
callRoute(app);
hardwarekeyRoute(app);

// SPA fallback
// ------------
// MUST be last. Any URL that wasn't matched by a static file or API route above lands here and gets index.html so the
// client-side router (Vue) can take over. This makes deep links like /profile/john work on refresh.
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(import.meta.dirname, './frontend/dist/index.html'));
});

// Startup
// -------
const server = http.createServer(app);

await connectDB()
initIO(server);

console.log('express listening on PORT', env.PORT)
server.listen(env.PORT)
