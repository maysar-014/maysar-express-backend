# Maysar Payment Service — Implementation Reference (As-Built)

> **Status:** Live and verified — multi-method payment processing, environment-driven method control, credential-free sandbox simulation, fraud scoring, webhook handling, refunds, saga-based settlement.
> **Last updated:** September 2026
> **Scope:** `services/payment-service` + `prisma/schema.prisma` (`Payment_*` models)

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives in code |
|---|---|
| **Payment methods are environment-driven, not hard-coded** | `PaymentMethodConfigService` reads `PAYMENT_<METHOD>_MODE` env vars — each method is independently `sandbox`, `live`, or `off`. Production defaults to `off` until explicitly enabled. |
| **`off` means invisible** | `listPublic()` returns all methods with `available: false` for `off` methods — the frontend uses `available` to decide what to show. A disabled method is never accessible to buyers. |
| **No fallback from live to sandbox** | `getRuntimeConfig()` throws `PaymentConfigurationError` if live mode is set but live credentials are missing — no silent degradation. |
| **Deprecated aliases are normalized** | `TIGO_PESA` → `MIXX_BY_YAS`, `MOBILE_MONEY` / `MNO` → `MPESA` — `normalizeMethodCode()` handles this transparently. |
| **Status transitions are strictly validated** | `Payment.validateStatusTransition()` enforces the allowed transition matrix — no arbitrary status writes |
| **Fraud assessment runs on every transaction** | `FraudEngine.assessTransaction()` runs 5 parallel checks; `recommendation: 'decline'` blocks the payment |
| **Refunds cannot exceed paid amount** | `Payment.recordRefund()` checks `refundAmount ≤ getRefundableAmount()` |
| **Webhooks are idempotent** | `WebhookEventRepository` deduplicates by provider event ID before processing |
| **Payment saga has compensation** | `PaymentProcessingSaga` reverses wallet debits and inventory holds on failure |
| **Secrets never leave the config module** | `listPublic()` and `listAdminStatus()` never include credential values — only presence booleans |
| **Environment is stamped on every payment** | `Payment.environment: SANDBOX | LIVE` is set at creation from `PaymentMethodConfigService.getRuntimeConfig()` |
| **Explicit failure codes** | `PaymentFailureCode` enum distinguishes `METHOD_DISABLED`, `PROVIDER_UNAVAILABLE`, `PAYMENT_DECLINED`, etc. — never collapsed into a generic failure |
| **Sandbox simulates the full lifecycle — no shortcuts** | `SandboxSimulatorAdapter` runs initiation → provider → callback → verify → state transition → notification exactly like a real provider; only the provider's network side is simulated in-process (see §7) |
| **Sandbox needs no provider credentials** | `buildState()` marks any `sandbox` method operational regardless of credentials; only `live` is strictly gated on `PAYMENT_SELCOM_LIVE_*` |
| **Sandbox and live never mix** | `sbx_`-prefixed references are verified against the simulation ledger; everything else goes to the real gateway — a sandbox transaction can never silently become live |

---

## 2. Payment Method Configuration

### 2.1 Method Codes (`config/payment-methods.config.ts`)

| Code | Name | Type | Provider | Min (TZS) |
|---|---|---|---|---|
| `MPESA` | M-Pesa | `mobile_money` | selcom | 500 |
| `AIRTEL_MONEY` | Airtel Money | `mobile_money` | selcom | 500 |
| `MIXX_BY_YAS` | Mixx by Yas | `mobile_money` | selcom | 500 |
| `HALOPESA` | HaloPesa | `mobile_money` | selcom | 500 |
| `CARD` | Card | `card` | selcom | 1,000 |
| `BANK_TRANSFER` | Bank Transfer | `bank_transfer` | internal_bank_transfer | 1,000 |
| `WALLET` | Wallet | `wallet` | internal_wallet | 100 |

**Deprecated aliases:** `TIGO_PESA` → `MIXX_BY_YAS`, `MOBILE_MONEY` → `MPESA`, `MNO` → `MPESA`

### 2.2 Environment Control

Each method is independently controlled via environment variables:

```bash
PAYMENT_MPESA_MODE=live          # sandbox | live | off
PAYMENT_AIRTEL_MONEY_MODE=live
PAYMENT_MIXX_BY_YAS_MODE=sandbox
PAYMENT_HALOPESA_MODE=off
PAYMENT_CARD_MODE=off
PAYMENT_BANK_TRANSFER_MODE=sandbox
PAYMENT_WALLET_MODE=live
```

Provider credentials are scoped per provider per environment:
```bash
PAYMENT_SELCOM_LIVE_API_KEY=...
PAYMENT_SELCOM_LIVE_MERCHANT_CODE=...
PAYMENT_SELCOM_LIVE_BASE_URL=...
PAYMENT_SELCOM_SANDBOX_API_KEY=...
PAYMENT_SELCOM_SANDBOX_MERCHANT_CODE=...
PAYMENT_SELCOM_SANDBOX_BASE_URL=...
```

**Declared & validated:** every payment variable the service reads is declared explicitly in `paymentEnvSchema` (`config/payment-methods.config.ts`) and validated through zod before it is used:
- `PAYMENT_<METHOD>_MODE` — `sandbox | live | off`. A malformed value fails fast with the variable name; an empty string is treated as *unset*.
- `PAYMENT_SELCOM_{SANDBOX,LIVE}_{API_KEY,MERCHANT_CODE,BASE_URL}` — optional; empty means unset.
- Legacy `SELCOM_PESA_*` vars are accepted by the schema for backward compatibility.
- `PAYMENT_SANDBOX_COMPLETION_DELAY_MS` — simulator completion delay (default `2000`, clamped 0–60 000).

Invalid values abort configuration with a precise message:
```text
Invalid payment method environment configuration:
  - PAYMENT_MPESA_MODE: Invalid enum value. Expected 'sandbox' | 'live' | 'off'
```

**Sandbox is credential-free:** in `sandbox` mode the method is powered by the in-service simulator (`infrastructure/providers/sandbox-simulation/`) — **no provider credentials are required or consulted**. Sandbox credential vars that happen to be present are tolerated but never gate operation and are never used in `live`.

**Live strictly requires live credentials:** `live` mode demands a complete `PAYMENT_SELCOM_LIVE_*` set; `getRuntimeConfig()` throws `PaymentConfigurationError` naming the missing keys. There is no fallback to sandbox, development, hard-coded, or another provider's credentials.

**Production default:** When `NODE_ENV=production`, methods without an explicit `MODE` var default to `off` (never silently operational).

### 2.3 `PaymentMethodConfigService`

Key methods:

| Method | Purpose |
|---|---|
| `listPublic()` | Buyer-facing list — all 7 methods with `available: boolean`. `off` methods are included but `available: false`. |
| `listAvailableCodes()` | Array of operational method codes only. Used internally before processing. |
| `isOperational(code)` | Returns true when the method is enabled AND its required configuration is present — `sandbox` needs no credentials (simulator), `live` needs the complete live credential set |
| `getRuntimeConfig(code)` | Returns provider, channel, environment, credentials. Throws `PaymentConfigurationError` if not operational. |
| `validateAll()` | Returns codes of methods that are enabled but misconfigured (for startup health check). |
| `normalizeMethodCode(raw)` | Resolves deprecated aliases; returns `null` for unknown codes. |
| `formatStartupReport()` | Human-readable per-method startup log (no secrets). |

Startup: `PaymentModule.initialize()` calls `validateAll()` and logs a warning for any misconfigured methods. Misconfigured methods are rejected with `METHOD_MISCONFIGURED` (503) at runtime.

---

## 3. Domain Model

### 3.1 Payment Entity (`domain/entities/payment.entity.ts`)

```
PaymentStatus: PENDING → PROCESSING → COMPLETED
                                    ↘ FAILED
                       ↘ FAILED
                       ↘ CANCELLED
               COMPLETED → REFUNDED | PARTIALLY_REFUNDED
               PARTIALLY_REFUNDED → REFUNDED
```

**New: `PaymentEnvironment` enum:** `SANDBOX | LIVE` — stamped on every payment at creation.

**New: `PaymentFailureCode` enum:**
```
METHOD_DISABLED          — method is set to off
METHOD_MISCONFIGURED     — method credentials incomplete
METHOD_NOT_FOUND         — unknown method code
PROVIDER_UNAVAILABLE     — Selcom/gateway unreachable
PAYMENT_DECLINED         — fraud score decline
PAYMENT_FAILED           — generic provider failure
PAYMENT_EXPIRED          — mobile money timeout
PAYMENT_CANCELLED        — explicit cancel
PAYMENT_VERIFICATION_FAILED — webhook/hash mismatch
DUPLICATE_PAYMENT        — existing payment for order
```

Key domain methods:

| Method | Behavior |
|---|---|
| `updateStatus(newStatus, reason?)` | Validates transition matrix; sets `completedAt` on COMPLETED; sets `failureReason` + `failureCode` on FAILED |
| `markAsCompleted(providerTxId?)` | Throws if already COMPLETED |
| `markAsFailed(reason, failureCode?)` | Throws if COMPLETED; requires non-empty reason |
| `canRefund()` | Returns true if COMPLETED or PARTIALLY_REFUNDED and `refundableAmount > 0` |
| `recordRefund(amount)` | Validates amount ≤ refundable; updates `refundedAmount`; transitions to REFUNDED or PARTIALLY_REFUNDED |
| `calculateFees()` | Returns `{ platformFee, providerFee, totalFee }` |

### 3.2 Refund Entity (`domain/entities/refund.entity.ts`)

Fields: `refundId`, `paymentId`, `amount`, `reason`, `status`, `providerRefundId`.

### 3.3 PaymentProvider enum

```
PAYMENT_GATEWAY       — Selcom-backed channels (MPESA, AIRTEL, MIXX, HALOPESA, CARD)
INTERNAL_WALLET       — Maysar wallet debit
INTERNAL_BANK_TRANSFER — manual bank transfer instruction
```

---

## 4. Domain Engines

### 4.1 FraudEngine (`domain/engines/fraud.engine.ts`)

Runs 5 parallel checks on every transaction:

| Check | What it detects |
|---|---|
| `checkVelocityRules()` | High frequency (>5 in 5min, >20 in 1hr, >50 in 1day) + high amount velocity |
| `checkAmountRules()` | Amount >5× user average; round-number pattern |
| `checkLocationRules()` | Impossible travel (>1000 km/h); high-risk country |
| `checkDeviceRules()` | New/unrecognized device; device with known fraud history |
| `checkBehaviorRules()` | Unusual hour; new payment method |

Risk score = sum of flag weights (capped at 100):
- `< 30` → `low` → `approve`
- `30–59` → `medium` → `approve` (logged)
- `60–79` → `high` → `review`
- `≥ 80` → `critical` → `decline`

### 4.2 PaymentProcessingEngine (`domain/engines/payment-processing.engine.ts`)

Pipeline: method availability check → fraud check → route to provider → handle response.

### 4.3 SettlementEngine (`domain/engines/settlement.engine.ts`)

`sellerAmount = orderAmount - platformFee - providerFee`

---

## 5. Application Layer (Use Cases)

| Use case | What it does |
|---|---|
| `ProcessPaymentUseCase` | Method availability check → fraud check → route to provider → update status → emit `payment.completed` |
| `CheckPaymentStatusUseCase` | Fetch payment + provider status sync |
| `RefundPaymentUseCase` | Validate refundable → call provider refund → `recordRefund()` → emit `payment.refunded` |
| `HandlePaymentWebhookUseCase` | Deduplicate → verify signature → parse provider event → update payment status |
| `BlockTransactionUseCase` | Admin-initiated block of suspicious transaction |
| `FlagTransactionUseCase` | Flag for manual review |

---

## 6. Selcom Adapter (`infrastructure/providers/selcom-pesa.adapter.ts`)

Primary mobile money and card adapter. Routes MPESA, AIRTEL_MONEY, MIXX_BY_YAS, HALOPESA, and CARD through Selcom's aggregator API in **`live` mode only** (sandbox-mode methods are routed to the sandbox simulator instead — see §7). Handles:
- USSD push payment initiation
- Webhook signature verification (HMAC-SHA256)
- Transaction status polling
- Refund initiation

---

## 7. Sandbox Simulation System

Dedicated, provider-free payment simulation. Lives in `services/payment-service/src/infrastructure/providers/sandbox-simulation/` — cleanly separated from the live provider integrations so it can never be mistaken for (or reused as) a real gateway.

### 7.1 When it activates

A method uses the simulator **iff** its mode is `sandbox`. `live` and `off` never touch it:

| Mode | Provider adapter |
|---|---|
| `sandbox` | Per-channel `SandboxSimulatorAdapter` bound to a shared `SandboxLedger` |
| `live` | Real `SelcomPesaAdapter` (live credentials strictly required) |
| `off` | Never resolved — rejected by the availability gate before a provider exists |

The switch happens in `PaymentMethodProviderRegistry.getProvider()`. A unit test asserts the live path **never** calls the sandbox factory.

### 7.2 Components

| File | Role |
|---|---|
| `sandbox-simulator.adapter.ts` | `IPaymentProvider` implementation — one instance per method channel. Initiation creates a ledger transaction (PENDING → PROCESSING), returns a provider reference, schedules deterministic completion, and dispatches a real webhook through `HandlePaymentWebhookUseCase` on terminal resolution. |
| `sandbox-ledger.ts` | In-process source of truth. **Terminal states are immutable** — a repeated callback can never double-process or change an outcome. All references are prefixed `sbx_`. |
| `sandbox-behavior.ts` | Outcome model + completion delay. Outcomes are explicit (never random). |
| `sandbox-webhook-router.ts` | `SandboxAwareProviderRouter` — webhook/status verifiers delegate `sbx_*` references to the ledger and everything else to the live gateway. |

Per-channel instances share **one** ledger, so a transaction initiated via the M-Pesa channel is verifiable by the webhook pipeline and by any status poll.

### 7.3 The lifecycle it exercises (identical to live)

```text
Checkout → method gate → create internal payment → simulator initiation →
provider-style reference → asynchronous processing → webhook dispatch through
HandlePaymentWebhookUseCase → ledger verification → payment state transition →
payment.completed / payment.failed events → order synchronization
```

Only the provider's network side is simulated in-process; every other stage runs the production code path.

### 7.4 Deterministic outcomes (testing control)

Driven by `metadata.sandboxOutcome` on the initiation request — lets integration tests exercise declines, timeouts, and cancellations **through the real pipeline**:

| Outcome (metadata) | Terminal state | Failure reason |
|---|---|---|
| `SUCCESS` (default) | `COMPLETED` | — |
| `INSUFFICIENT_FUNDS` | `FAILED` | `PAYMENT_DECLINED: insufficient funds (simulated)` |
| `DECLINED` | `FAILED` | `PAYMENT_DECLINED: declined by provider (simulated)` |
| `TIMEOUT` | `FAILED` | `PAYMENT_EXPIRED: provider timeout (simulated)` |
| `CANCELLED` | `CANCELLED` | — |

Completion delay: `PAYMENT_SANDBOX_COMPLETION_DELAY_MS` (default `2000` ms, clamped 0–60 000).

### 7.5 Idempotency & integrity

- Every sandbox transaction has an internal Maysar payment ID, independent of the `sbx_` provider reference.
- The ledger enforces terminal immutability; each inbound callback is counted exactly once.
- Unknown `sbx_*` references resolve to `PAYMENT_VERIFICATION_FAILED` — the system never fabricates a success.
- Sandbox webhooks are verified against the ledger before any payment state change, mirroring live signature/status verification.

### 7.6 What sandbox is **not**

Not a frontend-only "pretend success" path; not a mock injected into the use-case layer; not a bypass of validation, callbacks, state transitions, events, or reconciliation. It is the same Maysar payment architecture with the provider adapter swapped for an in-process simulator.

---

## 8. HTTP Surface

Mounted at `/api/payment` (module name `payment-service` → strip `-service` → `/api/payment`).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/payment/payment-methods` | none | Buyer-facing method discovery |
| GET | `/api/payment/admin/payment-methods` | admin/system JWT | Ops view of method config state |
| GET | `/api/payment/admin/payments` | admin/system JWT | Payment summary roster (`?limit=&offset=`, max limit 200) |
| POST | `/api/payment/payments` | JWT | Initiate payment |
| GET | `/api/payment/payments/:paymentId` | JWT | Payment status |
| GET | `/api/payment/payments/order/:orderId` | JWT | Payment by order ID |
| POST | `/api/payment/payments/:paymentId/refund` | JWT | Initiate refund |
| POST | `/api/payment/payments/:paymentId/block` | admin JWT | Block transaction |
| POST | `/api/payment/payments/:paymentId/flag` | admin JWT | Flag for review |
| POST | `/api/payment/payments/webhooks/payment-gateway` | webhook sig | Selcom/gateway webhook — `sbx_*` references resolve against the simulation ledger (sandbox callbacks), everything else against the real gateway |
| GET | `/api/payment/health` | none | Health check |
| GET | `/api/payment/health/ready` | none | Readiness probe |
| GET | `/api/payment/health/live` | none | Liveness probe |

---

## 9. Events

| Event | Emitted by | Payload |
|---|---|---|
| `payment.initiated` | `ProcessPaymentUseCase` | `paymentId, orderId, amount, method, environment` |
| `payment.completed` | `ProcessPaymentUseCase` | `paymentId, orderId, amount, method, providerTxId, environment` |
| `payment.failed` | `ProcessPaymentUseCase` | `paymentId, orderId, reason, failureCode` |
| `payment.cancelled` | Explicit cancel | `paymentId, orderId` |
| `payment.refunded` | `RefundPaymentUseCase` | `paymentId, refundId, amount` |

Events consumed:
- `order.placed` → initiate payment processing
- `order.cancelled` → initiate refund

---

## 10. Verification Evidence

| Artifact | What it proves |
|---|---|
| `config/__tests__/payment-methods.config.test.ts` | Method mode resolution, `off` behavior, credential-free sandbox, live credential enforcement, alias normalization |
| `infrastructure/providers/sandbox-simulation/__tests__/sandbox-behavior.test.ts` | Outcome resolution, terminal mapping, delay clamping |
| `infrastructure/providers/sandbox-simulation/__tests__/sandbox-ledger.test.ts` | Ledger lifecycle, terminal immutability (duplicate-callback protection) |
| `infrastructure/providers/sandbox-simulation/__tests__/sandbox-simulator.adapter.test.ts` | Initiation → ledger → webhook through the real pipeline; deterministic declines; router delegation (`sbx_*` vs live) |
| `domain/engines/__tests__/fraud.engine.test.ts` | All 5 fraud checks, risk scoring, recommendation thresholds |
| `domain/entities/__tests__/payment.entity.test.ts` | Status transition matrix, refund arithmetic, `failureCode` stamping |
| `application/use-cases/__tests__/process-payment.use-case.test.ts` | Full processing pipeline including method availability gate |
| `application/use-cases/__tests__/refund-payment.use-case.test.ts` | Refund validation, partial refund |
| `infrastructure/providers/__tests__/selcom-pesa.adapter.test.ts` | Webhook signature verification |
| `tests/integration/payment-flow.test.ts` | End-to-end payment flow |


---

## System Maintenance Routes

Mounted at `/api/payment/system/maintenance`. Guards: `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/payment/system/maintenance/cleanup/outbox/report` | Dry-run count of deletable payment outbox events |
| POST | `/api/payment/system/maintenance/cleanup/outbox` | Batched deletion of expired outbox events. Body: `{ "dryRun": true }` to simulate |

**Retention defaults:** sent/processed → 7 days, failed → 30 days. Batch size: 1000. Max runtime: 20 s.
