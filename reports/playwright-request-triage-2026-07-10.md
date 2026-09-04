# Playwright Request Triage - 2026-07-10

Source log:
`C:\Users\abdal\.codex\attachments\c645f59e-394a-4127-8d3e-2d414fcd1a02\pasted-text.txt`

## Run Result

- Result: `81 passed`, `13 failed`
- Visible browser console non-2xx lines:
  - `400`: 92
  - `403`: 24
  - `404`: 4
- Explicit API failures in failed test stacks: 22
- Slow login budget warnings: 14

Important: browser console `Failed to load resource` lines are not automatically product failures. Many are expected negative-path probes, permission-boundary assertions, or fallback lookups. The 13 failed tests are the current reliability/product blockers.

## Categories

### Expected Negative-Path Requests

These may log `400`/`403` while the test still passes because the rejection is the expected behavior.

- COD over limit is rejected.
- COD out-of-city/geographic restriction is rejected.
- Unapproved enabler actions are rejected.
- Buyer/seller/enabler attempts to access privileged admin or seller-only endpoints are rejected.
- Recovery tests intentionally force failed checkout or invalid states and assert the UI handles them.
- KYC/compliance tests intentionally submit insufficient or rejected evidence.

These should be labelled as `expected-negative` in Playwright logs, not as generic browser failures.

### Fallback/Probe Requests

These are noisy but often harmless when followed by a successful fallback.

- Checkout/order helpers probe direct lookup paths before falling back to order list.
- Some dashboard pages probe optional endpoints and continue if unavailable.
- Seed helpers retry or fall back after API calls fail.

These should be labelled as `fallback-probe` or `optional-probe`.

### Real Product/Test Blockers

These are the failures that still require action.

1. Order lifecycle transitions still fail in the headed run:
   - `Order must be processing to be shipped`
   - `Order must be shipped to be completed`
   - Affected areas: courier delivery, COD verification, dispute recovery, duplicate action protection.
   - Note: backend fixes for processing persistence were added after prior analysis; this run may not include a backend restart with those changes.

2. COD active-order state blocks later journeys:
   - `New buyers can only have 1 active COD order at a time`
   - This is likely downstream of orders not reaching terminal states, but should be rechecked after lifecycle fixes are active.

3. Support close validation rejects a `resolution` field:
   - `Unrecognized key(s) in object: 'resolution'`
   - Backend should accept this compatibility field on close or frontend/tests should send only the supported close shape.

4. Support agent assignment hits capacity:
   - `Agent has reached maximum ticket capacity`
   - E2E support agents need deterministic reset/auto-provisioning/capacity handling.

5. Seller page test id is missing:
   - `[data-testid="page-seller-dashboard"]`
   - `[data-testid="page-storefront"]`
   - Frontend-owned unless route data/API is failing before render.

6. Order status shape mismatch:
   - Expected `SHIPPED`, received `IN_TRANSIT`
   - Backend/frontend/test contract needs one canonical lifecycle vocabulary or aliasing in test helpers.

7. Auth performance warnings:
   - Login frequently exceeds the 600ms budget.
   - These are not test failures, but should remain tracked as performance debt.

## Recommended Logging Change

Playwright request logging should classify non-2xx responses before printing them:

- `expected-negative`: request intentionally expects `400`, `403`, `404`, or `409`.
- `fallback-probe`: helper tries a lookup/optional endpoint before falling back.
- `unexpected-failure`: non-2xx was not expected and should fail or warn loudly.
- `perf-warning`: successful request exceeded budget.

The current headed output collapses all browser-side non-2xx responses into the same message, which makes healthy negative-path tests look broken.

## Immediate Ownership

- Backend: order lifecycle, COD terminal cleanup, support close compatibility, support agent capacity.
- Frontend: seller/storefront page test ids, plus route render if APIs are successful.
- Test infrastructure: classify request logging so expected negative calls stop looking like product regressions.

