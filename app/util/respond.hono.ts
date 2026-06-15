import type { Context } from 'hono'
import type { Document } from 'mongoose'
import type { ApiEnvelope } from '../../shared/api-contracts.ts'

/**
 * Hono port of `respond.ts`'s `sendDoc`: send a hydrated Mongoose document (or `null`) as a typed success envelope.
 *
 * Same reasoning as the Express version — `c.json` runs `JSON.stringify` (→ `toJSON`), turning the doc's
 * `ObjectId`/`Date` into the strings the wire contract `T` already describes, a runtime conversion TS can't see, so the
 * doc→wire cast is sound and isolated here. `satisfies ApiEnvelope<T>` keeps the envelope honest; pass the contract
 * explicitly, e.g. `sendDoc<EmailDoc | null>(c, doc, '…')`.
 */
export const sendDoc = <T extends { _id: string } | null>(c: Context, data: Document | null, message: string) =>
  c.json({ status: true, message, data: data as unknown as T } satisfies ApiEnvelope<T>)
