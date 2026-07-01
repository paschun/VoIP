import { Hono } from 'hono'
import * as user from '../controller/user.controller.ts'
import type { Env } from '../core/factory.ts'

// Routes for `/api/auth`.
// The first block is unauthenticated (login/signup/version checks, plus the login-time TOTP check).
// The second is authenticated account + TOTP enrollment management.
export const authRoutes = new Hono<Env>()
  // unauthed routes
  .post('/login', ...user.login)
  .post('/register', ...user.register)
  .post('/totp/verify', ...user.totpVerify)
  .get('/signup-enabled', ...user.signupEnabled)
  .get('/version', ...user.getVersion)
  .get('/version/update-available', ...user.getUpdateAvailable)
  // authed routes
  .patch('/username', ...user.updateUsername)
  .put('/password', ...user.updatePassword)
  .post('/password/verify', ...user.passwordVerify)
  .delete('/account', ...user.deleteAccount)
  .get('/me', ...user.getCurrentUser)
  .post('/totp/qr', ...user.totpQr)
  .post('/totp', ...user.totpEnable)
  .delete('/totp', ...user.totpDisable)
