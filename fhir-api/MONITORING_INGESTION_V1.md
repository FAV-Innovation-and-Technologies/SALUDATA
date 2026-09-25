# Monitoring ingestion v1 — Step 1

This module is the synthetic, shadow-only ingestion boundary for the initial
SALUDATA monitoring pipeline. It accepts no real patient data and does not
produce patient-facing or clinician-facing alerts.

## Boundary

- HTTP: `POST /v1/measurement-batches`
- Kafka topic: `saludata.measurements.pseud.v1`
- Event schema: `saludata.measurement-event.v1`
- Kafka message key: `patient_ref`
- FHIR version: R4 (`4_0_0` Mongo collections)

The Step 1 container starts `node src/step1-ingestion.js`, not the legacy FHIR
facade. Its HTTP surface is deliberately limited to `GET /healthz` and the
batch endpoint above. `/4_0_0/*`, `/upload-bundle`, `/alerts-hook`, Swagger,
and every other path return `404`. The full facade remains a separate runtime
and its custom legacy handlers are either disabled explicitly or guarded by
the configured bearer strategy.

The image is also dependency-isolated: `package.step1.json` and
`package-lock.step1.json` contain only the dedicated HTTP, Mongo and Kafka
runtime. The full FHIR facade, Swagger, upload handlers and their transitive
packages are not copied into the Step 1 dependency graph. The Docker build uses
`npm ci`, applies the checksum-verified KafkaJS patch, removes package-manager
tooling afterwards and runs as the non-root `node` user.

The HTTP envelope is:

```json
{
  "schema_version": "saludata.measurement-batch.v1",
  "batch_id": "batch_00000001",
  "events": []
}
```

`events` contains between 1 and 100 canonical measurement events. Every
request requires an `Idempotency-Key` header. The canonical event schema and
examples are maintained in the versioned monitoring contracts; this service
also enforces their semantic invariants before writing anything.

The closed v1 contract requires at least one measurement in every event.
Therefore a `mobile_app` event with coded symptoms must also carry a current
reading/context measurement. Symptom-only ingestion remains an explicit v1
gap and requires a separately reviewed, versioned contract change; this
endpoint does not silently relax the shared schema.

## Safety properties in Step 1

- `patient_ref` is exactly `pt_` plus 32 lowercase hexadecimal characters.
- `device_ref` is exactly `dev_` plus 32 lowercase hexadecimal characters.
- Every event must contain `synthetic: true`, `mode: "shadow"`, and
  `clinical_use: false`.
- Direct identifiers and free text are rejected. Symptoms are coded values.
- Objects reject unknown properties; measurement codes, UCUM units, ranges,
  timestamps, signal quality, and blood-pressure ordering are validated.
- Source/measurement semantics mirror the downstream v1 consumer: a
  `blood_pressure_monitor` event must contain both
  `systolic_blood_pressure` and `diastolic_blood_pressure`, and a
  `smart_scale` event must contain `body_weight`. Invalid combinations are
  rejected before Mongo/FHIR/outbox writes, so they cannot become Kafka poison
  messages.
- UTC timestamps must end in `Z`; `produced_at` cannot precede `occurred_at`.
- Logs contain counts, controlled error codes, request hash prefixes, and
  event hash prefixes only. They do not contain payloads or patient/device
  references.

The source rules intentionally do not prohibit extra measurements that the
closed schema and consumer accept. For example, a blood-pressure session may
also contain the pulse reported by the cuff. This keeps the producer aligned
with v1 instead of introducing an undocumented device matrix.

`MONITORING_INGESTION_MODE=synthetic` is the only unauthenticated mode and
still accepts only the three fixed Step 1 flags above. The default is
`disabled`. In `authenticated` mode a valid Supabase bearer token is required,
and authorization is read only from `app_metadata.monitoring_patient_refs`
with `app_metadata.monitoring_ingestion_enabled=true`. User-editable metadata
is never used for authorization.

## Persistence and FHIR materialization

Each validated event is converted deterministically into a FHIR R4
transaction `Bundle` and one or more `Observation` resources:

- Heart rate: LOINC `8867-4`
- Pulse-oximeter oxygen saturation: LOINC `59408-5`
- Blood-pressure panel: LOINC `85354-9`, with systolic `8480-6` and diastolic
  `8462-4` components when both values are present
- Body weight: LOINC `29463-7`
- Step count: LOINC `41950-7`
- Accelerometer/activity values: SALUDATA code system
- Coded symptoms: SNOMED CT concepts with coded severity

Observation and Bundle FHIR IDs are hashes of `event_id` plus observation
type, so retries upsert the same resources. Pseudonymous patient and device
references use an injective FHIR R4-safe mapping (`pt_<hex>` to `pt-<hex>` and
`dev_<hex>` to `dev-<hex>`); the original opaque reference is also retained as
a typed `Reference.identifier`, never as identity data. Their Mongo storage
IDs are deterministic (including the FHIR version for history rows), which
prevents two first-write upserts from creating duplicate current or history
documents. Legacy rows retain their existing Mongo IDs and are updated in
place. All generated resources carry explicit `synthetic`, `shadow`, and
`clinical-use=false` security labels.

FHIR `Quantity.code` uses canonical UCUM: heart rate is `/min` and step count
is dimensionless `1`. `Quantity.unit` deliberately retains the controlled,
human-readable transport display (`beats/min` or `count`).

Mongo collections added by the boundary:

- `monitoring_ingestion_requests`
- `monitoring_measurement_events`
- `monitoring_measurement_outbox`
- Existing `Observation_4_0_0` and `Bundle_4_0_0` collections, plus histories

## Delivery semantics

The request and every `event_id` have independent payload fingerprints. Reuse
with a different payload returns HTTP `409`. Identical retries materialize no
additional FHIR resources and do not publish an already-published event again.

The event is written to the Mongo outbox only after FHIR materialization and
is then marked ready. A publisher claims entries with a lease before sending
them to Kafka. Failures retain only a controlled error code and use bounded
exponential retry. A successful Kafka send followed by a Mongo failure can
still cause a later duplicate; downstream consumers must therefore deduplicate
by `event_id`. This is intentional at-least-once delivery.

FHIR materialization itself also has a Mongo-backed lease on the canonical
event row. Concurrent identical HTTP requests therefore have one materializer;
other requests wait for and reuse its deterministic FHIR result. A crashed
owner leaves an expiring lease and controlled retry state rather than creating
parallel `Observation`, `Bundle`, or history rows. The owner renews the lease
during long materializations and must still own it when committing the result;
the outbox is not marked ready until that ownership check succeeds.

The dedicated runtime also owns the lifecycle of its Mongo, Kafka, ingestion
timer, and HTTP server handles. Any index, Kafka, or listener startup failure
closes every handle before exiting nonzero, allowing the container restart
policy to recover instead of leaving a live but unhealthy Node process.

## Producer/consumer parity verification

`tests/measurement-consumer-parity.test.js` submits the same fixture matrix to
the HTTP-boundary validator and to the real Python adapter in
`biosignal-anomaly-engine/demo/contract_events.py`. It verifies matching
accept/reject decisions for ring data, complete and incomplete pressure
sessions, and valid and invalid scale events. The test uses the sibling engine
checkout by default, or `BIOSIGNAL_ENGINE_ROOT` when the repositories live in
different directories. It is skipped only when the consumer checkout is not
available; the local contract tests always enforce the invariants.

```bash
BIOSIGNAL_ENGINE_ROOT=/path/to/biosignal-anomaly-engine \
  yarn test:jest --runInBand tests/measurement-consumer-parity.test.js
```

## Configuration

```dotenv
MONITORING_INGESTION_MODE=synthetic
MONITORING_MEASUREMENTS_TOPIC=saludata.measurements.pseud.v1
MONITORING_KAFKA_PUBLISHING_ENABLED=true
MONITORING_OUTBOX_INTERVAL_MS=5000
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=fhir-api-service
```

El despliegue sintético del clúster añade
`MONITORING_SYNTHETIC_AUTH_REQUIRED=true` y obtiene
`MONITORING_SYNTHETIC_BEARER_TOKEN` del gestor de secretos. El BFF envía ese
bearer únicamente en la llamada servidor-a-servidor; nunca se entrega al
navegador. La comparación es de tiempo constante y el proceso falla al arrancar
si el token tiene menos de 32 caracteres o contiene espacios. La demo local
puede mantener esta defensa desactivada porque solo publica en loopback.

For a remote synthetic/shadow deployment, MongoDB fails closed unless
`MONGO_TLS=true` and `MONGO_TLS_CA_FILE` points to a CA mounted from the secret
manager. `MONGO_TLS_CERTIFICATE_KEY_FILE` optionally enables client-certificate
authentication. Certificate validation cannot be disabled. Prefer injecting a
complete `MONGO_URI` from the secret manager; it is never a manifest value or a
process argument.

Kafka likewise requires `SSL` or `SASL_SSL` outside the local Docker network,
with a trusted CA and least-privilege ACLs. Switching the ingestion mode to
`authenticated` or accepting non-synthetic data is a later, separately
reviewed contract and is not enabled by these transport settings.
