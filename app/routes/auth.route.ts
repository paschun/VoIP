import { Hono } from 'hono'
import type { Env } from '../factory.ts'
import * as user from '../controller/user.controller.ts'

// Routes for `/api/auth`. The first block is unauthenticated (login/signup/version/directory checks); the second is
// authenticated account + MFA management. Verbs are REST-honest: GET for pure reads, PATCH/PUT for updates, DELETE for
// account removal (the password is sent in the body to confirm).
export const authRoutes = new Hono<Env>()
  .post('/login', ...user.login)
  .post('/register', ...user.register)
  .post('/otp/verify', ...user.otpVerify)
  .get('/signup-enabled', ...user.signupEnabled)
  .get('/version', ...user.getVersion)
  .get('/version/update-available', ...user.getUpdateAvailable)
  .get('/directory-name', ...user.getDirectoryName)

  .patch('/username', ...user.updateUsername)
  .put('/password', ...user.updatePassword)
  .post('/password/verify', ...user.passwordVerify)
  .delete('/account', ...user.deleteAccount)
  .get('/me', ...user.getCurrentUser)
  .post('/mfa', ...user.saveMfa)
