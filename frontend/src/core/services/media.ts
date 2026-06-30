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
export async function uploadMedia(
  file: File,
  token: string,
  onProgress: (loaded: number, total: number) => void = () => {}
): Promise<UploadResponseSuccess> {
  const total = file.size
  let loaded = 0
  const progress = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      loaded += chunk.byteLength
      onProgress(loaded, total)
      controller.enqueue(chunk)
    }
  })
  const init: RequestInit & { duplex: 'half' } = {
    method: 'POST',
    headers: { token, 'Content-Type': file.type },
    body: file.stream().pipeThrough(progress),
    duplex: 'half'
  }
  return request(fetch(client.api.media.uploads.$url(), init) as unknown as Promise<UploadResponse>)
}
