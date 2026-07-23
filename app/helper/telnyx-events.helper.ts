import addFormats from 'ajv-formats'
import { Ajv2020, type ValidateFunction } from 'ajv/dist/2020.js'
import spec from 'telnyx-openapi/openapi/spec3.json' with { type: 'json' }
import type {
  CallInitiatedWebhookEvent,
  CallHangupWebhookEvent,
  InboundMessageWebhookEvent,
  DeliveryUpdateWebhookEvent,
} from 'telnyx/resources/webhooks'
import type { SetRequiredDeep } from 'type-fest'
import { TELNYX_INBOUND_CONTENT_TYPES } from '../contracts/media.ts'

// Telnyx JSON webhook validation (Call Control voice events + messaging events): AJV validates against the event
// schemas in Telnyx's own OpenAPI spec, tightened with `required` for exactly the fields the handlers read.

type TelnyxCallInitiated = SetRequiredDeep<
  CallInitiatedWebhookEvent,
  | 'data'
  | 'data.event_type'
  | 'data.payload'
  | 'data.payload.call_session_id'
  | 'data.payload.direction'
  | 'data.payload.from'
  | 'data.payload.to'
>
type TelnyxCallHangup = SetRequiredDeep<
  CallHangupWebhookEvent,
  | 'data'
  | 'data.event_type'
  | 'data.payload'
  | 'data.occurred_at'
  | 'data.payload.call_session_id'
  | 'data.payload.start_time'
>
export type TelnyxCallEvent = TelnyxCallInitiated | TelnyxCallHangup

/** The validators' `minItems: 1` has no plain-array type: retype `to` as a non-empty tuple so `to[0]` narrows. */
type NonEmptyTo<T extends { data: { payload: { to: unknown[] } } }> = T & {
  data: { payload: { to: [T['data']['payload']['to'][number], ...T['data']['payload']['to'][number][]] } }
}

type TelnyxInboundMessage = NonEmptyTo<
  SetRequiredDeep<
    InboundMessageWebhookEvent,
    | 'data'
    | 'data.event_type'
    | 'data.payload'
    | 'data.payload.id'
    | 'data.payload.from'
    | 'data.payload.from.phone_number'
    | 'data.payload.to'
    | `data.payload.to.${number}.phone_number`
    | `data.payload.media.${number}.url`
  >
>
type TelnyxMessageStatus = NonEmptyTo<
  SetRequiredDeep<
    DeliveryUpdateWebhookEvent,
    | 'data'
    | 'data.event_type'
    | 'data.payload'
    | 'data.payload.id'
    | 'data.payload.to'
    | `data.payload.to.${number}.status`
  >
>

// `strict: false` is necessary because OpenAPI is not pure JSON Schema
const ajv = new Ajv2020({ strict: false, allErrors: true, discriminator: true })
addFormats.default(ajv)
ajv.addSchema(spec, 'telnyx-spec')

/** Spec schema + extra constraints via allOf: each subschema is checked independently, so they accumulate. */
const strict = (component: string, dataRequired: string[], payload: Record<string, unknown>) => ({
  allOf: [
    { $ref: `telnyx-spec#/components/schemas/${component}` },
    {
      type: 'object',
      required: ['data'],
      properties: {
        data: {
          type: 'object',
          required: dataRequired,
          properties: { payload: { type: 'object', ...payload } },
        },
      },
    },
  ],
})

// runtime `required` mirrors the SetRequiredDeep paths above, so the types are honest
const callValidators: Record<string, ValidateFunction<TelnyxCallEvent>> = {
  'call.initiated': ajv.compile<TelnyxCallInitiated>(
    strict('CallInitiatedEvent', ['event_type', 'payload'], {
      required: ['call_session_id', 'direction', 'from', 'to'],
    }),
  ),
  'call.hangup': ajv.compile<TelnyxCallHangup>(
    strict('CallHangupEvent', ['event_type', 'payload', 'occurred_at'], {
      required: ['call_session_id', 'start_time'],
    }),
  ),
}

const inboundMessageValidators: Record<string, ValidateFunction<TelnyxInboundMessage>> = {
  'message.received': ajv.compile<TelnyxInboundMessage>(
    strict('InboundMessageEvent', ['event_type', 'payload'], {
      required: ['id', 'from', 'to'],
      properties: {
        from: { type: 'object', required: ['phone_number'] },
        to: { type: 'array', minItems: 1, items: { type: 'object', required: ['phone_number'] } },
        // any missing url or content type Telnyx couldn't deliver marks the whole event invalid (logged, acked, dropped)
        media: {
          type: 'array',
          items: {
            type: 'object',
            // empty arrays pass this validation
            required: ['url'],
            properties: { url: { type: 'string', format: 'uri' }, content_type: { enum: TELNYX_INBOUND_CONTENT_TYPES } },
          },
        },
      },
    }),
  ),
}

const statusValidator = ajv.compile<TelnyxMessageStatus>(
  strict('OutboundMessageEvent', ['event_type', 'payload'], {
    required: ['id', 'to'],
    properties: { to: { type: 'array', minItems: 1, items: { type: 'object', required: ['status'] } } },
  }),
)
const messageStatusValidators: Record<string, ValidateFunction<TelnyxMessageStatus>> = {
  'message.sent': statusValidator,
  'message.finalized': statusValidator,
}

/**
 * Minimal envelope guard: a typed read of `event_type` from the `unknown` body, so dispatch can tell "not an event we
 * act on" (skip silently) from "recognized event that fails validation" (log) before any strict validator runs.
 */
const envelope = ajv.compile<{ data: { event_type: string } }>({
  type: 'object',
  required: ['data'],
  properties: { data: { type: 'object', required: ['event_type'], properties: { event_type: { type: 'string' } } } },
})

/**
 * Build a webhook-body parser over a set of per-event-type validators: returns the typed `data` for the events the
 * route acts on, or `null` for everything else. Unknown event types are expected lifecycle noise and skipped
 * silently; a recognized event that fails validation is logged. Either way the webhook route still answers 200.
 */
const makeParser =
  <T extends { data: unknown }>(validators: Record<string, ValidateFunction<T>>) =>
  (raw: unknown): T['data'] | null => {
    if (!envelope(raw)) {
      // perhaps this payload didnt come from telnyx
      console.error('Unhandled Telnyx webhook payload', envelope.errors)
      return null
    }
    const validate = validators[raw.data.event_type]
    if (!validate) return null // silently ignore the event types this route doesn't act on
    if (!validate(raw)) {
      console.error(`Invalid Telnyx ${raw.data.event_type} payload`, validate.errors)
      return null
    }
    return raw.data
  }

/** Call Control voice events the call log acts on: `call.initiated`, `call.hangup`. */
export const parseTelnyxCallEvent = makeParser(callValidators)
/** Inbound message webhook: `message.received`. */
export const parseTelnyxInboundMessage = makeParser(inboundMessageValidators)
/** Outbound delivery-status webhook: `message.sent`, `message.finalized`. */
export const parseTelnyxMessageStatus = makeParser(messageStatusValidators)
