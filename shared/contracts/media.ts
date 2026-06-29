import { z } from 'zod'

// The client streams the raw file body to the upload route to measure progress (see Dashboard.vue's `uploadFile`), so
// there's no multipart part to read a filename from. Instead the request `Content-Type` is validated against the
// accepted image types and the stored-file extension is derived from it -- no client-supplied filename is trusted.
export const uploadHeaders = z.object({
  'content-type': z.enum(['image/jpeg', 'image/png', 'image/gif']),
})
export type UploadHeaders = z.infer<typeof uploadHeaders>

/** Stored-file extension (with leading dot) for each accepted upload content type. */
export const uploadExt: Record<UploadHeaders['content-type'], string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
}
