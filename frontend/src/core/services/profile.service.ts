import { z } from 'zod'
import { client, request } from '@/core/rpc.client.ts'
import type { ApiResult, Profile } from '@shared/api-contracts.ts'

// The intent of the service layer is to separate the network/IO concerns (transport layer, RPC+request) out of the data store layer

/**
 * Validates the corrupted-localStorage case only -- NOT network responses (those are typed end-to-end from `AppType`
 * via the RPC client now). `useValidatedStorage` parses the persisted `activeProfile` against this; `looseObject`
 * keeps unknown keys (provider creds, unread counts) intact while pinning the `_id`/`type` the app gates on.
 */
export const profileSchema = z.looseObject({
  _id: z.string(),
  type: z.string().optional()
})

/**
 * Data layer for the profile/Setting endpoints. Thin domain verbs over the typed RPC client: paths, request bodies, and
 * response shapes are inferred from the backend routes, and `request` unwraps the `Ok<T>` envelope + runs the central
 * error UX, so callers get an {@link ApiResult} (`res.ok` / `res.data`) with no `{ data }` wire shape and no `T | false`
 * sentinel. No response Zod, no casts -- `Profile` (= `SettingDoc`) is exactly what RPC infers here.
 *
 * TODO: this is now a near-passthrough over `request(client.api.profile...)`. Re-evaluate whether it earns its own layer
 * or whether the profile store should call `request` directly; keep it for now to group the endpoint wiring in one spot.
 */
export const profileService = {
  /** GET /api/profile -- every profile the signed-in user owns. */
  list (): Promise<ApiResult<Profile[]>> {
    return request(client.api.profile.$get())
  },

  /** GET /api/profile/:id -- one profile with its unread counts populated. */
  getOne (id: string): Promise<ApiResult<Profile>> {
    return request(client.api.profile[':id'].$get({ param: { id } }))
  },

  /** POST /api/profile -- create a profile and return it. */
  create (name: string): Promise<ApiResult<Profile>> {
    return request(client.api.profile.$post({ json: { profile: name } }))
  },

  /** DELETE /api/profile/:id -- delete a profile; returns the deleted doc. */
  remove (id: string): Promise<ApiResult<Profile>> {
    return request(client.api.profile[':id'].$delete({ param: { id } }))
  }
}
