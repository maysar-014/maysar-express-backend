# End-to-End (E2E) Tests

This folder contains live API smoke tests that exercise the running platform
against the flow docs in `docs/Flow Docs/`.

The suite is intentionally opt-in so it only runs when the backend is up and
seeded with the shared test users from `docs/test-users.md`.

Run the live suite:

```bash
npm run test:e2e:live
```

Useful environment overrides:

- `E2E_BASE_URL` - explicit platform base URL, defaults to `http://localhost:3000`
- `BASE_URL` / `PLATFORM_BASE_URL` - fallback base URL values used by the helper
- `RUN_LIVE_E2E=true` - enables the live API smoke suite when invoking Jest directly

The current suite covers:

- auth and access
- seller storefront discovery
- buyer wallet balance
- buyer order search
