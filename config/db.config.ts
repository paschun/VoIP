import mongoose from 'mongoose'

export async function connectDB() {
  const uri = process.env.DB
  if (!uri) throw new Error('DB environment variable is not set')
  mongoose.connection.on('error', (err) => console.error('mongo connection error:', err))
  mongoose.connection.once('open', () => console.log('database connected successfully!'))
  await mongoose.connect(uri)
}
