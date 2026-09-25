# API documentation

This project exposes an experimental FHIR R4 facade backed by MongoDB. It is derived from BlueHalo's `node-fhir-server-mongo` and uses `@bluehalo/node-fhir-server-core`; see [NOTICE](NOTICE) for attribution. The code is MIT-licensed, but neither the source nor this document makes a conformance, clinical-safety, interoperability, or regulatory claim.

## Start a local instance

```sh
cp .env.example .env
docker compose up --build
```

The local API is available at `http://localhost:3000`. The example Compose setup binds to loopback, starts MongoDB without authentication, and is for synthetic data only.

## Discover a deployment

OpenAPI is served at `GET /api-docs` (with `GET /docs` redirecting there). Its resource paths are generated from the profiles in `src/config.js`; they show configured route shapes, not verified support for every FHIR interaction or search parameter.

For the source of truth for a running instance, request its CapabilityStatement:

```sh
curl -H 'Accept: application/fhir+json' http://localhost:3000/4_0_0/metadata
```

Validate every interaction your application needs in the target environment. In particular, do not assume that configured resources support history, every FHIR search parameter, PATCH, transactions, or a specific error shape. The repository's supported local baseline is the synthetic Docker CRUD smoke test run by `npm run test:integration`.

## Basic synthetic example

With the local development defaults, create a synthetic Patient and retain the returned `id` for subsequent requests:

```sh
curl -i -X POST http://localhost:3000/4_0_0/Patient \
  -H 'Content-Type: application/fhir+json' \
  -H 'Accept: application/fhir+json' \
  --data '{
    "resourceType": "Patient",
    "name": [{"family": "Example", "given": ["Synthetic"]}],
    "meta": {"security": [{"code": "synthetic"}]}
  }'
```

Then read it using `GET /4_0_0/Patient/<id>`. This is a development example, not a data model or identity-management recommendation.

## Optional and legacy interfaces

- `POST /upload-bundle` is a legacy multipart handler. Set `FHIR_LEGACY_ENDPOINTS_ENABLED=false` to disable it. It may require bearer authentication when authentication is enabled.
- Sports ECG routes and Kafka publishing are optional. See [SPORTS_ECG_INGESTION.md](SPORTS_ECG_INGESTION.md) before enabling them.
- The synthetic Step 1 measurement runtime is a separate container with a deliberately narrow HTTP surface. See [MONITORING_INGESTION_V1.md](MONITORING_INGESTION_V1.md).
- Supabase bearer authentication is optional and disabled by the local default. See [AUTHENTICATION.md](AUTHENTICATION.md).

Do not expose any optional interface until it has been reviewed for the deployment's authentication, authorization, TLS, network, retention, and data-protection requirements.
