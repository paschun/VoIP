// Single source of truth for environment configuration. Every variable is read, validated, and coerced exactly once
// here at import time, so the rest of the app gets real types (string/number/boolean) instead of `string | undefined`,
// and a missing/invalid var fails fast at boot rather than mid-request.

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const optional = (name: string, fallback: string) => process.env[name] ?? fallback

export const env = {
  DB: required('DB'),
  COOKIE_KEY: required('COOKIE_KEY'),
  BASE_URL: required('BASE_URL').trim(),
  PORT: Number(optional('PORT', '3000')),
  HTTPS: optional('HTTPS', 'false').trim() === 'true', // false implies dev mode
} as const
