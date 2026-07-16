import { upgradeWebSocket, type WebSocketServerLike } from '@hono/node-server'
import { Hono, type Context } from 'hono'
import type { WSContext } from 'hono/ws'
import { WebSocketServer, WebSocket } from 'ws'
import type { SocketMessage } from '../../shared/contracts/socket.ts'
import { wsAuth } from '../middleware/auth.ts'
import type { Env } from './factory.ts'

/** Open sockets per user id; a user may have several tabs/devices connected at once. */
const userSockets = new Map<string, Set<WSContext>>()

/** Push a message to every open socket of `userId`; a no-op when none are connected. */
export function sendToUser(userId: string, message: SocketMessage) {
  const sockets = userSockets.get(userId)
  if (!sockets) return
  const json = JSON.stringify(message)
  for (const ws of sockets) if (ws.readyState === WebSocket.OPEN) ws.send(json)
}

const wsServer = new WebSocketServer({ noServer: true })

/**
 * Handed to `serve({ websocket })` in app.ts; the adapter requires `noServer` (it drives the upgrade itself).
 * Cast: @types/ws types `options.noServer` as `boolean | undefined`, which `WebSocketServerLike` rejects under
 * exactOptionalPropertyTypes.
 */
// oxlint-disable-next-line consistent-type-assertions
export const wss = wsServer as WebSocketServerLike

// Server-side heartbeat (render.com/docs/websocket): ping every 30s, terminate connections that never ponged the
// previous ping (browsers answer protocol pings automatically). Also keeps Render's proxy from idling connections out.
// `unref()` so importing this module never keeps a test process alive.
const alive = new WeakSet<WebSocket>()
wsServer.on('connection', (ws) => {
  alive.add(ws)
  ws.on('pong', () => alive.add(ws))
})
setInterval(() => {
  for (const ws of wsServer.clients) {
    if (!alive.has(ws)) {
      ws.terminate()
      continue
    }
    alive.delete(ws)
    ws.ping()
  }
}, 30_000).unref()

/** `GET /api/ws`: authenticated upgrade, registered under the JWT's user id. RPC mode: `client.api.ws.$ws(...)`. */
export const socketRoutes = new Hono<Env>().get(
  '/ws',
  wsAuth,
  upgradeWebSocket((c: Context<Env>) => {
    const user = c.get('user')
    return {
      onOpen(_evt, ws) {
        let sockets = userSockets.get(user.id)
        if (!sockets) {
          sockets = new Set()
          userSockets.set(user.id, sockets)
        }
        sockets.add(ws)
      },
      onClose(_evt, ws) {
        const sockets = userSockets.get(user.id)
        sockets?.delete(ws)
        if (sockets?.size === 0) userSockets.delete(user.id)
      },
    }
  }),
)
