import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'

let io: Server | undefined

export function initIO(server: HttpServer) {
  io = new Server(server, { cors: { origin: '*' } })
  io.on('connection', (socket) => {
    console.log('a user connected')
    socket.on('join_channel', (channel: string) => {
      console.log(`${channel} user joined channel`)
      void socket.join(channel)
    })
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
