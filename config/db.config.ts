import mongoose from 'mongoose'
import { env } from './env.ts'

export async function connectDB() {
  mongoose.connection.on('error', (err) => console.error('mongo connection error:', err))
  mongoose.connection.once('open', () => console.log('database connected successfully!'))
  await mongoose.connect(env.DB)
}
