import { z } from 'zod'

/** The SSE `event:` name under which every server -> client push frame is sent. */
export const COMMUNICATION_EVENT = 'communication'

/**
 * Payload of a server -> client push frame on the SSE stream (`GET /api/events`), JSON-encoded in the event's `data`.
 * Fires for an inbound SMS/MMS (`message` is the text) and for call-log changes (`message` is the literal `'call'`);
 * `number` is the remote party. The server sends statically typed `PushMessage`s under the `COMMUNICATION_EVENT` name;
 * the client runtime-validates incoming frames with this schema.
 */
export const pushMessage = z.object({
  number: z.string(), // dont need to validate e164 because we are just forwarding what the provider sent us
  message: z.literal('call').or(z.string())
})
export type PushMessage = z.infer<typeof pushMessage>
