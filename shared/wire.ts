import type { Schema, InferSchemaType, Types } from 'mongoose'
import type { Jsonify } from 'type-fest'

/**
 * Extracts a schema's auto-inferred virtuals from its 5th generic slot via `infer V`, capturing whatever sits there; the
 * `any` placeholders match (and discard) the other six params. The `: object` fallback is the else-branch — reached only
 * if `S` isn't a `Schema`, and it adds no fields to the intersection. Only virtuals declared in the `virtuals`
 * constructor option are inferred, not `schema.virtual()` ones. Coupled to Mongoose's generic order.
 */
type VirtualsOf<S> = S extends Schema<any, any, any, any, infer V, any, any> ? V : object

/**
 * The full JSON a top-level document serializes to. We assemble the in-memory shape — `_id`, the inferred fields, the
 * virtuals, and `__v` (`InferSchemaType` omits all three) — then hand it to type-fest's `Jsonify`, which applies the same
 * transform `res.json` does at runtime: it follows each value's `toJSON()` (so `ObjectId`/`Date` → `string`), recurses
 * into nested objects/arrays, and drops functions/`undefined`. Virtuals are only really on the wire when the schema sets
 * `toJSON: { virtuals: true }`. Build per-endpoint contracts by `Pick`ing from this.
 */
export type WireDoc<S extends Schema> =
  Jsonify<{ _id: Types.ObjectId } & InferSchemaType<S> & VirtualsOf<S> & { __v: number }>
