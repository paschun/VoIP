import type { Ok } from '../api-contracts.ts'
import type { MediaDoc } from '../schema/media.ts'

/**
 * Response of `media/upload-files` — the saved Media document (its `media` rewritten to an absolute URL). The
 * frontend's XHR reads `response.data.media` on HTTP 200; failures throw `HTTPException` and aren't part of this type.
 */
export type MediaUploadResponse = Ok<MediaDoc>
