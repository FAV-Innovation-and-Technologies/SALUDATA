# OpenAPI and Swagger UI

Start the API, then open `http://localhost:3000/api-docs`. `GET /docs` redirects to the same UI.

The OpenAPI document is generated from the FHIR profiles registered in `src/config.js`, plus a small number of explicitly documented optional routes. This keeps the route list close to the local configuration, but it is deliberately conservative:

- It does not claim FHIR R4 conformance or complete coverage of FHIR resources.
- A listed route is not a guarantee that every interaction, search parameter, history operation, response code, or resource element has been verified.
- The `GET /4_0_0/metadata` CapabilityStatement from the running deployment is the authoritative starting point for an integration.

Swagger UI is intended for local exploration with synthetic data. Before using a route in an application, test the exact request and response against the target deployment and apply its authentication and authorization policy.

`POST /upload-bundle` is marked as legacy because it can be disabled with `FHIR_LEGACY_ENDPOINTS_ENABLED=false`. Other optional interfaces, including sports ECG ingestion and the separate Step 1 runtime, have their own documentation and are not represented as standard FHIR conformance claims.

For a reproducible local baseline, run `npm run test:integration`; it uses Docker and synthetic data to smoke-test FHIR CRUD.
