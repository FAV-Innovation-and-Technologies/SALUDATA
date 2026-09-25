# Authentication

Authentication is disabled in the local example (`FHIR_AUTH_ENABLED=false`). That setting exists only to make local synthetic development possible; it is not appropriate for an exposed API.

When `FHIR_AUTH_ENABLED=true`, the FHIR server loads `src/strategies/supabase-bearer.strategy.js`. It expects a bearer token in the `Authorization` header and validates it with Supabase using `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

```sh
FHIR_AUTH_ENABLED=true \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
npm start
```

The implementation currently assigns a fixed broad FHIR scope after token validation. It does not implement a complete SMART on FHIR authorization model, tenant isolation, patient-consent policy, or role-based resource authorization. Review and adapt the strategy before using it beyond a controlled development environment.

Sports ECG endpoints authenticate their own bearer requests and also require the Supabase variables above. The optional legacy Bundle-upload endpoint is protected by the server strategy when authentication is enabled; it can be disabled entirely with `FHIR_LEGACY_ENDPOINTS_ENABLED=false`.

Keep service configuration and production credentials in your deployment secret manager. Do not add tokens, Supabase keys, real user identifiers, or production URLs to `.env.example`, fixtures, issues, or merge requests.
