import mongoose from 'mongoose'
import { env } from './env.ts'

/** Well under mongoose's 30s default, so an unreachable host or a missing IP-allowlist entry surfaces quickly. */
const SERVER_SELECTION_TIMEOUT_MS = 10_000
const PROGRESS_INTERVAL_MS = 2_000

/** Drops the `user:pass@` credentials so a connection string can be logged. */
const redact = (uri: string) => uri.replace(/\/\/[^/@]*@/, '//***@')

export async function connectDB() {
  mongoose.connection.on('error', (err) => console.error('mongo connection error:', err))
  mongoose.connection.on('disconnected', () => console.warn('mongo disconnected'))
  mongoose.connection.on('reconnected', () => console.log('mongo reconnected'))

  const started = Date.now()
  const elapsed = () => `${((Date.now() - started) / 1000).toFixed(1)}s`
  console.log('connecting to mongo', redact(env.DB))
  const progress = setInterval(() => console.log(`still connecting to mongo... ${elapsed()}`), PROGRESS_INTERVAL_MS)
  try {
    await mongoose.connect(env.DB, { serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS })
    console.log(`database connected successfully! (${elapsed()})`)
  } catch (err) {
    console.error(`mongo connection failed after ${elapsed()}:`, err instanceof Error ? err.message : err)
    throw err
  } finally {
    clearInterval(progress)
  }
}
