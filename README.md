# SALUDATA

Tools for health-data interoperability and synthetic monitoring workflows.

## FHIR API

The [`fhir-api`](fhir-api/README.md) module provides a Node.js FHIR API backed by MongoDB, with optional Kafka integration and synthetic measurement ingestion. It derives from BlueHalo's MIT-licensed FHIR server example; see [attribution](fhir-api/NOTICE).

### Run locally

Requires Docker with Compose:

```sh
git clone https://github.com/FAV-Innovation-and-Technologies/SALUDATA.git
cd SALUDATA/fhir-api
cp .env.example .env
docker compose up --build
```

Open [Swagger](http://localhost:3000/api-docs) or the [FHIR CapabilityStatement](http://localhost:3000/4_0_0/metadata). Local defaults disable authentication and are for synthetic development data only.

### Verify

Requires Node.js 22 or later and Docker:

```sh
cd fhir-api # from the repository root
npm ci
npm run check
npm run test:integration
```

The integration suite exercises Patient and Organization CRUD, Patient search, and synthetic measurement ingestion followed by Observation read-back against a disposable MongoDB instance. GitHub Actions runs the checks automatically on pushes and pull requests.

### Documentation

- [API setup and scope](fhir-api/README.md)
- [Runnable synthetic examples](fhir-api/examples/README.md)
- [Development and limitations](fhir-api/DEVELOPMENT.md)
- [Contributing](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)
- [Changelog](fhir-api/CHANGELOG.md)

The project does not claim complete FHIR conformance or clinical validation. Experimental integrations and known limitations are documented in the module.

## License

[MIT](LICENSE). Preserve the license and copyright notices when redistributing the code. Upstream attribution is retained in [`fhir-api/NOTICE`](fhir-api/NOTICE).
