import type { ApiEnvelope, ApiErrorEnvelope } from '../api-contracts.ts'
import type { MediaDoc } from '../schema/media.ts'

/**
 * Response of `media/upload-files` — the saved Media document (its `media` rewritten to an absolute URL) on success, or
 * an error envelope. The frontend's XHR only reads `response.data.media` on HTTP 200, so the success branch must carry
 * the full doc; every failure path omits `data` (matches `ApiErrorEnvelope`).
 */
export type MediaUploadResponse = ApiEnvelope<MediaDoc> | ApiErrorEnvelope
