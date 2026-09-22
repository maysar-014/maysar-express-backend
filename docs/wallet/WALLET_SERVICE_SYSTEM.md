# Maysar Wallet Service — Implementation Reference (As-Built)

> **Status:** Live and verified — balance management, holds, COD commitment ledger, idempotency, velocity checks, saga-based settlement.
> **Last updated:** September 2026
> **Scope:** `services/wallet-service` + `prisma/schema.prisma` (`Wallet_*` models)

---

## 1. Guiding Principles Enforced by the Code

| Principle | Where it lives in code |
|---|---|
| **Available balance = balance − frozenAmount** | `Wallet.getAvailableBalance()` — debits check this, never raw balance |
| **Transactions are immutable** | `Transaction` constructor calls `Object.freeze()` on props — no mutation after creation |
| **Balance consistency is validated at construction** | `Transaction.validateBalanceConsistency()` enforces exact arithmetic per type (CREDIT, DEBIT, FREEZE, UNFREEZE, DEBIT_FROZEN) |
| **Idempotency is enforced at the use-case layer** | `IdempotencyService` checks `Wallet_IdempotencyKey` before executing; duplicate requests return the original result |
| **COD commitment is a separate ledger** | `codCommitmentUsed` / `codCommitmentLimit` / `codCommitmentCount` tracked independently on the wallet |
| **Holds are explicit lifecycle objects** | `Hold` entity with `ACTIVE → CAPTURED | RELEASED | EXPIRED` state machine; `placeHold()` freezes funds atomically |
| **Velocity limits are policy-enforced** | `LimitPolicy.canDebit()` checks single-tx max, daily count, daily amount, monthly amount before any debit |
| **Frozen amount cannot exceed balance** | Constructor invariant: `frozenAmount > balance` throws |

---

## 2. Domain Model

### 2.1 Wallet Entity (`domain/entities/wallet.entity.ts`)

```
WalletStatus: ACTIVE | FROZEN | SUSPENDED | CLOSED
```

Key fields: `balance`, `frozenAmount`, `codCommitmentLimit`, `codCommitmentUsed`, `codCommitmentCount`, `version` (optimistic lock).

Key domain methods:

| Method | Behavior |
|---|---|
| `getAvailableBalance()` | `balance - frozenAmount` |
| `canDebit(amount)` | Status ACTIVE + amount > 0 + availableBalance ≥ amount |
| `credit(amount)` | Increases balance; throws on CLOSED wallet |
| `debit(amount)` | Calls `canDebit()`; decreases balance |
| `freeze(amount)` | Increases `frozenAmount`; requires ACTIVE status + sufficient available balance |
| `unfreeze(amount)` | Decreases `frozenAmount`; cannot exceed current frozen |
| `placeHold(amount, expiresAt, reason)` | Calls `freeze()` + creates `Hold` entity |
| `captureHold(hold)` | Calls `hold.capture()` + `debitFrozen()` — both balance and frozen decrease |
| `releaseHold(hold)` | Calls `hold.release()` + `unfreeze()` |
| `useCODCommitment(amount)` | Checks `codCommitmentLimit - codCommitmentUsed ≥ amount`; increments used + count |
| `releaseCODCommitment(amount)` | Decrements `codCommitmentUsed` (floor 0) |
| `close()` | Requires `frozenAmount === 0` AND `balance === 0` |

### 2.2 Transaction Entity (`domain/entities/transaction.entity.ts`)

Immutable append-only ledger entry. Frozen on construction via `Object.freeze()`.

Transaction types:

| Type | Balance effect | Frozen effect |
|---|---|---|
| `CREDIT` | +amount | unchanged |
| `DEBIT` | -amount | unchanged |
| `FREEZE` | unchanged | +amount |
| `UNFREEZE` | unchanged | -amount |
| `DEBIT_FROZEN` | -amount | -amount |
| `REFUND` | +amount | unchanged |
| `PAYOUT` | -amount | unchanged |
| `TRANSFER_IN` / `TRANSFER_OUT` | ±amount | unchanged |

Reversible types: `CREDIT`, `DEBIT`, `FREEZE`, `TRANSFER_IN`, `TRANSFER_OUT`. `createReversal()` produces the mirror transaction.

### 2.3 Hold Entity (`domain/entities/hold.entity.ts`)

```
HoldStatus: ACTIVE → CAPTURED | RELEASED | EXPIRED
```

Fields: `walletId`, `userId`, `amount` (Money VO), `reason`, `expiresAt`, `isCaptured`, `isReleased`.

### 2.4 Policies

| Policy | File | Enforces |
|---|---|---|
| `LimitPolicy` | `domain/policies/wallet-limit.policy.ts` | Single-tx max, daily count/amount, monthly amount, max frozen ratio |
| `VelocityCheckPolicy` | `domain/policies/velocity-check.policy.ts` | Rolling window velocity checks |

---

## 3. Application Layer (Use Cases)

### 3.1 Balance operations

| Use case | File | What it does |
|---|---|---|
| `CreditWalletUseCase` | `application/use-cases/credit-wallet.use-case.ts` | Idempotency check → `wallet.credit()` → persist transaction → emit event |
| `DebitWalletUseCase` | `application/use-cases/debit-wallet.use-case.ts` | Idempotency check → velocity check → limit check → `wallet.debit()` → persist |
| `TopUpWalletUseCase` | `application/use-cases/top-up-wallet.use-case.ts` | External payment confirmation → credit wallet |
| `ReverseTransactionUseCase` | `application/use-cases/reverse-transaction.use-case.ts` | Finds original tx → `createReversal()` → persists reversal |

### 3.2 Hold operations

| Use case | What it does |
|---|---|
| `PlaceHoldUseCase` | `wallet.placeHold()` → persist hold + freeze transaction |
| `CaptureHoldUseCase` | `wallet.captureHold()` → persist DEBIT_FROZEN transaction |
| `ReleaseHoldUseCase` | `wallet.releaseHold()` → persist UNFREEZE transaction |
| `ExpireHoldUseCase` | `wallet.expireHold()` → persist UNFREEZE transaction |

### 3.3 Freeze operations

| Use case | What it does |
|---|---|
| `FreezeFundsUseCase` | Admin-initiated freeze of wallet status (not funds) |
| `UnfreezeFundsUseCase` | Admin-initiated unfreeze of wallet status |

### 3.4 Payout

| Use case | What it does |
|---|---|
| `InitiatePayoutFromWalletUseCase` | Debit wallet → create payout record → call payout-service |

### 3.5 Statement

| Use case | What it does |
|---|---|
| `GetWalletStatementUseCase` | Paginated transaction history with date range filter |

### 3.6 Sagas

| Saga | What it does |
|---|---|
| `WalletTransactionSaga` | Orchestrates multi-step wallet operations with compensation |
| `CODSettlementSaga` | Captures COD hold on delivery confirmation; releases on cancellation |

---

## 4. Idempotency

Every mutating operation accepts an `idempotencyKey`. The `IdempotencyService` checks `Wallet_IdempotencyKey` before executing:

- If key exists and operation completed: return original result
- If key exists and operation is in-flight: return 409 (concurrent request)
- If key is new: execute and store result

**Frontend rule:** generate a UUID per user action and include it as `X-Idempotency-Key` header. Retry the same request with the same key on network failure — the server guarantees exactly-once execution.

---

## 5. COD Commitment Ledger

The wallet tracks COD exposure separately from the main balance:

```
codCommitmentLimit  — maximum total active COD exposure (set by trust tier)
codCommitmentUsed   — sum of all outstanding COD order values
codCommitmentCount  — number of active COD orders
```

When a COD order is placed: `wallet.useCODCommitment(orderAmount)` — fails if `codCommitmentUsed + amount > codCommitmentLimit`.

When a COD order is delivered or cancelled: `wallet.releaseCODCommitment(orderAmount)`.

This is the wallet-side enforcement of the COD trust tier exposure limits defined in the order service.

---

## 6. HTTP Surface

Mounted at `/api/wallet`.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET  | `/api/wallet/balance` | JWT | Get wallet balance + available balance |
| POST | `/api/wallet/credit` | system/admin JWT | Credit wallet |
| POST | `/api/wallet/debit` | JWT | Debit wallet |
| POST | `/api/wallet/top-up` | JWT | Initiate top-up via payment |
| POST | `/api/wallet/holds` | JWT | Place a hold |
| POST | `/api/wallet/holds/:holdId/capture` | system JWT | Capture hold |
| POST | `/api/wallet/holds/:holdId/release` | JWT | Release hold |
| POST | `/api/wallet/freeze` | admin JWT | Freeze wallet (status) |
| POST | `/api/wallet/unfreeze` | admin JWT | Unfreeze wallet (status) |
| POST | `/api/wallet/payout` | JWT | Initiate payout |
| POST | `/api/wallet/reverse/:transactionId` | admin JWT | Reverse transaction |
| GET  | `/api/wallet/statement` | JWT | Transaction history |
| GET  | `/api/wallet/health/live` | none | Health check |

---

## 7. Events

| Event | Emitted by | Payload |
|---|---|---|
| `wallet.credited` | `CreditWalletUseCase` | `walletId, userId, amount, balanceAfter, transactionId` |
| `wallet.debited` | `DebitWalletUseCase` | `walletId, userId, amount, balanceAfter, transactionId` |
| `wallet.hold_placed` | `PlaceHoldUseCase` | `walletId, holdId, amount, reason, expiresAt` |
| `wallet.hold_captured` | `CaptureHoldUseCase` | `walletId, holdId, amount` |
| `wallet.hold_released` | `ReleaseHoldUseCase` | `walletId, holdId, amount` |
| `wallet.payout_initiated` | `InitiatePayoutFromWalletUseCase` | `walletId, payoutId, amount` |

Events consumed:
- `payment.completed` → `PaymentCompletedHandler` → credits wallet
- `user.registered` → `UserRegisteredHandler` → creates wallet for new user

---

## 8. Verification Evidence

| Artifact | What it proves |
|---|---|
| `domain/entities/__tests__/wallet.entity.test.ts` | Balance invariants, hold lifecycle, COD commitment |
| `domain/entities/__tests__/transaction.entity.test.ts` | Immutability, balance consistency per type, reversal |
| `application/use-cases/__tests__/credit-wallet.use-case.test.ts` | Credit + idempotency |
| `application/use-cases/__tests__/debit-wallet.use-case.test.ts` | Debit + velocity + limit checks |
| `application/sagas/__tests__/cod-settlement.saga.test.ts` | COD capture/release saga |
| E2E Postman P1 suite | Exact arithmetic: credit X → balance +X; debit X → balance -X; overdraft rejected |


---

## System Maintenance Routes

Mounted at `/api/wallet/system/maintenance`. Guards: `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/wallet/system/maintenance/cleanup/outbox/report` | Dry-run count of deletable wallet outbox events |
| POST | `/api/wallet/system/maintenance/cleanup/outbox` | Batched deletion of expired outbox events. Body: `{ "dryRun": true }` to simulate |

**Retention defaults:** sent/processed → 7 days, failed → 30 days. Batch size: 1000. Max runtime: 20 s.
