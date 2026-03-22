# Contract Tests

Source of truth: `openapi.yaml` in repo root.
Keep legacy `api-contract.yaml` in sync via:

```bash
npm run contract:sync
```

Run locally:

```bash
npm run test:contract
```

This runner now treats contract validation as a full run by default:
- OpenAPI audit before execution
- Schemathesis phases: `examples,coverage,fuzzing`
- Explicit `all` checks, so both request behavior and response conformance are exercised
- Strict auth mode by default, so contract runs use a real JWT and do not silently rely on contract-test bypass headers

Fast or partial variants:

```bash
npm run test:contract:coverage
npm run test:contract:examples
npm run test:contract:strict
npm run test:contract:bypass
```

`test:contract:examples` is intentionally marked as a smoke run. It allows operations with missing examples to be skipped, but it still uses strict auth by default. The runner refuses `SCHEMATHESIS_PHASES=examples` unless `SCHEMATHESIS_ALLOW_EXAMPLES_ONLY=1` is set.
The audit now distinguishes between operations that truly need request examples and operations that simply have no request input at all, so the skip count is easier to interpret.
The normalizer also backfills deterministic JSON request examples for schema-backed operations that are missing them, which keeps examples-mode skips focused on routes that genuinely have no request input.
The normalizer is now structured as an explicit pass pipeline: path cleanup, stale-operation removal, numeric-bound cleanup, security-scheme setup, explicit security classification, success-status normalization, and request-example backfill.

Auth modes:
- `test:contract` and `test:contract:strict` are the safer verification paths. They load `.env`, generate a real JWT from `JWT_SECRET`, and omit the contract-test bypass, gateway identity headers, and service key header so auth failures are not masked.
- In strict mode, the runner now splits service-key maintenance endpoints into a separate Schemathesis pass. Bearer-auth routes keep the normal auth checks, while service-key maintenance routes run with `X-Service-Key` and skip the bearer-specific `ignored_auth` check that would otherwise create false positives.
- `test:contract:bypass` keeps the old contract-test header, gateway-header, and service-key behavior for compatibility when you intentionally need the seeded non-production shortcuts.
- The OpenAPI audit now fails fast when root-level auth modeling would make Schemathesis auth results misleading, such as global contract-test bypass auth or likely-public endpoints inheriting global auth.

Outputs:
- `tests/contract/reports/dredd-junit.xml`
- `tests/contract/reports/schemathesis-junit.xml`
- `tests/contract/reports/openapi-contract-audit.json`
- `tests/contract/reports/openapi-contract-audit.txt`

Requirements:
- `dredd` available on PATH
- `schemathesis` available on PATH (Python package)

Optional:
- Set `CONTRACT_TEST_AUTO_INSTALL=1` to let the runner fetch missing tools automatically.
- Set `DREDD_SKIP_NON_2XX=0` to validate non-2xx responses (default skips them).
- Set `DREDD_SKIP_BODY=0` to enforce response body matching (default relaxes).
- Set `DREDD_SKIP_HEADERS=0` to enforce header matching (default relaxes).
- Set `SCHEMATHESIS_ALLOW_EXAMPLES_ONLY=1` only when you intentionally want an examples-only smoke run.
- Set `SCHEMATHESIS_AUTH_MODE=bypass` only when you intentionally want the seeded non-production shortcut headers.
- Set `SCHEMATHESIS_FORCE_JWT=1` to require runner-generated JWT auth.
- Set `SCHEMATHESIS_INCLUDE_CONTRACT_TEST_HEADER=0` to omit `X-Contract-Test`.
- Set `SCHEMATHESIS_INCLUDE_GATEWAY_HEADERS=0` to omit `X-User-Id` / `X-User-Roles`.
- Set `SCHEMATHESIS_INCLUDE_SERVICE_KEY=0` to omit `X-Service-Key`.

Recommended install:

```bash
npm i -D dredd
pip install schemathesis
```
