# Design Document — e2e-flow-coverage

## Overview

The current E2E suite (`tests/e2e/flow-smoke.e2e.test.ts`) covers four thin paths against a running backend.
Eight flow documentation files describe the full set of journeys the Maysar platform is designed to support, but
none of those journeys beyond the initial smoke paths are continuously validated.

This design expands the E2E test suite to give structured, priority-classified live API coverage across all
eight flow doc areas. Tests remain opt-in behind `RUN_LIVE_E2E=true`, use the six seeded test users with
deterministic IDs and wallets, and produce a signal that can block a deploy (P0), run daily (P1), or run
weekly (P2).

The design also adds helper utilities that keep each test file clean and covers the property-based testing
angle for the pure-function parts of the helper layer.

### Key design goals

- Every new test file follows the same structural conventions as the existing smoke file.
- The helpers layer gets a set of stable, well-typed convenience functions that test files can import instead of
  inlining boilerplate.
- Idempotency is handled at the `beforeAll` level (wallet top-up, state preconditions) so individual tests
  are independent of run order.
- `fast-check` is already in devDependencies; it is used only for the pure-function layer of the helper
  module, not for live HTTP round-trips.
- No new Jest projects are needed; the existing `e2e` project configuration already picks up
  `tests/e2e/**/*.e2e.test.ts`.

---

## Architecture

```
tests/
└── e2e/
    ├── helpers/
    │   └── live-api.ts            ← extended with new helpers (loginAs, ensureWalletMinimum,
    │                                 getAdminToken, authHeader, assertOk)
    ├── fixtures/
    │   └── seeded-users.ts        ← single source of truth for seeded user registry
    ├── flow-smoke.e2e.test.ts     ← existing file, unchanged
    ├── auth.e2e.test.ts           ← Req 4 — Auth & Access (Flow Doc 01)
    ├── customer.e2e.test.ts       ← Req 5, 10 — Customer Journey (Flow Doc 02)
    ├── cod-trust.e2e.test.ts      ← Req 6 — COD Eligibility & Trust (Flow Doc 02 COD)
    ├── seller.e2e.test.ts         ← Req 7 — Seller Journey (Flow Doc 03)
    ├── delivery.e2e.test.ts       ← Req 8 — Delivery & Logistics (Flow Doc 05)
    ├── wallet.e2e.test.ts         ← Req 9 — Wallet Ledger Integrity (Flow Doc 08)
    ├── helpers.unit.test.ts       ← property-based tests for pure helper functions
    └── README.md                  ← updated with new file list and usage instructions
```

The existing `flow-smoke.e2e.test.ts` file is kept intact as a baseline "does the backend respond at all"
check. The new files are additive; they do not modify or replace it.

---

## Components and Interfaces

### `tests/e2e/fixtures/seeded-users.ts`

Exports a single typed registry of all seeded test users so that every test file imports from one location.

```typescript
export type SeededRole = 'buyer' | 'seller' | 'courier' | 'enabler' | 'supplier' | 'admin';

export interface SeededUser {
  readonly role: SeededRole;
  readonly email: string;
  readonly password: string;
  readonly id: string;
}

export const SEEDED_USERS: Record<SeededRole, SeededUser> = {
  buyer: {
    role: 'buyer',
    email: 'buyer@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFXQZC36NK3CDEWJJS21RP8',
  },
  seller: {
    role: 'seller',
    email: 'seller@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFZ1E5G6CWAQ4BXKVNPYG3Z',
  },
  courier: {
    role: 'courier',
    email: 'courier@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFZ1E7W4JDR9N9PMGYDD77S',
  },
  enabler: {
    role: 'enabler',
    email: 'enabler@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFZ1E8HMAE7MMH175PJ9337',
  },
  supplier: {
    role: 'supplier',
    email: 'supplier@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01KRFZ1E73P67T886TR2QDY0VT',
  },
  admin: {
    role: 'admin',
    email: 'admin@maysar.co.tz',
    password: 'Maysar@2024!',
    id: 'usr_01ADMIN0000000000000000001',
  },
} as const;

export const WALLET_TOP_UP_MINIMUM = 100_000; // TZS
```

### `tests/e2e/helpers/live-api.ts` — additions

New exports added to the existing file (existing exports remain unchanged):

```typescript
/**
 * Log in as a seeded user and return the Bearer access token.
 * Throws if the login fails.
 */
export const loginAs = async (user: SeededUser): Promise<string> => { ... }

/**
 * Obtain an admin Bearer token. Cached for the duration of the process.
 */
export const getAdminToken = async (): Promise<string> => { ... }

/**
 * Ensure the buyer's wallet balance is at least `minimumTzs`.
 * If the current balance is already >= minimum, no credit request is made (idempotent).
 * Requires an admin token to call the credit endpoint.
 */
export const ensureWalletMinimum = async (
  userId: string,
  minimumTzs: number,
  adminToken: string
): Promise<void> => { ... }

/**
 * Return a standard Bearer Authorization header object.
 */
export const authHeader = (token: string): { authorization: string } => ({
  authorization: `Bearer ${token}`,
});

/**
 * Assert that a JsonResponse is OK (2xx).
 * Throws with status + body details if not.
 */
export const assertOk = (response: JsonResponse, context?: string): void => { ... }
```

### Per-area test files

Each file follows this structure:

```typescript
import { liveTestSuite, requestJson, loginAs, getAdminToken,
         ensureWalletMinimum, authHeader, assertOk } from './helpers/live-api';
import { SEEDED_USERS, WALLET_TOP_UP_MINIMUM } from './fixtures/seeded-users';

liveTestSuite('<Area> — Flow Doc <N>', () => {
  let buyerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // 1. Health check
    const health = await requestJson('/health');
    expect(health.status).toBe(200);

    // 2. Obtain tokens
    adminToken = await getAdminToken();
    buyerToken = await loginAs(SEEDED_USERS.buyer);

    // 3. Idempotent wallet top-up
    await ensureWalletMinimum(SEEDED_USERS.buyer.id, WALLET_TOP_UP_MINIMUM, adminToken);
  });

  it('[P0] [AUTH-01] ...', async () => { ... });
  it('[P1] [BUY-02] ...', async () => { ... });
  it('[P2] [COU-03] ...', async () => { ... });
});
```

### `tests/e2e/helpers.unit.test.ts`

A standard Jest test file (not an `.e2e.test.ts` file, so it runs in the normal test suite without
`RUN_LIVE_E2E`) that uses `fast-check` to validate the pure-function behaviour of the helpers.

---

## Data Models

### Order creation payload (wallet payment)

```typescript
interface WalletOrderPayload {
  buyerId: string;
  sellerId: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  deliveryAddress: {
    wardId: string;
    fullAddress: string;
    coordinates: { lat: number; lng: number };
  };
  paymentMethod: 'WALLET';
}
```

### COD order payload

Same as wallet order but `paymentMethod: 'COD'`. COD orders within the NEW_BUYER tier must have
`totalValue <= 30_000 TZS` and a delivery ward within 24 km of the seller's ward centroid.

### Wallet balance response

```typescript
interface WalletBalanceResponse {
  success: true;
  data: {
    userId: string;
    balance: number;        // available balance in TZS
    frozenAmount?: number;  // locked by active COD commitment
    currency: 'TZS';
  };
}
```

### Delivery status update payload

```typescript
interface DeliveryStatusUpdate {
  status: 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
  notes?: string;
}
```

### Seeded product reference

Tests that place orders need at least one product ID belonging to the seeded seller.
The `beforeAll` of `customer.e2e.test.ts` resolves this dynamically via
`GET /api/catalog/products?sellerId=<seller.id>&limit=1` and caches the result.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a
system — essentially, a formal statement about what the system should do. Properties serve as the bridge
between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties apply to the **pure-function** helpers in `tests/e2e/helpers/live-api.ts`.
These functions have no external dependencies and are well-suited to property-based testing with
`fast-check`. Live HTTP round-trips (wallet credit/debit, auth token round-trip) are validated as
integration examples in the respective `.e2e.test.ts` files instead.

---

### Property 1: Trailing-slash stripping is universal

*For any* URL string assigned to the base-URL environment variable (including strings with zero, one,
or many trailing slashes), `resolveLiveBaseUrl()` SHALL return a string that does not end with `/`.

**Validates: Requirements 1.4, 13.6**

---

### Property 2: JSON body is parsed when the response text is valid JSON

*For any* JSON-serialisable value `v`, when `requestJson`'s internal text-parsing branch receives
`JSON.stringify(v)` as the response text, the returned `body` field SHALL deeply equal `v`.

**Validates: Requirements 13.1**

---

### Property 3: Non-JSON text is returned verbatim in the body field

*For any* string that is not valid JSON (e.g., plain text, HTML, binary-safe ASCII), when passed
as the response text, the returned `body` field SHALL be strictly equal to the raw text string.

**Validates: Requirements 13.2**

---

### Property 4: extractAccessToken succeeds for any non-empty accessToken string

*For any* non-empty string `t`, `extractAccessToken({ accessToken: t })` SHALL return exactly `t`
without throwing.

**Validates: Requirements 13.4**

---

### Property 5: extractAccessToken throws for all invalid inputs

*For any* input that is `null`, a non-object primitive, an array, an object without an `accessToken`
field, or an object where `accessToken` is the empty string or a non-string value,
`extractAccessToken(input)` SHALL throw an `Error`.

**Validates: Requirements 13.5**

---

## Error Handling

### `beforeAll` health-check failure

If `GET /health` returns a non-200 status, the `beforeAll` hook throws.  Jest marks the entire suite as
failed and skips all `it` blocks in that suite.  The error message includes the actual HTTP status so the
developer knows whether the backend is down or misrouted.

### Wallet top-up failure

`ensureWalletMinimum` uses `assertOk` internally. If the credit endpoint fails (e.g., admin token expired,
wallet service down), it throws before any wallet-dependent tests run, producing a clear failure rather
than silent incorrect assertions.

### Missing test data (no products for seller)

The `customer.e2e.test.ts` `beforeAll` fetches a product to use in order placement. If the catalog returns
an empty list for the seeded seller, the `beforeAll` throws with a descriptive message rather than
letting tests fail with an obscure "Cannot read property of undefined" error.

### Token caching

`getAdminToken()` caches the admin token at module scope. If the cached token expires mid-run (unlikely
given `--runInBand` and 30 s test timeout), the next call re-authenticates. Tests should not hold a
reference to the cached value for more than the duration of a single test.

### Order cleanup / idempotency

Tests do not assume orders or deliveries created in a previous run are gone.  State-reading tests
(`GET /api/order/orders?buyerId=...`) assert shape, not exact counts.  For tests that need a freshly
created order (cancel round-trip, COD freeze), the order is created within the same `it` block and
cancelled at the end of that block via a `try/finally` guard.

---

## Testing Strategy

### Dual approach

| Layer | Tool | Purpose |
|-------|------|---------|
| Pure helper functions | Jest + `fast-check` (≥100 iterations) | Property-based coverage of URL parsing, JSON parsing, token extraction |
| Live API flows | Jest + real HTTP (`--runInBand`) | Integration validation of full request/response cycles |

### `helpers.unit.test.ts` — property tests (offline, no backend required)

These tests live in `tests/e2e/helpers.unit.test.ts` and are picked up by the `e2e` Jest project.
They do **not** require `RUN_LIVE_E2E=true` because they test pure functions, not HTTP.

Each `fast-check` property is configured with at least 100 runs via `{ numRuns: 100 }`.

Tag format: `Feature: e2e-flow-coverage, Property <N>: <property_text>`

```
// Feature: e2e-flow-coverage, Property 1: trailing-slash stripping is universal
// Feature: e2e-flow-coverage, Property 2: JSON body is parsed when response text is valid JSON
// Feature: e2e-flow-coverage, Property 3: non-JSON text is returned verbatim in body field
// Feature: e2e-flow-coverage, Property 4: extractAccessToken succeeds for any non-empty accessToken
// Feature: e2e-flow-coverage, Property 5: extractAccessToken throws for all invalid inputs
```

### Live E2E test files — priority tagging

Test names follow the pattern: `[P<tier>] [<USE-CASE-ID>] <description>`.

This allows `--testNamePattern='\[P0\]'` to run only the deploy-gate tier.

```
[P0] [AUTH-01] login with valid buyer credentials returns 200 + accessToken
[P0] [AUTH-02] verify with valid token returns { success: true }
[P0] [BUY-01] catalog products list returns non-empty array
[P0] [BUY-02] seller storefront read returns expected shape
[P0] [BUY-03] wallet payment order create + cancel round-trip restores balance
[P0] [OPS-01] COD eligibility rejection when exposure limit exceeded
[P1] [AUTH-01] all seeded roles can log in successfully
[P1] [BUY-03] order state read after creation matches orderId
[P1] [OPS-02] wallet credit then debit of same amount restores balance
[P1] [OPS-05] COD order placed within limits creates order + freezes wallet
[P1] [COU-02] delivery status read returns object with status field
[P1] [BUY-05] saga: cancel after wallet order credits amount back
[P2] [OPS-05] concurrent COD limit blocks second simultaneous COD order
[P2] [OPS-05] geographic COD restriction rejects out-of-radius delivery
[P2] [COU-03] delivery state machine rejects backwards transition
[P2] [COU-03] COD OTP verification success captures commitment
[P2] [SEL-07] seller order list returns orders shape
```

### Idempotency strategy

| Scenario | Strategy |
|----------|----------|
| Buyer wallet drained by prior run | `beforeAll` top-up via admin credit endpoint (idempotent: no-op if balance ≥ 100k) |
| Order created by test persists | Cancel the order inside the same `it` block via `try/finally` |
| COD commitment frozen | Covered by cancel test teardown; separate tests read balance before and after |
| Multiple test runs on same DB | State-reading assertions check shape + relative changes, not absolute counts |

### Jest project configuration

No changes are required to `jest.config.js`. The existing `e2e` project already targets
`<rootDir>/tests/e2e/**/*.e2e.test.ts` with `ts-jest`, the correct `testEnvironment: 'node'`, and
`setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']`.

The `helpers.unit.test.ts` file uses the `.test.ts` suffix, not `.e2e.test.ts`, so it will **not** be
picked up by the `e2e` project. It will be picked up by whichever project's `testMatch` covers the
`tests/e2e/` path. To ensure it runs without a backend, a small addition to the `e2e` project's
`testMatch` is needed to also include `tests/e2e/helpers.unit.test.ts`:

```js
// jest.config.js — e2e project testMatch addition
testMatch: [
  '<rootDir>/tests/e2e/**/*.e2e.test.ts',
  '<rootDir>/tests/e2e/helpers.unit.test.ts',  // ← add this
],
```

Alternatively, rename the file to `helpers.e2e.test.ts` and note in a comment that it does not require a
live backend; this avoids the config change entirely. **Recommended: use `helpers.e2e.test.ts`** to keep
the config unchanged.

### Coverage mapping

| Use Case ID | Requirement | Test file | Priority |
|-------------|-------------|-----------|---------|
| AUTH-01 | 4.1–4.4 | `auth.e2e.test.ts` | P0 |
| AUTH-02 | 4.5–4.6 | `auth.e2e.test.ts` | P0 |
| AUTH-01 (all roles) | 4.7 | `auth.e2e.test.ts` | P1 |
| BUY-01 | 5.1 | `customer.e2e.test.ts` | P0 |
| BUY-02 | 5.2 | `customer.e2e.test.ts` | P0 |
| BUY-03 | 5.3–5.4 | `customer.e2e.test.ts` | P0/P1 |
| BUY-05 | 5.7, 10.1 | `customer.e2e.test.ts` | P0/P1 |
| OPS-01 | 6.1 | `cod-trust.e2e.test.ts` | P0 |
| OPS-02 | 9.1–9.4 | `wallet.e2e.test.ts` | P1 |
| OPS-05 | 6.2–6.5 | `cod-trust.e2e.test.ts` | P1/P2 |
| SEL-06 | 7.1 | `seller.e2e.test.ts` | P1 |
| SEL-07 | 7.2 | `seller.e2e.test.ts` | P2 |
| COU-02 | 8.1–8.2 | `delivery.e2e.test.ts` | P1 |
| COU-03 | 8.3–8.5 | `delivery.e2e.test.ts` | P2 |

Use cases explicitly deferred (no test file): `SUP-01`, `SUP-03`, `ENA-02`, `ENA-03`, `ADM-02`,
`ADM-03`, `ADM-07`. Each deferred area will have a `describe.skip` placeholder with a comment
explaining the deferral (external S3, manual review queues, etc.).
