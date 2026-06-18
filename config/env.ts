import { z } from 'zod'

/*
function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}
const optional = (name: string, fallback: string) => process.env[name] ?? fallback
*/

// Single source of truth for environment configuration. The schema is parsed once here at import time, so the rest of
// the app gets real, validated types (string/number/boolean) instead of `string | undefined`, and a missing/invalid
// var fails fast at boot with a readable message rather than mid-request.
const schema = z.object({
  DB: z.string().min(1),
  BASE_URL: z.string().trim().min(1),
  COOKIE_KEY: z.string().min(32), // 32 chars == 32 bytes == 256 bits, for HS256 JWT algo
  PORT: z.coerce.number().int().min(1).max(65535).default(3000), // render.com sets this to 10000
  HTTPS: z.stringbool().default(false), // false implies dev mode
  // Parsed as a bool string (true/false/on/off/1/0/...), then re-serialized to 'on'/'off' — it's echoed to the client
  // verbatim and the frontend compares `data === 'on'`. Absent → false → 'off' (signups disabled).
  SIGNUPS: z.stringbool().default(false).transform((on) => (on ? 'on' : 'off')),
  // Subdirectory the app is served under (see .env notes). Also echoed to the client.
  APPDIRECTORY: z.string().trim().default('voip'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`)
}

export const env = parsed.data
