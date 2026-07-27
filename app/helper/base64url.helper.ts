import { z } from 'zod'

/**
 * Unpadded base64url decoding to exactly `bytes`. Checking the decoded length rather than the string length is what
 * the Web Push libraries themselves do, and it states the actual constraint -- these are fixed-size keys.
 */
export const base64urlBytes = (bytes: number) =>
  z.base64url().refine((value) => Buffer.from(value, 'base64url').length === bytes, `must decode to ${bytes} bytes`)
