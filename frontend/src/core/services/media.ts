import type { InferResponseType } from 'hono/client'
import type { SuccessStatusCode } from 'hono/utils/http-status'
import { client, request } from '@/core/rpc.client.ts'

type UploadResponseSuccess = InferResponseType<typeof client.api.media.uploads.$post, SuccessStatusCode>
/** The full hc `ClientResponse` the upload route returns -- carries status/format params so `request()` infers the body. */
type UploadResponse = Awaited<ReturnType<typeof client.api.media.uploads.$post>>

/**
 * Upload one file via a streamed request body, reporting byte progress through `onProgress`. fetch has no
 * upload-progress event, so the body is piped through a TransformStream that counts bytes as they pass. A streamed
 * body needs `duplex: 'half'` and request-stream support (Chromium only -- Safari/Firefox buffer), so progress is not
 * cross-browser. The server derives the stored file type from `Content-Type` (no client filename trusted). Routed
 * through `request()` so failures hit the same central toast/parse path as every hc call; the cast supplies the
 * inferred success-body type. `$url()` gives the route's absolute URL (see test/rpc-url.test.ts).
 */
export async function uploadMedia(file: File, token: string, onProgress: (loaded: number, total: number) => void = () => {}): Promise<UploadResponseSuccess> {
  const total = file.size
  let loaded = 0
  const progress = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      loaded += chunk.byteLength
      onProgress(loaded, total)
      controller.enqueue(chunk)
    },
  })
  const init: RequestInit & { duplex: 'half' } = {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': file.type },
    body: file.stream().pipeThrough(progress),
    duplex: 'half',
  }
  return request(fetch(client.api.media.uploads.$url(), init) as unknown as Promise<UploadResponse>)
}

/**
 * Upload several files concurrently, reporting aggregate progress (mean percent across files, 0-100; inaccurate
 * with mixed file sizes -- tracking loaded/total bytes would be accurate). Resolves to the stored media URLs in
 * input order; rejects on the first failed upload (after its central error toast).
 */
export async function uploadMediaFiles(
  files: Iterable<File>,
  token: string,
  onProgress: (percent: number) => void = () => {},
): Promise<string[]> {
  const list = [...files]
  const progress = list.map(() => 0)
  const report = () => onProgress(progress.reduce((tot, curr) => tot + curr, 0) / progress.length)
  return Promise.all(
    list.map(async (file, i) => {
      const res = await uploadMedia(file, token, (loaded, total) => {
        progress[i] = total > 0 ? (loaded * 100) / total : 100 // no total: count the file as done
        report()
      })
      progress[i] = 100
      report()
      return res.data.media
    }),
  )
}
