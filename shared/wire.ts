import type { Schema, InferRawDocTypeFromSchema } from 'mongoose'
import type { JSONParsed } from 'hono/utils/types'

/** JSON a top-level Mongoose doc serializes to over the wire (what `c.json` emits and RPC infers). */
export type WireDoc<S extends Schema> =
  JSONParsed<InferRawDocTypeFromSchema<S> & { __v: number }>
