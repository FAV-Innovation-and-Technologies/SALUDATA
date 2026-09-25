# Synthetic examples

All examples in this directory use synthetic, shadow-only data. Do not send
real patient, device, or clinical data to the local example configuration.

## Docker integration smoke test

Run the API, a disposable MongoDB volume, and the full HTTP smoke test with:

```sh
npm run test:integration
```

The command builds `Dockerfile.api`, assigns a random loopback port and Compose
project name, exercises metadata and Swagger plus Patient create/read/update/
search/delete and Organization create/read/update/delete, then posts a synthetic measurement and reads back its
materialized FHIR Observation. It always removes its containers, network, and
MongoDB volume when it finishes.

In CI, start the API and MongoDB separately and use the same checks without
Docker:

```sh
FHIR_TEST_BASE_URL=http://127.0.0.1:3000 npm run test:integration
```

The test creates fresh opaque identifiers and timestamps at runtime so it can
be rerun safely. It requires the API to use these synthetic ingestion settings:

```dotenv
MONITORING_INGESTION_MODE=synthetic
MONITORING_KAFKA_PUBLISHING_ENABLED=false
MONITORING_SYNTHETIC_AUTH_REQUIRED=false
KAFKA_ENABLED=false
```

## Measurement payload

[`synthetic-measurement-batch.json`](synthetic-measurement-batch.json) is a
valid shape example for `POST /v1/measurement-batches`. Its `patient_ref` and
`device_ref` values are opaque test references, not identities. Before sending
the file manually, replace the batch/event/correlation identifiers and set
`occurred_at` and `produced_at` to current UTC timestamps; production times
more than five minutes in the future are rejected.

For a running local API configured with synthetic ingestion, use a new
idempotency key for each distinct payload:

```sh
curl --fail-with-body http://127.0.0.1:3000/v1/measurement-batches \
  -H 'Content-Type: application/fhir+json' \
  -H 'Idempotency-Key: idem-example-0001' \
  --data-binary @examples/synthetic-measurement-batch.json
```

The accepted response includes `events[0].fhir.observation_ids`. Read one of
those IDs through the normal FHIR endpoint:

```sh
curl --fail-with-body -H 'Accept: application/fhir+json' \
  http://127.0.0.1:3000/4_0_0/Observation/OBSERVATION_ID
```

The resulting Observation is labelled synthetic and shadow-only, and is not
for clinical use.
