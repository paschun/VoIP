import { Hono } from 'hono'
import type { Env } from '../core/factory.ts'
import * as hardwarekey from '../controller/hardwarekey.controller.ts'

// Routes for `/api/hardwarekey` -- the WebAuthn enrollment + login ceremony plus key management.
//
// The collection is REST: `GET /` lists the caller's keys, `DELETE /:id` removes one. The ceremony steps are
// non-idempotent server actions (they mint/consume one-time challenges), so they stay POST under `registration/*`
// (authenticated -- a logged-in user adding a key) and `authentication/*` (unauthenticated -- runs during login,
// before a token exists).
export const hardwarekeyRoutes = new Hono<Env>()
  .post('/registration/begin', ...hardwarekey.registrationBegin)
  .post('/registration/challenge', ...hardwarekey.registrationChallenge)
  .post('/registration/verify', ...hardwarekey.registrationVerify)
  .post('/authentication/challenge', ...hardwarekey.authenticationChallenge)
  .post('/authentication/verify', ...hardwarekey.authenticationVerify)
  .get('/', ...hardwarekey.listKeys)
  .delete('/:id', ...hardwarekey.deleteKey)
