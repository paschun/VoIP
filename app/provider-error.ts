/**
 * Raised when an upstream telephony provider (Twilio/Telnyx) request fails. The provider helpers currently swallow
 * failures and return `false`, which loses the cause and lets callers silently ignore a failure; the migration target
 * is for them to `throw` this instead so `onError` can surface it as a 502 (Bad Gateway -- our server is fine, the
 * upstream isn't). Carries enough context to log meaningfully without leaking provider internals to the client.
 *
 * NOTE: nothing throws this yet. The helper conversion is deferred to the `setting` group port (the Express `setting`
 * controller still depends on the `false`-returning helpers, so flipping them is done in one place at that step).
 */
export class ProviderError extends Error {
  readonly provider: 'twilio' | 'telnyx'
  readonly op: string
  readonly status: number | undefined

  constructor(provider: 'twilio' | 'telnyx', op: string, options?: { status?: number; cause?: unknown }) {
    super(`${provider} ${op} failed`, { cause: options?.cause })
    this.name = 'ProviderError'
    this.provider = provider
    this.op = op
    this.status = options?.status
  }
}
