import type { Response } from 'express'
import type { Document } from 'mongoose'
import type { ApiEnvelope } from '../../shared/api-contracts.ts'

/**
 * Send a hydrated Mongoose document (or `null`) as a typed success envelope.
 *
 * Why the cast: the handler holds a hydrated doc whose `_id`/dates are still `ObjectId`/`Date`, but `res.send` runs
 * `JSON.stringify` (→ `toJSON`) and ships them as the strings the wire contract `T` already describes. That conversion
 * is a runtime effect TypeScript can't see, so the doc→wire assertion is sound and deliberately isolated to this one
 * spot. `satisfies ApiEnvelope<T>` keeps the envelope structure honest; pass the contract explicitly, e.g.
 * `sendDoc<EmailDoc | null>(res, doc, '…')`. The `T extends { _id: string } | null` bound doesn't verify the fields
 * (the cast can't), but it forces `T` to at least be a wire-doc shape, rejecting nonsense like `sendDoc<number>`.
 */
export const sendDoc = <T extends { _id: string } | null>(res: Response, data: Document | null, message: string) =>
  res.send({ status: true, message, data: data as unknown as T } satisfies ApiEnvelope<T>)
