import { MongoMemoryServer } from 'mongodb-memory-server-core'
import mongoose from 'mongoose'

let mongod: MongoMemoryServer | undefined

// Use the system mongod (Homebrew) -- `-core` never auto-downloads a binary, so point it at the installed one.
// Override with MONGOMS_SYSTEM_BINARY if it lives elsewhere; otherwise fall back to a PATH lookup.
const systemBinary = process.env.MONGOMS_SYSTEM_BINARY ?? '/opt/homebrew/bin/mongod'

/** Start an in-memory MongoDB and point Mongoose at it. Call in `beforeAll`. */
export async function connectMemoryDb (): Promise<void> {
  mongod = await MongoMemoryServer.create({ binary: { systemBinary } })
  await mongoose.connect(mongod.getUri())
}

/** Tear down the connection and the in-memory server. Call in `afterAll`. */
export async function disconnectMemoryDb (): Promise<void> {
  await mongoose.disconnect()
  await mongod?.stop()
}

/** Wipe every collection so each test starts clean. Call in `afterEach`. */
export async function clearDb (): Promise<void> {
  const { collections } = mongoose.connection
  await Promise.all(Object.values(collections).map(c => c.deleteMany({})))
}
