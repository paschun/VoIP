import type { Server as HttpServer } from 'node:http'
import type { Http2Server, Http2SecureServer } from 'node:http2'
import { Server } from 'socket.io'

let io: Server | undefined

// is it possible to replace with https://hono.dev/docs/helpers/websocket ??

// maybe todo:
// 1) authenticate the handshake (validate the access token via socket.handshake.auth.token in io.use(...) middleware, same jose verify as middleware/auth.ts)
// 2) authorize joins so a user can only join their own user/profile channel.
// look at io.use()

// Accepts whatever `@hono/node-server`'s `serve()` returns (its `ServerType` union); socket.io's constructor takes all three.
export function initIO(server: HttpServer | Http2Server | Http2SecureServer) {
  // No CORS config: the client is same-origin everywhere (prod serves the SPA; dev proxies the websocket via Vite).
  io = new Server(server)
  io.on('connection', (socket) => {
    console.log('a user connected')
    socket.on('join_profile_channel', (channel: string) => {
      console.log(`${channel} user joined channel`)
      void socket.join(channel)
    })
  })
}

export function getIO() {
  if (!io) throw new Error('socket.io not initialized — call initIO first')
  return io
}
