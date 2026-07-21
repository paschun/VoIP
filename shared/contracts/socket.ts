import { z } from 'zod'

/**
 * Server -> client push message on the app websocket, JSON-encoded. `user_message` fires for an inbound SMS/MMS
 * (`message` is the text) and for call-log changes (`message` is the literal `'call'`); `number` is the remote party.
 * The server sends statically typed `SocketMessage`s; the client runtime-validates incoming frames with this schema.
 */
export const socketMessage = z.object({
  event: z.literal('user_message'),
  number: z.string(),
  message: z.string(),
})
export type SocketMessage = z.infer<typeof socketMessage>
