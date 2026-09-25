# SALUDATA FHIR API

Experimental FHIR R4 API backed by MongoDB. It derives from [BlueHalo/node-fhir-server-mongo](https://github.com/BlueHalo/node-fhir-server-mongo) and uses `@bluehalo/node-fhir-server-core`. It also contains optional Kafka publishing, sports ECG ingestion and a separate synthetic measurement-ingestion runtime.

This repository is useful as a development and integration starting point, not as a certified FHIR implementation or a clinical system. Routes configured in `src/config.js` are a starting point only: validate the interactions, searches and version history required by your use case against a running deployment's CapabilityStatement.

## Local development

Requires Node.js 22 or later and MongoDB, or Docker Compose. GitHub Actions uses Node.js 22. R4 resource routes are configured in `src/config.js`; inspect `/4_0_0/metadata` for exposed capabilities. This is not a claim of full FHIR conformance.

```sh
cp .env.example .env
npm ci
# With MongoDB available on localhost:27017:
npm start
```

Alternatively, run both services locally:

```sh
cp .env.example .env
docker compose up --build
```

The API is at http://localhost:3000, Swagger at http://localhost:3000/api-docs and metadata at http://localhost:3000/4_0_0/metadata. Compose binds only to loopback. MongoDB has no authentication in this local example. Use synthetic data only. Configure authentication, TLS, database access and allowed browser origins before exposing a deployment.

Local examples disable authentication, Kafka, legacy endpoints and measurement ingestion by default. `.env` is private and ignored by Git. The integration documentation describes the environment variables needed to enable optional features.

## Two runtimes

- `npm start` / `Dockerfile.api`: full FHIR API, `src/index.js`.
- `Dockerfile`: minimal Step 1 synthetic measurement ingestion, `src/step1-ingestion.js`, with its own manifest and lock. See [measurement ingestion](MONITORING_INGESTION_V1.md).

The default Compose file runs the full FHIR API. It does not deploy the optional Kafka, authentication or monitoring services.

## Tests

```sh
npm ci
npm run check
npm run test:integration
```

`npm run check` runs lint, Jest and the Step 1 policy validator. `npm run test:integration` starts an isolated Docker MongoDB/API stack and performs a synthetic FHIR CRUD smoke test; it does not use external credentials. The consumer parity test requires the separate biosignal engine; set `BIOSIGNAL_ENGINE_ROOT` explicitly to enable it. It is skipped when that external checkout is unavailable. Lint errors fail the check; generated-service unused-variable warnings remain documented in `DEVELOPMENT.md`.

GitHub Actions runs lint, Jest, the Step 1 policy validator, dependency audits and the HTTP integration checks against a disposable MongoDB service without production credentials. The optional GitLab Step 1 image pipeline requires deliberately configured protected runners and variables; see [Step 1 CI](STEP1_GITLAB_CI.md). No production deployment configuration is included.

## Documentation

- [API documentation](DOCUMENTATION.md)
- [Swagger](README-SWAGGER.md)
- [Authentication](AUTHENTICATION.md)
- [Sports ECG ingestion](SPORTS_ECG_INGESTION.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
- [Development notes](DEVELOPMENT.md)
- [Runnable synthetic examples](examples/README.md)
- [Changelog](CHANGELOG.md)

## Status and scope

The default Docker Compose setup and the synthetic integration test are the maintained local path. The following capabilities remain optional or experimental and need deployment-specific review: bearer authentication, Kafka publishing, sports ECG routes, the legacy Bundle-upload route and the Step 1 monitoring runtime. Do not send real patient data to the sample configuration.

## License and attribution

[MIT](LICENSE). Retain the license and copyright notices when redistributing copies or substantial portions. MIT permits commercial and proprietary use; it does not require an on-screen credit, backlink, or publication of modifications. See [NOTICE](NOTICE) for the upstream attribution and third-party scope.

The package is marked `private` to avoid accidental npm publication; that setting does not restrict the MIT license or public Git hosting.
