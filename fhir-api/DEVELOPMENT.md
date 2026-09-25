# Development notes

## Validation

Use Node.js 22 or later. Run:

```sh
npm ci
npm run check
npm run test:integration
```

`check` runs ESLint, Jest and the Step 1 CI policy validator. The integration script builds the API image, starts a disposable MongoDB instance, exercises HTTP operations with synthetic data and removes its containers and volume. See [examples](examples/README.md).

GitHub Actions also runs the HTTP checks with a MongoDB service and audits the main and Step 1 dependency locks. High and critical npm advisories fail CI. The optional GitLab Step 1 image pipeline needs protected runners and explicitly configured publication variables; it never deploys the application.

The consumer parity test requires `BIOSIGNAL_ENGINE_ROOT` pointing to a compatible biosignal engine checkout; otherwise it is explicitly skipped. This external integration is not required for the local API example.

## Last verification

On 2026-09-24, a fresh installation in Node.js 22 on Linux passed lint, 85 Jest tests and the Step 1 policy validator. One optional external consumer-parity test was skipped. The Docker integration passed Patient and Organization CRUD, Patient search, measurement ingestion and Observation read-back. Both runtime images built successfully. GitHub Actions repeats these checks for pushes and pull requests.

## Scope and remaining limitations

The integration suite validates selected Patient and Organization operations and synthetic measurement ingestion/read-back. It is not a conformance suite for every registered FHIR resource. Generated history handlers query current stored records; the database does not preserve a complete sequence of past resource versions. Do not rely on them as a longitudinal version archive.

ESLint errors fail CI. Generated services retain unused search-parameter declarations reported at warning level; `test:lint` uses `--quiet` to keep CI output focused on errors. To inspect this maintenance debt, run `npx eslint "src/**/*.js"`.

As of 2026-09-24, the main production npm dependency audit reports three low-severity findings in the BlueHalo core → jwk-to-pem → elliptic chain, with no automatic fix. The separate Step 1 runtime dependency lock has no reported advisories. These are dependency checks, not a full application or container vulnerability audit. Re-run audits before each release.

Authentication, authorization policies, Kafka delivery, sports integrations and clinical workflows need deployment-specific validation. The local example uses synthetic data and disables authentication. See [security policy](SECURITY.md).

## Compatibility

Express 4 is an explicit runtime dependency because the BlueHalo core uses Express 4 body parsing. Installing Express 5 indirectly can cause duplicate stream parsing and failed FHIR writes.

The SALUDATA schema identifiers and default topic names are integration contracts. The `https://saludata.favit.es/alert-engine` URI is a FHIR coding-system identifier, not a network destination.

## Releases

Run the checks above and the GitHub Actions workflow before tagging a release, review dependency and container audit results, validate the integrations being offered, and update [CHANGELOG.md](CHANGELOG.md). Maintain protected branches, private vulnerability reporting and upstream copyright/license notices. The canonical repository is [FAV-Innovation-and-Technologies/SALUDATA](https://github.com/FAV-Innovation-and-Technologies/SALUDATA).
