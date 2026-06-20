import type { Schema, InferRawDocTypeFromSchema } from 'mongoose'
import type { JSONParsed } from 'hono/utils/types'

/** JSON a top-level Mongoose doc serializes to over the wire (what `c.json` emits and RPC infers). */
export type WireDoc<S extends Schema> =
  JSONParsed<InferRawDocTypeFromSchema<S> & { __v: number }>

/*
for converting schemas to wire types:
it just needs to handle:
- primitives - string, number, bool, null, etc
- ObjectId - turn it into string
- NativeDate - into string as well
- virtual numbers messageCount + totalCount
- hardwareKeySchema.credentials is a string[]
*/