/**
 * Server -> client push message on the app websocket, JSON-encoded. `user_message` fires for an inbound SMS/MMS
 * (`message` is the text) and for call-log changes (`message` is the literal `'call'`); `number` is the remote party.
 */
export type SocketMessage = { event: 'user_message'; number: string; message: string }
