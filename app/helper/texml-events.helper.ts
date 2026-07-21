import { readFileSync } from 'node:fs'
import { Ajv2020, type AnySchema, type ValidateFunction } from 'ajv/dist/2020.js'
import { parse } from 'yaml'
import type { components } from '../spec/texml-calls.d.ts'

// Telnyx TeXML voice status callbacks (webhook/telephony-webhook-reference.md §5): AJV validates the form posts
// against the TeXML calls spec (app/spec/texml-calls.yml; provenance in app/spec/telnyx-openapi-ng-sources.txt).

// Types are generated from the yml, similar to how telnyx stainless SDK is generated
type Schemas = components['schemas']

// `analyzed` callback/webhook would happen after making an AI call. But we don't make AI calls.
// https://developers.telnyx.com/api-reference/texml-rest-commands/initiate-an-outbound-ai-call

export type TexmlStatusEvent =
  | Schemas['TexmlCallInitiatedWebhookSchema']
  | Schemas['TexmlCallRingingWebhookSchema']
  | Schemas['TexmlCallAnsweredWebhookSchema']
  | Schemas['TexmlCallCompletedWebhookSchema']
  | Schemas['TexmlCallDtmfWebhookSchema']

// `strict: false` is necessary because OpenAPI is not pure JSON Schema
// form encoding stringifies every value, so this ajv instance coerces the spec's two non-string fields back
// (`SequenceNumber` integer, `ShakenStirValidated` boolean) -- without it no payload would pass;
// `validateFormats` is off:
// - the webhook schemas annotate `Timestamp` as ISO `date-time` format
// - but the same spec's CallResource dates are RFC-2822 format (`Thu, 15 Jun 2023 09:56:45 +0000`, yml ~1240)
// - The twilio callback field is RFC-2822, Telnyx supposedly mirrors it
// - haven't observed live payload, too conflicting to reject on, so disable validate
const ajv = new Ajv2020({ strict: false, allErrors: true, coerceTypes: true, validateFormats: false })
const isSchemaObject = (value: unknown): value is AnySchema => typeof value === 'object' && value !== null
const texmlCallsSpec: unknown = parse(readFileSync(new URL('../spec/texml-calls.yml', import.meta.url), 'utf8'))
if (!isSchemaObject(texmlCallsSpec)) throw new Error('texml-calls.yml did not parse to a schema object')
ajv.addSchema(texmlCallsSpec, 'texml-calls')

const compile = <K extends keyof Schemas>(component: K) =>
  ajv.compile<Schemas[K]>({ $ref: `texml-calls#/components/schemas/${component}` })

// The spec models call-progress-events as one schema per CallStatus family, so dispatch keys on CallStatus.
const completed = compile('TexmlCallCompletedWebhookSchema')
const validators: Record<string, ValidateFunction<TexmlStatusEvent>> = {
  initiated: compile('TexmlCallInitiatedWebhookSchema'),
  ringing: compile('TexmlCallRingingWebhookSchema'),
  'in-progress': compile('TexmlCallAnsweredWebhookSchema'),
  completed,
  busy: completed,
  'no-answer': completed,
  canceled: completed,
  failed: completed,
  dtmf: compile('TexmlCallDtmfWebhookSchema'),
}


/**
 * The spec leaves `CallDuration` an unconstrained string; this digits check is ours, applied per-field before the
 * gate. Typed as a plain boolean check: ajv's guard-against-unknown would narrow `raw` to `never` on failure.
 */
const durationDigits: (data: unknown) => boolean = ajv.compile({
  type: 'object',
  properties: { CallDuration: { type: 'string', pattern: '^\\d+$' } },
})

/**
 * Parse a TeXML status-callback form body: the typed fields on success, `null` (logged) on an invalid or unmodeled
 * payload. A malformed `CallDuration` is dropped, not fatal -- it must not cost the status update or write NaN to
 * the call log.
 */
export const parseTexmlStatusCallback = (raw: Record<string, unknown>): TexmlStatusEvent | null => {
  if (!durationDigits(raw)) delete raw.CallDuration
  if (typeof raw.CallStatus === 'string' && validators[raw.CallStatus]?.(raw)) return raw
  console.error('Invalid TeXML status callback payload', raw)
  return null
}
