// Shared entry point for the zod-mongoose toolkit.
//
// Models are authored in Zod (the single source of truth) and the Mongoose schema/model is *derived* from them via
// `toMongooseSchema`. We import everything model-related through this module so that `setMongoose(mongoose)` runs
// exactly once, before any `toMongooseSchema` call: in ESM the package can't reliably auto-detect Mongoose via
// `require()`, so we wire the instance in explicitly here. Because this module is fully evaluated before the body of
// any importing model module, the instance is always set in time.
import mongoose from 'mongoose'
import { setMongoose } from '@nullix/zod-mongoose'

setMongoose(mongoose)

export { toMongooseSchema, zObjectId, zRef, zBuffer, withMongoose, genTimestampsSchema } from '@nullix/zod-mongoose'
export type { PopulatedSchema, MongooseMeta } from '@nullix/zod-mongoose'
