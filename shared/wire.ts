import type { Schema, InferSchemaType, Types } from 'mongoose'

/**
 * Converts one field's type to its JSON-over-the-wire form: the two BSON types we hold turn into strings
 * (`ObjectId.toJSON()` → 24-char hex, `Date.toJSON()` → ISO-8601), and arrays are converted element-wise. A chain of
 * conditional types (`T extends X ? then : else`) tried top to bottom: ObjectId → `string`; else Date → `string`; else
 * array `U[]` → map each element (`infer U` captures the element type); else leave `T` as-is. Flat fields only — there's
 * no nested-subdocument support because these schemas don't use subdocs; add an object branch that recurses if that changes.
 */
type WireField<T> =
  T extends Types.ObjectId ? string
  : T extends Date ? string
  : T extends (infer U)[] ? WireField<U>[]
  : T

/**
 * Extracts a schema's auto-inferred virtuals. `Schema` carries them in its 5th type parameter, so we pattern-match the
 * type with `infer V`, capturing whatever sits in that slot; the `any` placeholders match (and discard) the other six
 * params. The `: object` fallback is the conditional's else-branch — reached only if `S` isn't a `Schema`, and it adds no
 * fields to the intersection. Only virtuals declared in the `virtuals` constructor option are inferred, not
 * `schema.virtual()` ones. Coupled to Mongoose's generic order.
 */
type VirtualsOf<S> = S extends Schema<any, any, any, any, infer V, any, any> ? V : object

/**
 * The full JSON a top-level document serializes to. `&` intersects four pieces because `InferSchemaType` returns only
 * the raw fields (no `_id`, virtuals, or `__v`): the `_id` string, the serialized fields (each mapped through
 * `WireField`), the virtuals, and `__v`. Virtuals are only really on the wire when the schema sets
 * `toJSON: { virtuals: true }`.
 */
export type WireDoc<S extends Schema> =
  & { _id: string }
  & { [K in keyof InferSchemaType<S>]: WireField<InferSchemaType<S>[K]> }
  & VirtualsOf<S>
  & { __v: number }
