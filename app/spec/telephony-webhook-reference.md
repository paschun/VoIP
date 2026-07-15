# Telephony provider webhook reference

For each webhook: what the provider **sends**, and what your app must **return**. Every section uses the same labels.
Telnyx voice/messaging fields are taken from the Telnyx OpenAPI spec
(`spec3.json`: https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json), which is more complete
than the HTML docs. Twilio fields come from Twilio's webhook docs.

**Important — Twilio OpenAPI scope.** The Twilio OpenAPI spec (twilio/twilio-oai) models the **REST API resources**
(Message, Call), **not** the inbound webhook payload your app receives, nor the TwiML you return. It has no `webhooks`
section, no `NumMedia`/`MediaUrl0`, no `X-Twilio-Signature`. So Twilio webhook *payloads* here cite the HTML webhook
docs; the spec is used only to pin the **canonical enums and field types** the status callbacks share with the
resources. Spec: https://raw.githubusercontent.com/twilio/twilio-oai/main/spec/json/twilio_api_v2010.json .

**Types** — Twilio/TeXML form params are transmitted as strings; the type column gives the semantic type. Telnyx JSON
types are literal. `['string','null']` means nullable.

- Telnyx webhooks wait 2 seconds before retrying
- Twilio waits 15s
---

## TwiML / TeXML response rules (applies to §1, §3, §4, §7)

The response body for Twilio voice/SMS and Telnyx TeXML is an XML document with these exact rules:

- Well-formed XML; prolog `<?xml version="1.0" encoding="UTF-8"?>` recommended.
- Exactly one root element: `<Response>`.
- Children are **verbs**, executed top-to-bottom in document order.
- **Messaging verbs:** `<Message>` (optional `<Body>`, `<Media>` nouns), `<Redirect>`. No voice verbs.
- **Voice verbs:** `<Say>`, `<Play>`, `<Dial>` (`<Number>`/`<Client>`/`<Sip>` nouns), `<Gather>`, `<Record>`,
  `<Reject>`, `<Hangup>`, `<Redirect>`, `<Pause>`, `<Enqueue>`, etc.
- **Empty `<Response></Response>` is valid** = take no action / send no reply.
- Response `Content-Type` must be `text/xml` or `application/xml`. A non-XML content-type or unparseable body is
  rejected and logged in the provider's debugger; no message is sent / the call errors.
- HTTP status must be `200`. Returning `4xx`/`5xx` or malformed TwiML is a failure → Twilio plays an error / uses the
  fallback URL; Telnyx uses the failover URL.

Sources: https://www.twilio.com/docs/usage/webhooks/messaging-webhooks , https://www.twilio.com/docs/usage/webhooks/webhooks-faq , https://www.twilio.com/docs/voice/twiml , https://developers.telnyx.com/docs/voice/programmable-voice/texml-instruction-fetching

---

## Voice / call

### 1. Twilio outbound voice (TwiML App Voice URL)

- **Verb:** `POST` (or `GET`) · **Incoming Content-Type:** `application/x-www-form-urlencoded`

| Field | Type |
| --- | --- |
| `CallSid`, `AccountSid`, `ApiVersion` | string |
| `From`, `To`, `Caller`, `Called` | string (E.164) |
| `CallStatus` | string enum |
| `Direction` | string (`outbound-api` \| `outbound-dial`) |
| `From{City,State,Zip,Country}`, `To{...}` | string (may be empty) |
| custom client params | string |

- **Response required:** yes · **Expected status:** `200`
- **Can you return error codes:** no — non-2xx / malformed TwiML → fallback URL or error tone
- **Response Content-Type:** `text/xml` · **Response body:** TwiML (see rules above), e.g. `<Response><Dial callerId="+1..."><Number>+1...</Number></Dial></Response>`

Sources: https://www.twilio.com/docs/voice/twiml , https://www.twilio.com/docs/voice/twiml.md , https://www.twilio.com/docs/voice/twiml/dial

### 2. Twilio voice status callback

- **Verb:** `POST` · **Incoming Content-Type:** `application/x-www-form-urlencoded`

| Field | Type |
| --- | --- |
| `CallSid`, `AccountSid` | string |
| `From`, `To` | string (E.164) |
| `CallStatus` | string enum: `queued`,`initiated`,`ringing`,`in-progress`,`completed`,`busy`,`failed`,`no-answer`,`canceled` |
| `Duration` | string (minutes; `completed` only) |
| `CallDuration` | string (seconds; terminal only) |
| `SipResponseCode`, `Direction`, `Timestamp` | string |

- **Response required:** no · **Expected status:** `200`
- **Can you return error codes:** body ignored; return `200` (non-200 logged as delivery error)
- **Response Content-Type:** n/a · **Response body:** none
- _Note:_ spec `call_enum_status` = the 8 values above **minus** `initiated`; `initiated` is webhook-only. Distinct
  from `StatusCallbackEvent` (which events fire): `call_enum_event` = `initiated`,`ringing`,`answered`,`completed`.

Sources: https://www.twilio.com/docs/voice/api/call-resource ; enums from OpenAPI https://raw.githubusercontent.com/twilio/twilio-oai/main/spec/json/twilio_api_v2010.json (`call_enum_status`, `call_enum_event`)

### 3. Twilio inbound voice

- **Verb:** `POST` (or `GET`) · **Incoming Content-Type:** `application/x-www-form-urlencoded`
- **Fields:** same set as §1, with `Direction=inbound`, `From`=caller, `To`=your number
- **Response required:** yes · **Expected status:** `200`
- **Can you return error codes:** no (same as §1)
- **Response Content-Type:** `text/xml` · **Response body:** TwiML, e.g. `<Response><Dial><Client>identity</Client></Dial></Response>`

Sources: https://www.twilio.com/docs/voice/twiml/client

### 4. Telnyx TeXML — inbound voice

- **Verb:** `GET` (default) or `POST` · **Incoming Content-Type:** `GET` → query string; `POST` → `application/x-www-form-urlencoded`

| Field | Type |
| --- | --- |
| `AccountSid` | string |
| `CallSid`, `CallSidLegacy` | string |
| `CallerId` | string |
| `CallingPartyType` | string (`sip` \| `pstn`) |
| `From`, `To` | string (E.164) |
| `FromSipUri`, `ToSipUri` | string |
| `ConnectionId` | string |
| `CallStatus` | string (e.g. `in-progress`) |

- **Response required:** yes · **Expected status:** `200`
- **Can you return error codes:** no — invalid TeXML → failover URL
- **Response Content-Type:** `application/xml` / `text/xml` · **Response body:** TeXML, root `<Response>` (see rules above)

Sources: https://developers.telnyx.com/docs/voice/programmable-voice/texml-instruction-fetching

### 5. Telnyx TeXML — voice status callback

- **Verb:** `POST` · **Incoming Content-Type:** `application/x-www-form-urlencoded`

Modeled in the TeXML calls spec (https://telnyx-openapi-ng.s3.us-east-1.amazonaws.com/texml/calls.yml, committed as
`app/spec/texml-calls.yml`): one `TexmlCall{Initiated,Ringing,Answered,Completed,
Dtmf}WebhookSchema` per `CallStatus` family, plus `TexmlReferStatusWebhookSchema`, `TexmlGatherWebhookSchema`, etc.
Call-progress-events fields common to all (all in the spec's `required`):

| Field | Type |
| --- | --- |
| `AccountSid`, `CallSid`, `CallSidLegacy`, `ConnectionId` | string |
| `CallStatus` | string enum per schema: `initiated` / `ringing` / `in-progress` / `completed`,`busy`,`no-answer`,`canceled`,`failed` / `dtmf` |
| `CallbackSource` | string (`call-progress-events`) |
| `SequenceNumber` | integer in the spec (string on the wire, like every form value) |
| `CallInitiatedAt`, `Timestamp` | string (spec says ISO date-time; docs previously said RFC-2822 UTC — unconfirmed) |
| `From`, `To` | string |
| `CallDuration`, `RecordingUrl`, `RecordingDuration`, `HangupCause`, `HangupSource`, ... | string (optional, `completed` family) |
| `ReferCallStatus`, `ReferSipResponseCode`, `NotifySipResponseCode` | string (Refer callbacks, own schema without `CallStatus`) |

- **Response required:** no · **Expected status:** `2xx`
- **Can you return error codes:** body ignored; return `2xx`
- _Note:_ still confirm against a live payload: the timestamp format conflict above, and the spec's own prose mentions
  an `analyzed` status after post-call processing that no schema enumerates -- but only for AI calls, which we never
  place, so our handler accepts only the schema-modeled statuses above and rejects (logs) everything else.

Sources: https://developers.telnyx.com/docs/voice/programmable-voice/texml-instruction-fetching , https://telnyx-openapi-ng.s3.us-east-1.amazonaws.com/texml/calls.yml

### 6. Telnyx Call Control — native voice events (JSON)

- **Verb:** `POST` · **Incoming Content-Type:** `application/json`
- **Headers:** `User-Agent: telnyx-webhooks`, `Telnyx-Signature-Ed25519`, `Telnyx-Timestamp`

**Envelope** (`data` object; delivered webhooks also carry `meta.attempt` int, `meta.delivered_to` string):

| Field | Type |
| --- | --- |
| `data.record_type` | string (`event`) |
| `data.event_type` | string (enum below) |
| `data.id` | string (uuid; dedupe key) |
| `data.occurred_at` | string (date-time) |
| `data.payload` | object |

**`data.payload` for `call.initiated`** (exact, from spec):

| Field | Type |
| --- | --- |
| `call_control_id`, `connection_id`, `call_leg_id`, `call_session_id` | string |
| `client_state` | string (Base64) |
| `from`, `to` | string (E.164) |
| `direction` | string (`incoming` \| `outgoing`) |
| `state` | string (`parked` \| `bridging`) |
| `caller_id_name` | string |
| `connection_codecs`, `offered_codecs` | string |
| `shaken_stir_attestation` | string |
| `shaken_stir_validated` | boolean |
| `call_screening_result` | string |
| `custom_headers`, `sip_headers`, `tags` | array |
| `start_time` | string (date-time) |

**`data.payload` for `call.hangup`** (exact — previously unconfirmed, now from spec):

| Field | Type |
| --- | --- |
| `call_control_id`, `connection_id`, `call_leg_id`, `call_session_id` | string |
| `client_state` | string |
| `from`, `to` | string (E.164) |
| `start_time` | string (date-time) |
| `state` | string (`hangup`) |
| `hangup_cause` | string enum: `call_rejected`,`normal_clearing`,`originator_cancel`,`timeout`,`time_limit`,`user_busy`,`not_found`,`no_answer`,`unspecified` |
| `hangup_source` | string enum: `caller`,`callee`,`unknown` |
| `sip_hangup_cause` | string |
| `call_quality_stats` | ['object','null'] |
| `custom_headers`, `sip_headers`, `tags` | array |

**Full `event_type` enum (from spec — richer than the docs page):**
`call.initiated`, `call.answered`, `call.hangup`, `call.bridged`, `call.hold`, `call.unhold`,
`call.playback.started`, `call.playback.ended`, `call.speak.started`, `call.speak.ended`, `call.dtmf.received`,
`call.gather.ended`, `call.recording.saved`, `call.recording.error`, `call.recording.transcription.saved`,
`call.transcription`, `call.machine.detection.ended`, `call.machine.greeting.ended`,
`call.machine.premium.detection.ended`, `call.machine.premium.greeting.ended`, `call.fork.started`,
`call.fork.stopped`, `call.enqueued`, `call.dequeued`, `call.refer.started`, `call.refer.completed`,
`call.refer.failed`, `call.siprec.started`/`siprec.started`, `siprec.stopped`, `siprec.failed`,
`streaming.started`, `streaming.stopped`, `streaming.failed`, `call.ai_gather.ended`,
`call.ai_gather.partial_results`, `call.ai_gather.message_history_updated`, `call.cost`,
`call.deepfake_detection.result`, `call.deepfake_detection.error`, `call.conversation.ended`,
`call.conversation_insights.generated`. Conferences add `conference.created`, `conference.ended`,
`conference.participant.joined`, `conference.participant.left`, plus conference playback/speak/recording events.

- **Response required:** yes · **Expected status:** `2xx`
- **Can you return error codes:** yes, and they drive retry — `3xx` = followed (≤3 redirects, not a failure); `408`/`429` and `5xx` = retried; other `4xx` = not retried
- **Response Content-Type:** n/a · **Response body:** none — ack with `2xx`, then drive the call via `POST /v2/calls/{call_control_id}/actions/...`

Sources: https://developers.telnyx.com/docs/voice/programmable-voice/voice-api-webhooks , OpenAPI spec https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json (schemas `CallInitiatedEvent`, `CallHangup`/`CallHangupEvent`)

---

## SMS / messaging

### 7. Twilio inbound SMS/MMS

- **Verb:** `POST` (or `GET`) · **Incoming Content-Type:** `application/x-www-form-urlencoded`

| Field | Type |
| --- | --- |
| `MessageSid` | string |
| `SmsSid`, `SmsMessageSid` | string (deprecated aliases of `MessageSid`) |
| `AccountSid` | string |
| `MessagingServiceSid` | string (if via Messaging Service) |
| `From`, `To` | string (E.164) |
| `Body` | string |
| `NumMedia` | string (integer count) |
| `NumSegments` | string (integer count) |
| `MediaUrl{N}` | string (URL; `N` = 0…`NumMedia`-1) |
| `MediaContentType{N}` | string (MIME) |
| `From{City,State,Zip,Country}`, `To{...}` | string (may be empty) |

- **Response required:** yes (empty response is valid) · **Expected status:** `200`
- **Can you return error codes:** no — non-2xx / invalid TwiML logs an error, no reply sent
- **Response Content-Type:** `text/xml` · **Response body:** TwiML — reply `<Response><Message>hi</Message></Response>`; receive-only `<Response></Response>`

Sources: https://www.twilio.com/docs/messaging/guides/webhook-request

### 8. Twilio message status callback

- **Verb:** `POST` · **Incoming Content-Type:** `application/x-www-form-urlencoded`

| Field | Type |
| --- | --- |
| `MessageSid` | string |
| `MessageStatus` | string enum: `accepted`,`scheduled`,`queued`,`sending`,`sent`,`delivered`,`undelivered`,`failed`,`canceled`,`read`,`partially_delivered` |
| `From`, `To` | string (E.164) |
| `ErrorCode` | string (on failure) |
| `MessagingServiceSid`, `ApiVersion` | string |

- **Response required:** no · **Expected status:** `200`
- **Can you return error codes:** body ignored; return `200`
- **Response Content-Type:** n/a · **Response body:** none

Sources: https://www.twilio.com/docs/messaging/guides/outbound-message-status-in-status-callbacks

### 9. Telnyx inbound message (JSON)

- **Verb:** `POST` · **Incoming Content-Type:** `application/json`
- **Headers:** `Telnyx-Signature-Ed25519`, `Telnyx-Timestamp` · **`data.event_type`:** `message.received`

**Envelope:** `{ "data": { record_type:"event", id:string(uuid), event_type:"message.received", occurred_at:string, payload:object } }`

**`data.payload`** (exact, from spec):

| Field | Type |
| --- | --- |
| `record_type` | string (`message`) |
| `id` | string (uuid) |
| `direction` | string (`inbound`) |
| `type` | string (`SMS` \| `MMS`) |
| `messaging_profile_id`, `organization_id` | string |
| `from` | object (below) |
| `to` | array of object (below) |
| `cc` | array of object |
| `text` | string |
| `subject` | ['string','null'] |
| `num_chars` | integer |
| `parts` | integer |
| `encoding` | string (e.g. `GSM-7`) |
| `media` | array of object (below) |
| `tags` | array of string |
| `cost`, `cost_breakdown` | ['object','null'] |
| `tcr_campaign_id` | ['string','null'] |
| `tcr_campaign_billable` | boolean |
| `tcr_campaign_registered` | ['string','null'] |
| `received_at` | string |
| `sent_at`, `completed_at`, `valid_until` | ['string','null'] |
| `webhook_url`, `webhook_failover_url` | ['string','null'] |
| `errors` | array of object `{ code, title, detail, source, meta }` |

`from` object: `phone_number` string · `status` string enum `received`,`delivered` · `carrier` string · `line_type` string enum `Wireline`,`Wireless`,`VoWiFi`,`VoIP`,`Pre-Paid Wireless`,`""`.
`to[]` / `cc[]` object: `phone_number` string · `status` string enum `queued`,`sending`,`sent`,`delivered`,`sending_failed`,`delivery_failed`,`delivery_unconfirmed`,`webhook_delivered` · `carrier` string · `line_type` (same enum).
`media[]` object: `url` string · `content_type` string · `size` integer · `hash_sha256` string. (MMS media links expire ~30 days — download immediately.)

- **Response required:** yes · **Expected status:** `2xx`
- **Can you return error codes:** yes (same retry rules as §6)
- **Response Content-Type:** n/a · **Response body:** none — to reply, call `POST /v2/messages` separately

Sources: OpenAPI spec https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json (schemas `InboundMessageEvent`, `InboundMessagePayload`) , https://developers.telnyx.com/docs/messaging/messages/send-receive-mms

### 10. Telnyx message status webhook (JSON)

- **Verb:** `POST` · **Incoming Content-Type:** `application/json`
- **`data.event_type`:** `message.sent` and `message.finalized`

Same `payload` shape as §9 but `direction` = `outbound`, plus `smart_encoding_applied` (boolean) and
`wait_seconds` (['number','null']). Delivery outcome is per-recipient at `data.payload.to[].status`:

| Field | Type |
| --- | --- |
| `data.payload.to[].status` | string enum: `queued`,`sending`,`sent`,`delivered`,`expired`,`sending_failed`,`delivery_failed`,`delivery_unconfirmed` |
| `data.payload.id` | string (uuid) |
| `data.payload.errors` | array of object `{ code, title, detail, source, meta }` |

- **Response required:** yes · **Expected status:** `2xx`
- **Can you return error codes:** yes (same retry rules as §6)
- **Response Content-Type:** n/a · **Response body:** none

Sources: OpenAPI spec https://raw.githubusercontent.com/team-telnyx/openapi/master/openapi/spec3.json (schemas `OutboundMessageEvent`, `OutboundMessagePayload`) , https://developers.telnyx.com/docs/messaging/messages/receiving-webhooks

---

## Signature verification (all sections)

**Twilio** — header `X-Twilio-Signature`; HMAC-SHA1 of (full URL + alphabetically-sorted POST params) keyed by your
Auth Token. Validate with the SDK `RequestValidator`. Also sends `I-Twilio-Idempotency-Token`.
https://www.twilio.com/docs/usage/webhooks/webhooks-security

**Telnyx** — headers `Telnyx-Signature-Ed25519` (Base64) + `Telnyx-Timestamp` (Unix). Verify the Ed25519 signature over
`"{timestamp}|{raw_body}"` against the raw request bytes with your public key; reject stale timestamps.
https://developers.telnyx.com/development/api-fundamentals/webhooks/receiving-webhooks
