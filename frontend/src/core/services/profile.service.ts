import { z } from 'zod'
import { api } from '@/core/services/api.service.ts'
import { handleError } from '@/core/services/handle-error.ts'
import type { ApiError } from '@/core/services/api.service.ts'
import type { Profile } from '@shared/api-contracts.ts'

/**
 * Validates only the shape we actually depend on (`_id`, `type`) while keeping
 * the rest of the profile/Setting document intact — `looseObject` preserves
 * unknown keys, e.g. the provider credentials CallView and the settings panels
 * still read straight off the active profile.
 */
export const profileSchema = z.looseObject({
  _id: z.string(),
  type: z.string().optional()
})

/** `{ data: <T>, ... }` — the ApiEnvelope wrapper, keeping any extra keys. */
const envelope = <T extends z.ZodTypeAny>(data: T) => z.looseObject({ data })

/**
 * POST that mirrors the `$post` global (resolves `false` on failure, never
 * rejects) but also validates the response with Zod. 401/400 still
 * toast/bounce via handleError; parse + network errors are logged and resolve
 * `false`.
 */
async function parsedPost<T> (url: string, body: unknown, schema: z.ZodType<T>): Promise<T | false> {
  try {
    return schema.parse(await api.post(url, body))
  } catch (e) {
    const err = e as ApiError
    if (err.status === undefined) console.error(`[profile.service] ${url}`, e)
    return handleError(err)
  }
}

// todo: create parsedGet

/**
 * Data layer for the profile/Setting endpoints. Returns domain objects with the
 * `{ data }` envelope unwrapped (or `false`), so the store/components never see
 * the wire shape.
 */
export const profileService = {
  /** POST profile/getdata — every profile the signed-in user owns. */
  async list (): Promise<Profile[] | false> {
    const res = await parsedGet('profile', envelope(z.array(profileSchema)))
    return res ? (res.data as unknown as Profile[]) : false
  },

  /** POST profile/getdata-one — one profile with its unread counts populated. */
  async getOne (id: string): Promise<Profile | false> {
    const res = await parsedGet(`profile/${id}`, envelope(profileSchema))
    return res ? (res.data as unknown as Profile) : false
  },

  /** POST profile/create — create a profile and return it. */
  async create (name: string): Promise<Profile | false> {
    const res = await parsedPost('profile', { profile: name }, envelope(profileSchema))
    return res ? (res.data as unknown as Profile) : false
  }
}
