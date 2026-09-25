# Saludata Sports ECG Ingestion

This is an optional, experimental ingestion interface for Saludata Sports ECG
data. It has not been validated as a clinical ECG interpretation system. It
accepts data in two complementary modes:

- **Post-session analysis**: the app uploads the FHIR session envelope, ECG chunks
  and records an offline model-analysis request.
- **Realtime analysis**: the app streams ECG batches over WebSocket. Every batch is
  persisted before the server returns ACK. Rejected batches return NACK and should
  stay in the device outbox.

## Endpoints

- `POST /4_0_0/training-sessions`
- `POST /4_0_0/training-sessions/:sessionId/chunks`
- `POST /4_0_0/training-sessions/:sessionId/analysis`
- `GET /4_0_0/training-sessions/:sessionId/ingestion-status`
- `POST /sports/realtime/batches`
- `WSS /sports/training?sessionId=<id>&userId=<supabase-user-id>`

All endpoints require `Authorization: Bearer <Supabase JWT>` and configured
`SUPABASE_URL` / `SUPABASE_ANON_KEY` values. Token validation alone does not
provide a complete patient-consent, tenant-isolation, or clinical authorization
model; assess and extend authorization before exposing these routes.

## Storage

The route stores:

- `sports_training_sessions`
- `sports_session_chunks`
- `sports_realtime_batches`
- `sports_analysis_requests`

FHIR evidence resources included in the session bundle are also upserted into
their standard resource collections, including `Observation_4_0_0` and
`DocumentReference_4_0_0`.

## Optional Event Publishing

By default this route does **not** publish model or stream events. This keeps dev
ingestion testable without leaving phantom consumers or accumulating processing
queues while no ECG model worker is deployed.

Set `SPORTS_ECG_EVENT_PUBLISHING_ENABLED=true` only when a real stream/model
processor is available. With that flag enabled, messages are published to:

- `SPORTS_REALTIME_TOPIC`, default `saludata.sports.ecg.realtime`
- `SPORTS_POST_SESSION_TOPIC`, default `saludata.sports.ecg.post_session`
- `SPORTS_MODEL_EVENTS_TOPIC`, default `saludata.sports.ecg.model_events`

When publishing is disabled, ingestion still persists data and returns ACK/NACK.
`POST /analysis` stores an analysis request with status `stored`; it only returns
`queued` when event publishing is explicitly enabled and the Kafka publish
succeeds.

## FHIR Standard Boundary

FHIR `Subscription`/`SubscriptionTopic` is for notifying subscribers about events
such as new `DocumentReference`, `DiagnosticReport` or model-result
`Observation` resources. It is not used as the 130 Hz ECG transport.

The raw ECG signal remains in chunks/realtime batches. FHIR resources index the
clinical evidence and expose final or preliminary results.
