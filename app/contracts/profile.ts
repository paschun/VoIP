import * as z from 'zod'
import type { Ok } from '../api-contracts.ts'
import type { SettingDoc } from '../schema/setting.ts'

// `profile` is a plain optional String on the model, so the create body is written directly. Get/delete take the id
// from the path, not a body.
// todo: this parameter name is super confusing. profile? make more clear.
export const profileCreateBody = z.object({ profile: z.string().min(1) })
export type CreateProfileRequest = z.infer<typeof profileCreateBody>

// Path param for the by-id routes (`GET`/`DELETE /:id`).
export const profileIdParam = z.object({ id: z.string().min(1) })
export type ProfileIdParam = z.infer<typeof profileIdParam>

// Only `EmailSetting.vue` still uses this, via the old `$get<T>` path. Drop it once that view moves to RPC.
export type GetProfilesResponse = Ok<SettingDoc[]>
