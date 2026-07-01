import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server-core'

let mongod: MongoMemoryServer

/** Start an in-memory MongoDB and point Mongoose at it. Call in `beforeAll`. */
export async function connectMemoryDb(): Promise<void> {
  // if systemBinary is not set, it will attempt to download the binary to ~/.cache
  mongod = await MongoMemoryServer.create({ binary: { systemBinary: '/opt/homebrew/bin/mongod', version: '8.3.4' } })
  await mongoose.connect(mongod.getUri())
}

/** Tear down the connection and the in-memory server. Call in `afterAll`. */
export async function disconnectMemoryDb(): Promise<void> {
  await mongoose.disconnect()
  await mongod.stop()
}

/** Wipe every collection so each test starts clean. Call in `afterEach`. */
export async function clearDb(): Promise<void> {
  const { collections } = mongoose.connection
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})))
}
