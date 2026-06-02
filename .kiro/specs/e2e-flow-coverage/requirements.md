# Requirements Document

## Introduction

The Maysar Express backend currently has a minimal live E2E smoke test suite (`tests/e2e/flow-smoke.e2e.test.ts`) that covers only four thin paths: login/verify/logout, seller storefront read, buyer wallet balance, and buyer order search. Eight flow documentation files describe the full set of journeys the platform is designed to support, but no E2E tests validate those journeys against a running backend.

This feature expands the E2E test suite to give high-confidence coverage of all eight flow doc files. Tests call real HTTP endpoints against a locally-running backend, use seeded test users, and are opt-in behind the `RUN_LIVE_E2E=true` environment variable. The goal is a suite that can signal regressions in critical user flows before code reaches production.

---

## Glossary

- **E2E_Test_Suite**: The collection of test files under `tests/e2e/` that run against a live backend instance using real HTTP calls.
- **Live_Backend**: The Maysar Express monorepo running locally or in a CI environment with all services initialised and the shared PostgreSQL database seeded.
- **Seeded_User**: A test user pre-inserted by `scripts/seed-dev-users.ts` with a deterministic ID, email, and initial wallet balance. Currently: buyer, seller, courier, enabler, supplier, admin.
- **Safety_Gate**: The `tests/global-setup.js` credential validator that aborts the test run if any production-like environment variable is detected.
- **RUN_LIVE_E2E**: The environment variable flag that must be set to `true`, `1`, or `yes` for live E2E tests to execute; otherwise all suites are skipped via `describe.skip`.
- **liveTestSuite**: The helper exported from `tests/e2e/helpers/live-api.ts` that wraps `describe` or `describe.skip` depending on `RUN_LIVE_E2E`.
- **requestJson**: The `fetch`-based helper that prepends `E2E_BASE_URL` / `PLATFORM_BASE_URL` / `BASE_URL` (defaulting to `http://localhost:3000`) to a path and returns `{ status, ok, body, text }`.
- **COD**: Cash on Delivery — the dominant payment method in Tanzania; buyer pays the courier at the door.
- **COD_Trust_Tier**: The buyer's tier derived from behavioral score and lifetime COD value. Tiers: `NEW_BUYER`, `TRUSTED_BEGINNER`, `TRUSTED_BUYER`, `GOLD_BUYER`, `PLATINUM_BUYER`.
- **Commitment_Fee**: A wallet hold placed before an order is saved when COD eligibility conditions require it.
- **Saga**: The distributed workflow pattern used by `order-service` to orchestrate multi-step order placement; each step has a compensating action.
- **Outbox**: The transactional outbox table that ensures domain events are durably published to the EventBus even under failure.
- **EventBus**: The in-process event bus used for all inter-service communication within the monolith.
- **Buy_Box**: The featured seller slot on a product page, determined by a composite score computed by `catalog-service`.
- **P0_Test**: A test covering a critical path that blocks a deploy if it fails. Must pass on every run.
- **P1_Test**: A test covering an important but non-blocking path. Runs daily in CI.
- **P2_Test**: A test covering a secondary path. Runs weekly in CI.

---

## Requirements

### Requirement 1: E2E Test Execution Model

**User Story:** As a developer, I want E2E tests to execute only when explicitly opted in, so that the regular unit/integration test runs remain fast and do not require a running backend.

#### Acceptance Criteria

1. THE E2E_Test_Suite SHALL execute all live test cases only when the environment variable `RUN_LIVE_E2E` is set to `true`, `1`, or `yes` (case-insensitive, whitespace-trimmed).
2. WHEN `RUN_LIVE_E2E` is absent or set to any other value, THE E2E_Test_Suite SHALL skip all live test cases using `describe.skip` without emitting a test failure.
3. THE E2E_Test_Suite SHALL resolve the base URL from environment variables in this priority order: `E2E_BASE_URL`, then `PLATFORM_BASE_URL`, then `BASE_URL`, defaulting to `http://localhost:3000` when none are set.
4. THE E2E_Test_Suite SHALL strip trailing slashes from the resolved base URL before constructing request paths.
5. WHEN the Live_Backend health check at `GET /health` does not return HTTP 200, THE E2E_Test_Suite SHALL fail the `beforeAll` hook and skip all tests in the affected suite.
6. THE E2E_Test_Suite SHALL run all tests sequentially using `--runInBand` to avoid shared-state conflicts on the single test database.
7. THE E2E_Test_Suite SHALL be selected via `--selectProjects=e2e` in Jest configuration, keeping E2E tests isolated from unit and integration projects.

---

### Requirement 2: Test Safety and Environment Isolation

**User Story:** As a platform operator, I want the E2E test suite to be impossible to run against production credentials, so that test runs can never affect live user data or payment systems.

#### Acceptance Criteria

1. WHEN Jest's global setup runs, THE Safety_Gate SHALL validate all credential and URL environment variables against the rules defined in `tests/global-setup.js` before any test executes.
2. IF any credential or URL environment variable resolves to a production-like value, THEN THE Safety_Gate SHALL throw an error listing all offending variables and abort the entire test run before any HTTP request is made.
3. THE E2E_Test_Suite SHALL load test-environment variables from `.env.test` if that file exists, without overriding variables already set in the process environment.
4. THE E2E_Test_Suite SHALL document in a `README` or inline comments which environment variables must be set and what safe values look like, referencing `.env.test.example`.
5. WHILE a test suite is executing, THE E2E_Test_Suite SHALL not store, log, or print the values of JWT secrets, payment keys, or encryption keys; it SHALL reference them by variable name only.

---

### Requirement 3: Seeded Test User Management

**User Story:** As a test author, I want deterministic test users with known IDs and wallet balances, so that test assertions can be exact without requiring dynamic data setup.

#### Acceptance Criteria

1. THE E2E_Test_Suite SHALL use the six seeded users defined in `docs/test-users.md` as the primary actors: buyer (`usr_01KRFXQZC36NK3CDEWJJS21RP8`), seller (`usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z`), courier (`usr_01KRFZ1E7W4JDR9N9PMGYDD77S`), enabler (`usr_01KRFZ1E8HMAE7MMH175PJ9337`), supplier (`usr_01KRFZ1E73P67T886TR2QDY0VT`), and admin (`usr_01ADMIN0000000000000000001`).
2. WHEN the buyer's wallet balance may have been reduced by previous test runs, THE E2E_Test_Suite SHALL top up the buyer wallet to a known minimum (100,000 TZS) using `POST /api/wallet/wallets/:userId/credit` with an admin token before executing wallet-dependent test cases.
3. THE Wallet_Top_Up operation in requirement 3.2 SHALL be idempotent: if the current balance already meets the minimum, no credit request SHALL be made.
4. WHEN a test creates a new order, cancellation, or payout during execution, THE E2E_Test_Suite SHALL not assume the order persists across test suite runs; each suite SHALL verify state independently.
5. THE E2E_Test_Suite SHALL not create new user accounts during test execution; all authentication SHALL use the pre-seeded credentials.

---

### Requirement 4: Auth and Access Flow Coverage (Flow Doc 01)

**User Story:** As a developer, I want E2E tests for all authentication flows, so that login, session verification, logout, and token invalidation are continuously validated against the running platform.

#### Acceptance Criteria

1. WHEN valid credentials are submitted to `POST /api/auth/login`, THE Auth_Service SHALL return HTTP 200 with a non-empty `accessToken` string in the response body.
2. WHEN a valid `accessToken` is sent as a Bearer token to `GET /api/auth/verify`, THE Auth_Service SHALL return HTTP 200 with `{ success: true }` in the response body.
3. WHEN a valid `accessToken` is sent to `POST /api/auth/logout`, THE Auth_Service SHALL return HTTP 200 and invalidate the token.
4. WHEN the invalidated `accessToken` from requirement 4.3 is sent to `GET /api/auth/verify` after logout, THE Auth_Service SHALL return HTTP 401.
5. WHEN credentials with an incorrect password are submitted to `POST /api/auth/login`, THE Auth_Service SHALL return HTTP 401 and SHALL NOT include an `accessToken` in the response body.
6. WHEN credentials with a non-existent email are submitted to `POST /api/auth/login`, THE Auth_Service SHALL return a 4xx status code and SHALL NOT include an `accessToken` in the response body.
7. FOR ALL seeded user roles (buyer, seller, courier, enabler, supplier, admin), WHEN valid credentials are submitted to `POST /api/auth/login`, THE Auth_Service SHALL return HTTP 200 with a valid `accessToken`.

---

### Requirement 5: Customer Journey Flow Coverage (Flow Doc 02)

**User Story:** As a developer, I want E2E tests for the core buyer journey — browse, checkout, wallet payment, order tracking, and cancellation — so that the critical purchase path is continuously validated.

#### Acceptance Criteria

1. WHEN an unauthenticated request is sent to `GET /api/catalog/products`, THE Catalog_Service SHALL return HTTP 200 with a response body containing a non-empty array of products.
2. WHEN an authenticated buyer requests `GET /api/catalog/api/v1/sellers/:sellerId/storefront` using the seeded seller's ID, THE Catalog_Service SHALL return HTTP 200 with a response body containing `{ success: true, data: { id: sellerId, shareUrl: <string>, shortUrl: <string> } }`.
3. WHEN an authenticated buyer posts a valid order to `POST /api/order/orders` with `paymentMethod: "WALLET"` and sufficient wallet balance, THE Order_Service SHALL return HTTP 201 with an `orderId` in the response body.
4. WHEN the order from requirement 5.3 is created, THE Order_Service SHALL return the same order data when `GET /api/order/orders/:orderId` is called with the buyer's token.
5. WHEN a buyer requests `GET /api/wallet/wallets/:userId/balance` with a valid token, THE Wallet_Service SHALL return HTTP 200 with `{ success: true }` and a numeric balance value.
6. WHEN the buyer's wallet balance is sufficient and an order is placed with `paymentMethod: "WALLET"`, THE Wallet_Service SHALL reflect a reduced balance when `GET /api/wallet/wallets/:userId/balance` is called after order creation.
7. WHEN a wallet payment order in a cancellable state receives `POST /api/order/orders/:orderId/cancel`, THE Order_Service SHALL return HTTP 200 and THE Wallet_Service SHALL reflect a restored balance equal to the pre-cancel balance.
8. WHEN `POST /api/checkout/cart` is called twice with the same buyer and identical item payload within a single test, THE Checkout_Service SHALL not create duplicate orders (checkout idempotency).
9. WHEN `POST /api/order/orders` is submitted with a wallet payment but insufficient wallet balance, THE Order_Service SHALL return a 4xx status code and SHALL NOT create an order.

---

### Requirement 6: COD Eligibility and Trust System Coverage

**User Story:** As a developer, I want E2E tests for the COD eligibility enforcement, so that trust tier limits, geographic constraints, and commitment fees are validated against the running engine.

#### Acceptance Criteria

1. WHEN the seeded buyer (COD trust score 0, tier NEW_BUYER) attempts to place a COD order with a total value exceeding TZS 30,000, THE Order_Service SHALL return a 4xx status code indicating COD ineligibility due to exposure limit.
2. WHEN the seeded buyer attempts to place a COD order within the TZS 30,000 exposure limit and within 24 km of the seller's ward centroid, THE Order_Service SHALL return HTTP 201 with an `orderId`.
3. WHEN a COD order is successfully placed, THE Wallet_Service SHALL reflect a frozen amount (`frozenAmount` or commitment) on the buyer's wallet.
4. WHEN a COD order from requirement 6.2 is cancelled before dispatch, THE Wallet_Service SHALL release the frozen commitment amount and restore the buyer's available balance.
5. WHEN the seeded buyer already has one active COD order (NEW_BUYER concurrent limit = 1), THE Order_Service SHALL reject a second simultaneous COD order with a 4xx status code indicating `CONCURRENT_LIMIT_EXCEEDED`.
6. WHEN a COD order is submitted with a delivery address whose ward centroid is more than 24 km from the seller's ward centroid and the buyer is at NEW_BUYER tier, THE Order_Service SHALL return a 4xx status code indicating `AREA_RESTRICTION`.

---

### Requirement 7: Seller Journey Flow Coverage (Flow Doc 03)

**User Story:** As a developer, I want E2E tests for seller-facing read paths and order fulfillment, so that storefront access, order visibility, and seller-authenticated endpoints are continuously validated.

#### Acceptance Criteria

1. WHEN an authenticated seller requests `GET /api/catalog/api/v1/sellers/:sellerId/storefront` using their own ID, THE Catalog_Service SHALL return HTTP 200 with a valid storefront object.
2. WHEN an authenticated seller requests orders using `GET /api/order/orders?sellerId=:sellerId`, THE Order_Service SHALL return HTTP 200 with `{ orders: Array, total: Number }`.
3. WHEN a seller who has an active order marks it ready for pickup via the order status endpoint, THE Order_Service SHALL return HTTP 200 and the order status SHALL reflect the new state.
4. WHEN a seller requests `GET /api/catalog/products` scoped to their seller ID, THE Catalog_Service SHALL return only products belonging to that seller.

---

### Requirement 8: Delivery and Logistics Flow Coverage (Flow Doc 05)

**User Story:** As a developer, I want E2E tests for delivery lifecycle endpoints, so that courier delivery status transitions and logistics reads are continuously validated.

#### Acceptance Criteria

1. WHEN an authenticated courier requests `GET /api/logistics/deliveries/:deliveryId` for a delivery assigned to them, THE Logistics_Service SHALL return HTTP 200 with a delivery object containing a `status` field.
2. WHEN a courier updates a delivery status via `PUT /api/logistics/deliveries/:deliveryId/status` with a valid next-state transition, THE Logistics_Service SHALL return HTTP 200 and the delivery `status` SHALL reflect the new state.
3. IF a courier attempts a status update that violates the monotonic delivery state machine (e.g., DELIVERED → ACCEPTED), THEN THE Logistics_Service SHALL return a 4xx status code without modifying the delivery record.
4. WHEN a COD delivery reaches the OTP verification step and a valid OTP is submitted, THE Logistics_Service SHALL return HTTP 200 and THE Wallet_Service SHALL reflect the COD commitment captured or released.
5. IF an invalid or expired OTP is submitted for COD verification, THEN THE Logistics_Service SHALL return HTTP 401 and the delivery SHALL remain in its current pending state.

---

### Requirement 9: Wallet Ledger Integrity (Flow Doc 08)

**User Story:** As a platform operator, I want E2E tests for wallet credit, debit, and balance consistency, so that money operations produce correct ledger entries against the running platform.

#### Acceptance Criteria

1. WHEN an admin token is used to credit the buyer wallet via `POST /api/wallet/wallets/:userId/credit` with a positive integer amount, THE Wallet_Service SHALL return HTTP 200 and the balance from `GET /api/wallet/wallets/:userId/balance` SHALL increase by exactly that amount.
2. WHEN an admin token is used to debit the buyer wallet via `POST /api/wallet/wallets/:userId/debit` with an amount less than or equal to the current balance, THE Wallet_Service SHALL return HTTP 200 and the balance SHALL decrease by exactly that amount.
3. IF a debit request is submitted for an amount greater than the current available balance, THEN THE Wallet_Service SHALL return a 4xx status code and the balance SHALL remain unchanged.
4. WHEN a credit immediately followed by a debit of the same amount is applied to the buyer wallet, THE Wallet_Service SHALL return the same balance as before both operations (round-trip balance property).
5. WHEN the buyer wallet balance is read twice in immediate succession without any intervening write, THE Wallet_Service SHALL return the same balance value both times (read consistency property).

---

### Requirement 10: Saga Compensation Coverage (Flow Docs 02, 08)

**User Story:** As a developer, I want E2E tests that verify saga compensation paths, so that failed order placements leave no orphaned reservations, charges, or inconsistent state in the running system.

#### Acceptance Criteria

1. WHEN a wallet payment order is placed successfully and then immediately cancelled, THE Wallet_Service SHALL credit back the full order amount to the buyer wallet (no money stranded after cancellation).
2. WHEN a COD order placement is rejected due to ineligibility, THE Wallet_Service SHALL show no frozen or debited amount on the buyer's wallet (no partial commitment on failed eligibility check).
3. WHEN a wallet payment order placement is attempted with an amount that exactly equals the wallet balance, the balance after creation SHALL be zero, and after cancellation SHALL be restored to the pre-order balance (boundary balance round-trip).

---

### Requirement 11: Coverage Priority Classification

**User Story:** As a CI/CD engineer, I want test cases classified by priority, so that P0 tests block deploys, P1 tests run daily, and P2 tests run weekly without slowing the critical deployment gate.

#### Acceptance Criteria

1. THE E2E_Test_Suite SHALL classify the following test cases as P0 (must pass on every deploy): Auth login/verify/logout (Req 4.1–4.4), wallet balance read (Req 5.5), catalog products list (Req 5.1), seller storefront read (Req 5.2), wallet payment order create/cancel round-trip (Req 5.3, 5.7), and COD eligibility rejection at exposure limit (Req 6.1).
2. THE E2E_Test_Suite SHALL classify the following test cases as P1 (daily CI run): all-role login (Req 4.7), order state read (Req 5.4), wallet credit/debit round-trip (Req 9.4), COD order place within limits (Req 6.2–6.4), delivery status read (Req 8.1), and saga compensation after cancellation (Req 10.1).
3. THE E2E_Test_Suite SHALL classify the following test cases as P2 (weekly CI run): concurrent COD limit enforcement (Req 6.5), geographic COD restriction (Req 6.6), delivery state machine violation (Req 8.3), COD OTP verification (Req 8.4–8.5), and seller order list (Req 7.2).
4. THE E2E_Test_Suite SHALL expose the priority classification as a Jest test name prefix (e.g., `[P0]`, `[P1]`, `[P2]`) so that `--testNamePattern` can be used to run a specific tier.

---

### Requirement 12: Flow Doc Coverage Mapping

**User Story:** As a QA engineer, I want each E2E test to be traceable to a flow doc use case ID, so that gaps in coverage are visible and can be tracked over time.

#### Acceptance Criteria

1. EACH test case in the E2E_Test_Suite SHALL include a comment or test name fragment referencing the flow doc use case ID it covers (e.g., `AUTH-01`, `BUY-02`, `COU-03`).
2. THE E2E_Test_Suite SHALL include coverage for at least one test case mapped to each of the following use case IDs: `AUTH-01`, `AUTH-02`, `BUY-01`, `BUY-02`, `BUY-03`, `BUY-05`, `SEL-06`, `SEL-07`, `COU-02`, `COU-03`, `OPS-01`, `OPS-02`, `OPS-05`.
3. THE E2E_Test_Suite SHALL not include test cases mapped to `SUP-01`, `SUP-03`, `ENA-02`, `ENA-03`, `ADM-02`, `ADM-03`, or `ADM-07` in the initial implementation, as these flows require external service integrations (S3, manual review queues) not reliably available in local test environments.
4. WHEN the E2E test file for a flow doc does not yet exist, THE E2E_Test_Suite SHALL include a placeholder `describe.skip` block referencing the uncovered use case IDs and the reason coverage is deferred.

---

### Requirement 13: Test Infrastructure Correctness Properties

**User Story:** As a test author, I want the shared E2E test helpers to have verifiable correctness properties, so that helper bugs do not silently invalidate assertions.

#### Acceptance Criteria

1. THE `requestJson` helper SHALL parse the response body as JSON when the response text is non-empty and valid JSON, returning the parsed object in the `body` field.
2. THE `requestJson` helper SHALL return the raw text in the `body` field when the response text is non-empty but not valid JSON.
3. THE `requestJson` helper SHALL return an empty object `{}` in the `body` field when the response body is empty.
4. THE `extractAccessToken` helper SHALL return the `accessToken` string when the input is a JSON object containing a non-empty string `accessToken` field.
5. IF the input to `extractAccessToken` is not an object, is null, or does not contain a string `accessToken` field, THEN THE `extractAccessToken` helper SHALL throw an `Error` with a descriptive message.
6. THE `resolveLiveBaseUrl` function SHALL return a URL string with no trailing slash, regardless of whether the source environment variable includes trailing slashes.
7. FOR ALL valid JSON login response bodies, parsing with `extractAccessToken` after `requestJson` SHALL produce the same token that `GET /api/auth/verify` accepts as a Bearer credential (round-trip auth property).
