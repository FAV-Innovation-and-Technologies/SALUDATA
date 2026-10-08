<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/saludata-logo-dark.png">
    <img src="docs/saludata-logo.png" alt="SALUDATA" width="360">
  </picture>
</p>

# SALUDATA

Tools for health-data interoperability and synthetic monitoring workflows, released as open source by the **SALUDATA** project (*Plataforma para el seguimiento integral de pacientes con un sistema de alertas predictivo*), developed by FAV Innovation and Technologies Coop. V. (FAVIT).

The code was developed during the project's execution period (February 2025 – June 2026) and published as open source after its completion.

**Funding:** Ministerio para la Transformación Digital y de la Función Pública (Spain), grant TSI-100130-2024-15.

## Modules

| Module | Description |
|---|---|
| [`fhir-api`](fhir-api/README.md) | Node.js FHIR API backed by MongoDB, with optional Kafka integration and synthetic measurement ingestion |
| [`synthetic-generator`](synthetic-generator/README.md) | Generator and validation tools for the SALUDATA synthetic remote monitoring dataset |

## Related dataset

SALUDATA Synthetic Remote Monitoring Dataset (v0.1.0): 20,000 fictional patients, 3.68 million multisensor observations and 120,000 scenario episodes, calibrated on public MIMIC-III Waveform data. https://doi.org/10.5281/zenodo.23057595 (ODbL-1.0)

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

## Synthetic data generator

See [`synthetic-generator/README.md`](synthetic-generator/README.md). Python 3.11; unit tests run with `python -m pytest -q code` from that folder.

## How to cite

See [`CITATION.cff`](CITATION.cff), or use GitHub's *Cite this repository* button.

## Contact

Francisco José Pérez Carrasco — fperez@favit.es

## License

[MIT](LICENSE). Preserve the license and copyright notices when redistributing the code. Upstream attribution is retained in [`fhir-api/NOTICE`](fhir-api/NOTICE).



<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logos-financiacion.jpg">
    <img src="docs/logos-financiacion.jpg" alt="SALUDATA" width="800">
  </picture>
</p>

