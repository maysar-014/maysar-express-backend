# Implementation Plan: e2e-flow-coverage

## Overview

Expand the E2E test suite from the existing 4-path smoke file to full flow-doc coverage across all eight
flow documentation areas. Implementation proceeds in dependency order: shared fixtures and helpers first,
then the property-based helper tests, then each live test file in ascending priority (P0 → P1 → P2),
finishing with a README update and a final wiring checkpoint.

All code is TypeScript. No changes to `jest.config.js` are required.

## Tasks

- [x] 1. Create seeded-users fixture
  - Create `tests/e2e/fixtures/seeded-users.ts` with the `SeededRole` type, `SeededUser` interface, the
    `SEEDED_USERS` registry for all six seeded users (buyer, seller, courier, enabler, supplier, admin),
    and the `WALLET_TOP_UP_MINIMUM = 100_000` constant
  - Values must exactly match `docs/test-users.md` (IDs, emails, password `Maysar@2024!`)
  - _Requirements: 3.1_

- [x] 2. Extend live-api helpers
  - Add the following exports to `tests/e2e/helpers/live-api.ts` **without modifying existing exports**:
    `loginAs(user: SeededUser): Promise<string>`, `getAdminToken(): Promise<string>` (module-scope cache),
    `ensureWalletMinimum(userId, minimumTzs, adminToken): Promise<void>` (idempotent — no credit request
    if balance already meets minimum), `authHeader(token): { authorization: string }`,
    `assertOk(response: JsonResponse, context?: string): void`
  - Import `SeededUser` from `../fixtures/seeded-users`
  - `getAdminToken` caches the token in a module-level variable; re-authenticates if falsy
  - `ensureWalletMinimum` calls `GET /api/wallet/wallets/:userId/balance` first; only calls
    `POST /api/wallet/wallets/:userId/credit` if current balance is below `minimumTzs`
  - `assertOk` throws with `[${context}] HTTP ${status}: ${JSON.stringify(body)}` when `!ok`
  - _Requirements: 3.2, 3.3, 1.3, 1.4_

- [-] 3. Implement property-based tests for pure helper functions
  - [ ] 3.1 Create `tests/e2e/helpers.e2e.test.ts` with a standard `describe` block (no `liveTestSuite` —
    runs offline without a backend)
    - Import `fast-check` as `fc`
    - Import `resolveLiveBaseUrl`, `requestJson` (for the JSON-parsing logic unit), `extractAccessToken`
      from `./helpers/live-api`
    - Configure each `fc.assert` with `{ numRuns: 100 }`
    - _Requirements: 13.1, 13.2, 13.4, 13.5, 13.6_

  - [ ]* 3.2 Write property test — Property 1: trailing-slash stripping is universal
    - `// Feature: e2e-flow-coverage, Property 1: trailing-slash stripping is universal`
    - Use `fc.string()` to generate arbitrary base URL strings; set `process.env.E2E_BASE_URL` to
      each generated value (with appended trailing slashes) and assert `resolveLiveBaseUrl()` never
      ends with `/`
    - **Property 1: trailing-slash stripping is universal**
    - **Validates: Requirements 1.4, 13.6**

  - [ ]* 3.3 Write property test — Property 2: JSON body is parsed for valid JSON input
    - `// Feature: e2e-flow-coverage, Property 2: JSON body is parsed when response text is valid JSON`
    - Use `fc.jsonValue()` to generate any JSON-serialisable value; mock the fetch response text to
      `JSON.stringify(v)` and assert the returned `body` deeply equals `v`
    - **Property 2: JSON body is parsed when the response text is valid JSON**
    - **Validates: Requirements 13.1**

  - [ ]* 3.4 Write property test — Property 3: non-JSON text returned verbatim
    - `// Feature: e2e-flow-coverage, Property 3: non-JSON text is returned verbatim in body field`
    - Use `fc.string()` filtered to strings that are not valid JSON; assert `body` strictly equals the
      raw string
    - **Property 3: non-JSON text is returned verbatim in the body field**
    - **Validates: Requirements 13.2**

  - [ ]* 3.5 Write property test — Property 4: extractAccessToken succeeds for any non-empty token
    - `// Feature: e2e-flow-coverage, Property 4: extractAccessToken succeeds for any non-empty accessToken`
    - Use `fc.string({ minLength: 1 })` to generate tokens; assert `extractAccessToken({ accessToken: t })`
      returns exactly `t` without throwing
    - **Property 4: extractAccessToken succeeds for any non-empty accessToken string**
    - **Validates: Requirements 13.4**

  - [ ]* 3.6 Write property test — Property 5: extractAccessToken throws for all invalid inputs
    - `// Feature: e2e-flow-coverage, Property 5: extractAccessToken throws for all invalid inputs`
    - Use `fc.oneof(fc.constant(null), fc.integer(), fc.boolean(), fc.array(fc.string()),
      fc.record({ accessToken: fc.constant('') }), fc.record({ accessToken: fc.integer() }))`
      and assert each throws an `Error`
    - **Property 5: extractAccessToken throws for all invalid inputs**
    - **Validates: Requirements 13.5**

- [x] 4. Checkpoint — helpers layer complete
  - Ensure all tests pass, ask the user if questions arise.

- [-] 5. Implement auth.e2e.test.ts
  - Create `tests/e2e/auth.e2e.test.ts` using `liveTestSuite`
  - `beforeAll`: health check `GET /health` (assert 200); obtain `adminToken = await getAdminToken()`
  - [ ] 5.1 Write `[P0] [AUTH-01]` — login with valid buyer credentials returns 200 + accessToken
    - POST `/api/auth/login` with buyer credentials; assert status 200 and `extractAccessToken` succeeds
    - _Requirements: 4.1_
  - [ ] 5.2 Write `[P0] [AUTH-02]` — verify with valid token returns `{ success: true }`
    - Use token from 5.1; GET `/api/auth/verify` with Bearer header; assert 200 + `success: true`
    - _Requirements: 4.2_
  - [ ] 5.3 Write `[P0] [AUTH-02]` — logout invalidates token (logout then verify returns 401)
    - POST `/api/auth/logout`; then GET `/api/auth/verify` with same token; assert 401
    - _Requirements: 4.3, 4.4_
  - [ ] 5.4 Write `[P0] [AUTH-02]` — wrong password returns 401 without accessToken
    - POST `/api/auth/login` with wrong password; assert 401; assert no `accessToken` in body
    - _Requirements: 4.5_
  - [ ] 5.5 Write `[P0] [AUTH-02]` — non-existent email returns 4xx without accessToken
    - POST `/api/auth/login` with unknown email; assert 4xx; assert no `accessToken` in body
    - _Requirements: 4.6_
  - [ ] 5.6 Write `[P1] [AUTH-01]` — all seeded roles can log in successfully
    - Loop over all six `SEEDED_USERS` entries; assert each POST `/api/auth/login` returns 200 +
      valid accessToken
    - _Requirements: 4.7_

- [-] 6. Implement customer.e2e.test.ts
  - Create `tests/e2e/customer.e2e.test.ts` using `liveTestSuite`
  - `beforeAll`: health check; obtain tokens (`adminToken`, `buyerToken = await loginAs(SEEDED_USERS.buyer)`);
    call `ensureWalletMinimum(SEEDED_USERS.buyer.id, WALLET_TOP_UP_MINIMUM, adminToken)`;
    fetch `GET /api/catalog/products?sellerId=<seller.id>&limit=1` and cache as `seededProduct`
    (throw descriptive error if list is empty)
  - [ ] 6.1 Write `[P0] [BUY-01]` — catalog products list returns non-empty array
    - GET `/api/catalog/products`; assert 200; assert `data` or top-level body is a non-empty array
    - _Requirements: 5.1_
  - [ ] 6.2 Write `[P0] [BUY-02]` — seller storefront read returns expected shape
    - GET `/api/catalog/api/v1/sellers/:sellerId/storefront` with buyer token; assert 200 +
      `{ success: true, data: { id: sellerId, shareUrl: string, shortUrl: string } }`
    - _Requirements: 5.2_
  - [ ] 6.3 Write `[P0] [BUY-03]` — wallet payment order create + cancel round-trip restores balance
    - Read pre-order balance; POST order with `paymentMethod: "WALLET"` (use `seededProduct`); assert 201 +
      orderId; assert balance decreased; cancel via POST `/api/order/orders/:orderId/cancel`; assert balance
      restored to pre-order value — all inside `try/finally`
    - _Requirements: 5.3, 5.6, 5.7, 10.1_
  - [ ] 6.4 Write `[P1] [BUY-03]` — order state read after creation matches orderId
    - POST order; GET `/api/order/orders/:orderId`; assert 200 + `orderId` matches; cancel in `finally`
    - _Requirements: 5.4_
  - [ ] 6.5 Write `[P1] [BUY-05]` — saga: cancel after wallet order credits amount back
    - POST order; record balance; cancel; assert balance equals pre-order balance (explicit saga
      compensation check)
    - _Requirements: 5.7, 10.1_

- [ ] 7. Implement cod-trust.e2e.test.ts
  - Create `tests/e2e/cod-trust.e2e.test.ts` using `liveTestSuite`
  - `beforeAll`: health check; obtain tokens; call `ensureWalletMinimum`
  - Include `describe.skip` placeholder for deferred use cases (`ADM-02`, `ADM-03`) with comment
    explaining deferral
  - [ ] 7.1 Write `[P0] [OPS-01]` — COD rejection when exposure limit exceeded (> 30,000 TZS)
    - POST COD order with `totalValue = 35_000`; assert 4xx indicating COD ineligibility
    - _Requirements: 6.1_
  - [ ] 7.2 Write `[P1] [OPS-05]` — COD order placed within limits creates order + freezes wallet
    - Read wallet balance; POST COD order with `totalValue = 15_000` (within limit, valid ward);
      assert 201 + orderId; assert `frozenAmount` or balance reflects commitment; cancel in `finally`
    - _Requirements: 6.2, 6.3_
  - [ ] 7.3 Write `[P1] [OPS-05]` — cancelled COD order releases frozen commitment
    - POST COD order; record frozen amount; cancel; assert frozen amount released
    - _Requirements: 6.4_
  - [ ] 7.4 Write `[P2] [OPS-05]` — concurrent COD limit blocks second simultaneous COD order
    - POST first COD order; immediately POST second COD order; assert second returns 4xx
      (`CONCURRENT_LIMIT_EXCEEDED`); cancel first in `finally`
    - _Requirements: 6.5_
  - [ ] 7.5 Write `[P2] [OPS-05]` — geographic COD restriction rejects out-of-radius delivery
    - POST COD order with delivery address whose ward centroid is > 24 km from seller; assert 4xx
      (`AREA_RESTRICTION`)
    - _Requirements: 6.6_

- [-] 8. Implement wallet.e2e.test.ts
  - Create `tests/e2e/wallet.e2e.test.ts` using `liveTestSuite`
  - `beforeAll`: health check; obtain `adminToken`; call `ensureWalletMinimum`
  - [ ] 8.1 Write `[P1] [OPS-02]` — wallet credit increases balance by exact amount
    - Read balance; POST `/api/wallet/wallets/:userId/credit` with admin token + amount 5_000; assert 200;
      read balance again; assert increase equals 5_000
    - _Requirements: 9.1_
  - [ ] 8.2 Write `[P1] [OPS-02]` — wallet debit decreases balance by exact amount
    - Read balance; POST `/api/wallet/wallets/:userId/debit` with amount ≤ balance; assert 200;
      read balance again; assert decrease equals amount
    - _Requirements: 9.2_
  - [ ] 8.3 Write `[P1] [OPS-02]` — wallet debit rejects insufficient balance
    - Read balance; attempt debit of `balance + 1`; assert 4xx; assert balance unchanged
    - _Requirements: 9.3_
  - [ ] 8.4 Write `[P1] [OPS-02]` — credit then debit same amount restores balance (round-trip)
    - Record balance; credit X; debit X; assert balance equals original
    - _Requirements: 9.4_

- [-] 9. Implement seller.e2e.test.ts
  - Create `tests/e2e/seller.e2e.test.ts` using `liveTestSuite`
  - `beforeAll`: health check; obtain `sellerToken = await loginAs(SEEDED_USERS.seller)`
  - Include `describe.skip` placeholder for deferred use cases (`SUP-01`, `SUP-03`, `ENA-02`, `ENA-03`)
    with comment explaining deferral (external S3, manual review queues)
  - [ ] 9.1 Write `[P1] [SEL-06]` — authenticated seller reads own storefront
    - GET `/api/catalog/api/v1/sellers/:sellerId/storefront` with seller token; assert 200 + valid
      storefront object with correct `id`
    - _Requirements: 7.1_
  - [ ] 9.2 Write `[P2] [SEL-07]` — seller order list returns expected shape
    - GET `/api/order/orders?sellerId=:sellerId` with seller token; assert 200 +
      `{ orders: Array, total: Number }`
    - _Requirements: 7.2_

- [-] 10. Implement delivery.e2e.test.ts
  - Create `tests/e2e/delivery.e2e.test.ts` using `liveTestSuite`
  - `beforeAll`: health check; obtain `courierToken = await loginAs(SEEDED_USERS.courier)`
  - Include `describe.skip` for deferred COD OTP test if OTP cannot be deterministically generated
    in local environment; reference use case `COU-03` and explain deferral
  - [ ] 10.1 Write `[P1] [COU-02]` — delivery status read returns object with status field
    - GET `/api/logistics/deliveries/:deliveryId` (use a known delivery or create one via order flow);
      assert 200 + response contains `status` field
    - _Requirements: 8.1_
  - [ ] 10.2 Write `[P1] [COU-02]` — valid status transition accepted
    - PUT `/api/logistics/deliveries/:deliveryId/status` with a valid next-state (e.g., ACCEPTED →
      PICKED_UP); assert 200 + new status reflected
    - _Requirements: 8.2_
  - [ ] 10.3 Write `[P2] [COU-03]` — delivery state machine rejects backwards transition
    - Attempt PUT with a backwards transition (e.g., DELIVERED → ACCEPTED); assert 4xx; assert delivery
      record status unchanged
    - _Requirements: 8.3_
  - [ ] 10.4 Write `[P2] [COU-03]` — COD OTP verification success captures commitment
    - Submit valid OTP via logistics endpoint; assert 200 + wallet reflects COD commitment captured
    - _Requirements: 8.4_

- [ ] 11. Checkpoint — all live test files authored
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Update tests/e2e/README.md
  - Replace the "current suite covers" bullet list with a table mapping each new file to its use case
    IDs, flow doc, and priority tier
  - Add a section documenting the new `fixtures/seeded-users.ts` and the extended helper exports
  - Add `--testNamePattern='\[P0\]'` run command for deploy-gate tier
  - Add `--testNamePattern='\[P1\]'` run command for daily tier
  - Add `--testNamePattern='\[P2\]'` run command for weekly tier
  - Add a note that `helpers.e2e.test.ts` runs offline (no backend required) and uses `fast-check`
  - _Requirements: 2.4, 11.4, 12.1_

- [x] 13. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- `liveTestSuite` wraps the entire suite in `describe.skip` when `RUN_LIVE_E2E` is not set — all live
  files are safe to merge without a running backend
- `helpers.e2e.test.ts` uses the `.e2e.test.ts` suffix intentionally so it is picked up by the existing
  `e2e` Jest project without any config change; it does **not** use `liveTestSuite` because it tests
  pure functions only
- Orders and COD commitments created in tests are cancelled in `try/finally` blocks inside the same `it`
  to avoid polluting state for subsequent runs
- `getAdminToken` caches at module scope; individual `it` blocks should not hold a reference across
  test boundaries
- Each test name prefix (`[P0]`, `[P1]`, `[P2]`) enables CI tier selection via
  `--testNamePattern='\[P0\]'`
- Deferred use cases (`SUP-01`, `SUP-03`, `ENA-02`, `ENA-03`, `ADM-02`, `ADM-03`, `ADM-07`) are
  represented as `describe.skip` placeholders with comments per Requirement 12.4
