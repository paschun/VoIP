import type { Schema, InferSchemaType, Types } from 'mongoose'
import type { JSONParsed } from 'hono/utils/types'

/**
 * The JSON a top-level Mongoose document serializes to over the wire. Builds the persisted shape (`_id`, the
 * schema-inferred paths, `__v`) and runs it through Hono's `JSONParsed` -- the exact transform `c.json` applies at the
 * boundary (ObjectId/Date -> string via their `toJSON`, arrays/objects recursed). Using Hono's own transform (not
 * type-fest `Jsonify`) keeps the contract identical to what RPC infers AND shallow enough for vue-tsc to instantiate.
 *
 * Virtuals are deliberately excluded: Mongoose can't infer a populate/count virtual's value type (no getter to read --
 * its own `ObtainSchemaGeneric` yields `unknown` too), and the built-in `id` getter is only serialized when a schema
 * opts in with `toJSON: { virtuals: true }`. So declare virtuals explicitly on the per-schema doc type (see `SettingDoc`).
 */
export type WireDoc<S extends Schema> =
  JSONParsed<{ _id: Types.ObjectId } & InferSchemaType<S> & { __v: number }>
