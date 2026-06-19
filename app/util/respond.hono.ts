import type { Context } from 'hono'
import type { Document } from 'mongoose'
import type { Ok } from '../../shared/api-contracts.ts'

/**
 * Hono port of `respond.ts`'s `sendDoc`: send a hydrated Mongoose document (or `null`) as a typed success body.
 *
 * `c.json` runs `JSON.stringify` (→ `toJSON`), turning the doc's `ObjectId`/`Date` into the strings the wire contract
 * `T` already describes — a runtime conversion TS can't see, so the doc→wire cast is sound and isolated here.
 * `satisfies Ok<T>` keeps the body honest; pass the contract explicitly, e.g. `sendDoc<EmailDoc | null>(c, doc)`.
 * There is no `message` — success bodies carry only `data` (the frontend reads nothing else; see `error-handling-plan.md`).
 */
export const sendDoc = <T extends { _id: string } | null>(c: Context, data: Document | null) =>
  c.json({ data: data as unknown as T } satisfies Ok<T>)

/** Array counterpart of `sendDoc` for list endpoints, e.g. `sendDocs<ContactDoc>(c, docs)`. */
export const sendDocs = <T extends { _id: string }>(c: Context, data: Document[]) =>
  c.json({ data: data as unknown as T[] } satisfies Ok<T[]>)

/**
 * Acknowledge a provider webhook with a bare 2xx and no body. For callbacks that don't consume a reply (Twilio/Telnyx
 * status callbacks, Telnyx event webhooks) -- a non-2xx makes the provider retry, but they ignore any body we send.
 */
export const ack = (c: Context) => c.body(null, 200)
