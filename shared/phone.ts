import { z } from 'zod'

/** Strip formatting chars and any leading '+', then re-prefix; a bare 10-digit number is assumed US (+1). */
export const toE164 = (raw: string): string => {
  const digits = raw.trim().replace(/[\s().-]/g, '').replace(/^\+/, '')
  return digits.length === 10 ? `+1${digits}` : `+${digits}`
}

/**
 * Canonical phone number: coerces free-form input via {@link toE164}, then validates strict E.164. Every phone field
 * crossing the API boundary uses this, so controllers and storage only ever see the canonical form.
 */
export const e164Phone = z.string().transform(toE164).pipe(z.e164())
