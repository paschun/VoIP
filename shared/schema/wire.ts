import type { JSONParsed } from 'hono/utils/types'
import type { Schema, InferRawDocTypeFromSchema } from 'mongoose'

/** JSON a top-level Mongoose doc serializes to over the wire (what `c.json` emits and RPC infers). */
export type WireDoc<S extends Schema> = JSONParsed<InferRawDocTypeFromSchema<S> & { __v: number }>

/*
Converting a schema to its wire type just needs to handle: 
- primitives (string/number/bool/null)
- ObjectId -> string,
- NativeDate -> string
- and virtual numbers (messageCount/totalCount).

Helpers tried:
- InferRawDocTypeFromSchema<S> (mongoose): raw shape from a Schema instance; adds `_id` (Require_id), no virtuals.
  Basis of WireDoc. USED.
- InferRawDocType<Def,Opts>: same but takes the bare definition object, not the instance. We have the instance, so
  ...FromSchema (which wraps this) fits. Not used directly.
- InferSchemaType<S>: paths only, no `_id`. Superseded by ...FromSchema.
- JSONParsed<T> (hono): exact `c.json` transform, shallow. USED. (type-fest Jsonify is deep -> TS2589, rejected.)
- ObtainSchemaGeneric<S,'TVirtuals'>: baked a phantom `id` + typed counts as `unknown` (-> TS2589). Rejected.
*/
