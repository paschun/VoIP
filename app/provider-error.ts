/**
 * Raised when an upstream telephony provider (Twilio/Telnyx) request fails, so `onError` can surface it as a 502 (Bad
 * Gateway -- our server is fine, the upstream isn't). Carries enough context to log meaningfully without leaking
 * provider internals to the client.
 *
 * Thrown by the SETUP/GET/FALLBACK helpers in twilio.helper / telnyx.helper (provisioning, webhook-config reads, and
 * fallback-URL updates) and by the provider send in `setting`'s send-message handler. The TEARDOWN helpers (the
 * delete/unlink/remove/empty ones) deliberately do NOT throw -- they stay best-effort `false`-returning so a failed
 * cleanup can't block an account/profile/setting deletion.
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
