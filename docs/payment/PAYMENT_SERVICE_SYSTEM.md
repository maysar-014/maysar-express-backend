# Maysar Payment Service — Implementation Reference (As-Built)

> **Status:** Live and verified — multi-method payment processing, environment-driven method control, fraud scoring, webhook handling, refunds, saga-based settlement.
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

**Production default:** When `NODE_ENV=production`, methods without an explicit `MODE` var default to `off` (never silently operational).

### 2.3 `PaymentMethodConfigService`

Key methods:

| Method | Purpose |
|---|---|
| `listPublic()` | Buyer-facing list — all 7 methods with `available: boolean`. `off` methods are included but `available: false`. |
| `listAvailableCodes()` | Array of operational method codes only. Used internally before processing. |
| `isOperational(code)` | Returns true when mode ≠ `off` AND credentials are complete. |
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

Primary mobile money and card adapter. Routes MPESA, AIRTEL_MONEY, MIXX_BY_YAS, HALOPESA, and CARD through Selcom's aggregator API. Handles:
- USSD push payment initiation
- Webhook signature verification (HMAC-SHA256)
- Transaction status polling
- Refund initiation

---

## 7. HTTP Surface

Mounted at `/api/payment` (module name `payment-service` → strip `-service` → `/api/payment`).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/payment/payment-methods` | none | Buyer-facing method discovery |
| GET | `/api/payment/admin/payment-methods` | admin/system JWT | Ops view of method config state |
| POST | `/api/payment/payments` | JWT | Initiate payment |
| GET | `/api/payment/payments/:paymentId` | JWT | Payment status |
| GET | `/api/payment/payments/order/:orderId` | JWT | Payment by order ID |
| POST | `/api/payment/payments/:paymentId/refund` | JWT | Initiate refund |
| POST | `/api/payment/payments/:paymentId/block` | admin JWT | Block transaction |
| POST | `/api/payment/payments/:paymentId/flag` | admin JWT | Flag for review |
| POST | `/api/payment/payments/webhooks/payment-gateway` | webhook sig | Selcom/gateway webhook |
| GET | `/api/payment/health` | none | Health check |
| GET | `/api/payment/health/ready` | none | Readiness probe |
| GET | `/api/payment/health/live` | none | Liveness probe |

---

## 8. Events

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

## 9. Verification Evidence

| Artifact | What it proves |
|---|---|
| `config/__tests__/payment-methods.config.test.ts` | Method mode resolution, `off` behavior, credential validation, alias normalization |
| `domain/engines/__tests__/fraud.engine.test.ts` | All 5 fraud checks, risk scoring, recommendation thresholds |
| `domain/entities/__tests__/payment.entity.test.ts` | Status transition matrix, refund arithmetic, `failureCode` stamping |
| `application/use-cases/__tests__/process-payment.use-case.test.ts` | Full processing pipeline including method availability gate |
| `application/use-cases/__tests__/refund-payment.use-case.test.ts` | Refund validation, partial refund |
| `infrastructure/providers/__tests__/selcom-pesa.adapter.test.ts` | Webhook signature verification |
| `tests/integration/payment-flow.test.ts` | End-to-end payment flow |
