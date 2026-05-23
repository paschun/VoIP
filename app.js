const path = require('node:path')
const http = require('node:http')
const { Server } = require('socket.io')
const express = require('express')
const { rateLimit } = require('express-rate-limit')
const helmet = require('helmet')
const cors = require('cors')
const session = require('cookie-session')
const compression = require('compression')
const mongoose = require('./config/db.config');

const app = express()
app.use(compression())

const expiryDate = new Date(Date.now() + 60 * 60 * (1000 * 12 * 30)) // 30 day
app.use(session({
  name: 'session',
  keys: [process.env.COOKIE_KEY], // could hypothetically have process.env.COOKIE_KEY2 , but need to change other refs
  cookie: {
    secure: true,
    httpOnly: true,
    expires: expiryDate
  }
}))

const setCache = (req, res, next) => {
  if (req.method !== 'GET') {
    // Mutating requests should never be cached.
    res.set('Cache-Control', 'no-store')
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

app.use(
  helmet.contentSecurityPolicy({
    useDefaults: true,
    reportOnly: false,
    directives: {
      "default-src": ["'self'", "sdk.twilio.com","wss:","ws:","eventgw.twilio.com"],
      "object-src": ["'self'"],
      "script-src": ["'self'","'unsafe-eval'", "'unsafe-inline'"]
    },
  })
);
//sdk.twilio.com
app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());
app.disable('x-powered-by');
app.set('trust proxy', 1)
const server = http.createServer(app);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('database connected successfully!');
});

//app.use(cors());
app.use(cors({ origin: ['http://localhost:8080'], }))

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 100,
  message: "Slow down your requests!",
  legacyHeaders: false,
  standardHeaders: 'draft-8',
});
// apply rate limiter to all requests
app.use(limiter);

global.io = new Server(server, { cors: { origin: '*' } });
io.on('connection', socket => {
  console.log('a user connected');
  socket.on('join_channel', (channel) => {
    console.log(`${channel} user joined channel`);
    socket.join(channel);
  });
  socket.on('join_profile_channel', (channel) => {
    console.log(`${channel} user joined channel`);
    socket.join(channel);
  });
});

app.get('/version.md', (_req, res) => {
  res.sendFile(path.join(__dirname, './version.md'));
});
// app.enable('trust proxy')
if (process.env.HTTPS?.trim() === 'true') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https'){
      if(req.url === '/get-base-url'){
        next()
        // res.status(200).json({url: process.env.BASE_URL.trim()});
      }else{
        res.sendFile(path.join(__dirname, './error/index.html'));
      }
    } else {
      next()
    }
  })

  /* app.use((req, res, next) => {
    console.log(req.url)
    console.log(req.secure)
    if (req.secure || req.url === '/error') {
      next()
    } else if(req.url == '/get-base-url'){
      res.status(200).json({url: process.env.BASE_URL.trim()});
    }else{
      // res.sendFile(path.join(__dirname, './error/index.html'));
    }
  }) */
}

// parse requests of content-type - application/json
app.use(express.json({ limit: '500mb' }));
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true, limit: '500mb', parameterLimit: 10000000 }));

// Serve built frontend assets BEFORE the catch-all routes below,
// otherwise requests like /static/index-XXX.js fall through to the wildcard handler and get index.html (causing MIME type errors).
app.use(express.static(path.join(__dirname, './frontend/dist')));
app.use('/uploads', express.static('uploads'));

// API + explicit routes must be registered BEFORE the SPA wildcard below, otherwise the wildcard swallows them and returns index.html.
require("./app/routes/auth.route")(app);
require("./app/routes/setting.route")(app);
require("./app/routes/profile.route")(app);
require("./app/routes/media.route")(app);
require("./app/routes/contact.route")(app);
require("./app/routes/email.route")(app);
require("./app/routes/call.route")(app);
require("./app/routes/hardwarekey.route")(app);

app.get('/api/users/', (_req, res) => {
  res.status(200).json({message: 'success'});
});

app.get('/get-base-url', (_req, res) => {
  res.status(200).json({url: process.env.BASE_URL.trim()});
});

app.get('/error', (_req, res) => {
  res.sendFile(path.join(__dirname, './error/index.html'));
});

// SPA history-mode fallback — MUST be last.
// Any URL that wasn't matched by a static file or API route above lands
// here and gets index.html so the client-side router (Vue) can take over.
// This is what makes deep links like /profile/john or /settings/foo/bar work on page refresh.
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, './frontend/dist/index.html'));
});

console.log('express listening on PORT', process.env.PORT)
server.listen(process.env.PORT)
