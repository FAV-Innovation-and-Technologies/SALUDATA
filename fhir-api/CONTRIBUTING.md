# Contributing

Open an issue describing the problem and submit a focused pull request. Use synthetic fixtures only; never include patient data, secrets, private endpoints or logs containing identifiers. Report vulnerabilities through the private vulnerability reporting workflow in [SECURITY.md](SECURITY.md), not through a public issue.

Run `npm ci` and `npm run check`. Run `npm run test:integration` when a Docker-supported FHIR change needs end-to-end coverage. Describe any required external services and how the change was verified. The repository retains warning debt in inherited code; do not introduce new lint errors.

Contributions are submitted under the project's MIT license. Preserve existing copyright notices and identify third-party code and its license. Submit only material you are entitled to contribute.
