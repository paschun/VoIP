import { Hono, type Context } from 'hono'
import { streamSSE, type SSEStreamingApi } from 'hono/streaming'
import { COMMUNICATION_EVENT, type PushMessage } from '../../shared/contracts/push.ts'
import { sseAuth } from '../middleware/auth.ts'
import type { Env } from './factory.ts'

/** Open SSE streams per user id; a user may have several tabs/devices connected at once. */
const userStreams = new Map<string, Set<SSEStreamingApi>>()

// Monotonic per-frame SSE id. The browser tracks the last one it saw and echoes it as `Last-Event-ID` on reconnect;
// we don't replay (a missed frame is recovered by the store refresh the next live frame triggers), so we ignore it --
// the id's only job here is to differ between frames so the client fires even on two identical `data` payloads.
let nextEventId = 0

/** Push a message to every open stream of `userId`; a no-op when none are connected. */
export function sendToUser(userId: string, message: PushMessage) {
  const streams = userStreams.get(userId)
  if (!streams) return
  const id = String(++nextEventId)
  const data = JSON.stringify(message)
  for (const stream of streams) {
    if (stream.closed || stream.aborted) continue
    void stream.writeSSE({ event: COMMUNICATION_EVENT, data, id }).catch((e: unknown) => console.error('SSE write failed', e))
  }
}

// https://html.spec.whatwg.org/multipage/server-sent-events.html#authoring-notes
// Set to 0 to disable.
const KEEPALIVE_MS = 15_000

/** `GET /api/events`: authenticated SSE stream, registered under the JWT's user id. The frontend connects with a native EventSource. */
export const eventRoutes = new Hono<Env>().get('/events', sseAuth, (c: Context<Env>) =>
  streamSSE(c, async (stream) => {
    const { id } = c.get('user')
    let streams = userStreams.get(id)
    if (!streams) {
      streams = new Set()
      userStreams.set(id, streams)
    }
    streams.add(stream)
    stream.onAbort(() => {
      streams.delete(stream)
      if (streams.size === 0) userStreams.delete(id)
    })
    // Hold the response open until the client disconnects.
    if (KEEPALIVE_MS) {
      // With keepalive on, emit a comment line each cadence
      while (!stream.aborted) {
        await stream.write(': ping\n\n')
        await stream.sleep(KEEPALIVE_MS)
      }
    } else {
      // stream.onAbort(resolve) registers resolve as the abort callback
      // so the promise stays pending until the client drops, then resolves and the handler returns (closing the stream)
      await new Promise<void>((resolve) => stream.onAbort(resolve))
    }
  }),
)
