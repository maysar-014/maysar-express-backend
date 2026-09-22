# Wallet Service — Frontend Integration Guide

> Mount path: `/api/wallet`

---

## Business Rules (from domain code)

### WalletStatus enum
`ACTIVE` | `FROZEN` | `SUSPENDED` | `CLOSED`

### Available balance
```
availableBalance = balance - frozenAmount
```
Always display `availableBalance` to users. `balance` includes frozen funds the user cannot spend.

### canDebit() conditions
- `status === ACTIVE`
- `amount > 0`
- `availableBalance >= amount`

### Wallet close rules
- Cannot close with `frozenAmount > 0`
- Cannot close with `balance > 0`

### Hold status machine (HoldEntity)
```
ACTIVE → RELEASED   (manual release — funds returned to available)
ACTIVE → CAPTURED   (funds spent — deducted from balance and frozenAmount)
ACTIVE → EXPIRED    (TTL elapsed — funds returned to available)
```
`isExpired()` = `status === ACTIVE && now > expiresAt`
`isActive()` = `status === ACTIVE && !isExpired()`

Cannot release, capture, or extend a non-ACTIVE hold.

### LimitPolicy error codes (wallet-limit.policy.ts)

| Condition | Error code |
|---|---|
| `amount > singleTransactionMax` | `EXCEEDS_SINGLE_TRANSACTION_LIMIT` |
| `projectedBalance < minimumBalance` | `INSUFFICIENT_FUNDS_MIN_BALANCE` |
| `dailyCount >= dailyTransactionCount` | `EXCEEDS_DAILY_COUNT_LIMIT` |
| `dailyTotal + amount > dailyTransactionAmount` | `EXCEEDS_DAILY_AMOUNT_LIMIT` |
| `monthlyTotal + amount > monthlyTransactionAmount` | `EXCEEDS_MONTHLY_AMOUNT_LIMIT` |
| `newFrozenRatio > maxFrozenRatio` | `EXCEEDS_MAX_FROZEN_RATIO` |

### VelocityCheckPolicy decisions

| Risk score | Decision |
|---|---|
| 0–19 | `ALLOW` |
| 20–49 | `ALLOW` (MEDIUM risk — logged) |
| 50–79 | `CHALLENGE` — OTP required |
| 80–100 | `BLOCK` |

Velocity flags that raise score:
- `HIGH_FREQUENCY_MINUTE` (+50)
- `HIGH_FREQUENCY_HOUR` (+30)
- `HIGH_AMOUNT_VELOCITY` (+40)
- `SUSPICIOUS_REPETITION` (+60) — same amount repeated ≥ threshold times in 1 hour

### COD commitment fields
```
codCommitmentLimit  — tier's maximum COD exposure
codCommitmentUsed   — sum of active COD orders
codCommitmentCount  — number of active COD orders
```
`useCODCommitment()` throws if `amount > (codCommitmentLimit - codCommitmentUsed)`.

---

## Route Reference

> All wallet endpoints require `/:userId` in the path. The service uses `AuthorizationMiddleware.authorizeWalletAccess()` to verify the authenticated user matches the `:userId` param (or is an admin). The `userId` is the user's ID (e.g. `usr_01J…`).

### Get wallet balance
```
GET /api/wallet/:userId/balance
```

```jsonc
{
  "success": true,
  "data": {
    "walletId": "wlt_01J...",
    "balance": 50000,
    "frozenAmount": 20000,
    "availableBalance": 30000,
    "currency": "TZS",
    "status": "ACTIVE",
    "codCommitmentLimit": 30000,
    "codCommitmentUsed": 15000,
    "codCommitmentCount": 1,
    "version": 5
  }
}
```

### Get full wallet object
```
GET /api/wallet/:userId
```
Returns the full wallet record. Use `/:userId/balance` for balance-only reads.

### Top-up wallet
```
POST /api/wallet/:userId/topup
```
```jsonc
{ "amount": 50000, "paymentMethod": "MPESA", "phoneNumber": "+255712345678" }
```
Roles: `buyer`, `seller`, `admin`, `system` only. Returns `{ paymentId, status: "PENDING" }`. Poll `GET /api/wallet/:userId/balance` every 3 seconds for up to 2 minutes. Idempotency key auto-generated from `(userId, amount, method, 5s window)` if not provided.

### Debit wallet
```
POST /api/wallet/:userId/debit
X-Idempotency-Key: <uuid-v4>
```
```jsonc
{
  "amount": 15000,
  "description": "Payment for order ORD-01J...",
  "referenceType": "ORDER",
  "referenceId": "ORD-01J...",
  "reason": "ORDER_PAYMENT"
}
```
Always include `X-Idempotency-Key`. Retry with the same key on network failure.

### Transaction history
```
GET /api/wallet/:userId/statement?limit=20&cursor=...&from=2026-01-01&to=2026-09-30
```
Also aliased at `GET /api/wallet/:userId/transactions` (same handler, same params).

```jsonc
{
  "success": true,
  "data": {
    "transactions": [
      {
        "id": "txn_01J...",
        "type": "CREDIT",
        "amount": 50000,
        "balanceBefore": 0,
        "balanceAfter": 50000,
        "description": "Wallet top-up",
        "createdAt": "2026-09-01T10:00:00Z",
        "referenceType": "PAYMENT",
        "referenceId": "pay_01J..."
      }
    ],
    "nextCursor": "...",
    "hasMore": true
  }
}
```

### Holds
```
GET  /api/wallet/:userId/holds
GET  /api/wallet/:userId/holds/:holdId
POST /api/wallet/:userId/hold/:holdId/release
POST /api/wallet/:userId/hold/:holdId/capture
```

Place a hold:
```
POST /api/wallet/:userId/hold
X-Idempotency-Key: <uuid-v4>
```

### Freeze / unfreeze funds
```
POST /api/wallet/:userId/freeze
POST /api/wallet/:userId/unfreeze
```

### Payout (enabler only, KYC level 2 required)
```
POST /api/wallet/:userId/payout
GET  /api/wallet/:userId/payout
```

---

### Transaction reversal (admin only)

```
POST /api/wallet/:userId/transaction/:transactionId/reverse
Authorization: Bearer <adminJWT>
X-Idempotency-Key: <uuid-v4>
```

> ⚠️ The reversal path is `/:userId/transaction/:transactionId/reverse` — not `/reverse/:transactionId`. Both `:userId` and `:transactionId` are required.

Reverses a completed transaction. Creates a mirror transaction (e.g. a `DEBIT` creates a `CREDIT` reversal). Frontend should handle a `REFUND`-type transaction appearing in the statement after an admin reversal — this is expected behavior, not an error.

---

## Events

The wallet service emits the following events (subscribed by notification-service and other consumers):

| Event | When | Key payload |
|---|---|---|
| `wallet.credited` | After any credit | `walletId, userId, amount, balanceAfter, transactionId` |
| `wallet.debited` | After any debit | `walletId, userId, amount, balanceAfter, transactionId` |
| `wallet.hold_placed` | Hold created | `walletId, holdId, amount, reason, expiresAt` |
| `wallet.hold_captured` | Hold captured | `walletId, holdId, amount` |
| `wallet.hold_released` | Hold released | `walletId, holdId, amount` |
| `wallet.payout_initiated` | Payout started | `walletId, payoutId, amount` |

**COD settlement note:** When a COD order is delivered, the system automatically captures the wallet hold for the delivery fee commitment via `CODSettlementSaga`. When the order is cancelled, the hold is released. No frontend action is needed for either case — the wallet balance updates automatically and can be observed via the statement endpoint.

## Transaction type display labels

| Type | Display label |
|---|---|
| `CREDIT` | Money received |
| `DEBIT` | Payment made |
| `FREEZE` | Funds reserved |
| `UNFREEZE` | Reservation released |
| `DEBIT_FROZEN` | Reserved funds captured |
| `REFUND` | Refund received |
| `PAYOUT` | Withdrawal |
| `TRANSFER_IN` | Transfer received |
| `TRANSFER_OUT` | Transfer sent |

---

## Hold display rules

| Hold status | Display | Balance impact |
|---|---|---|
| `ACTIVE` | "Reserved" in frozen breakdown | Reduces `availableBalance` |
| `CAPTURED` | Completed debit transaction | Permanently deducted |
| `RELEASED` | "Reservation released" | Returned to `availableBalance` |
| `EXPIRED` | "Reservation expired" | Returned to `availableBalance` |

---

## Error codes

| Code | HTTP | Meaning |
|---|---|---|
| `INSUFFICIENT_FUNDS` | 400 | `availableBalance < amount` |
| `INSUFFICIENT_FUNDS_MIN_BALANCE` | 400 | Would leave balance below minimum |
| `WALLET_FROZEN` | 403 | Wallet status is FROZEN |
| `WALLET_SUSPENDED` | 403 | Wallet status is SUSPENDED |
| `WALLET_CLOSED` | 403 | Wallet status is CLOSED |
| `EXCEEDS_SINGLE_TRANSACTION_LIMIT` | 400 | Single tx cap exceeded |
| `EXCEEDS_DAILY_AMOUNT_LIMIT` | 400 | Daily amount limit reached |
| `EXCEEDS_DAILY_COUNT_LIMIT` | 400 | Daily transaction count limit reached |
| `EXCEEDS_MONTHLY_AMOUNT_LIMIT` | 400 | Monthly limit reached |
| `EXCEEDS_MAX_FROZEN_RATIO` | 400 | Too much of balance already frozen |
| `VELOCITY_CHALLENGE` | 428 | OTP required — velocity risk score 50–79 |
| `VELOCITY_BLOCKED` | 429 | Transaction blocked — velocity risk score ≥ 80 |
| `DUPLICATE_IDEMPOTENCY_KEY` | 200 | Idempotent replay — returns original result |
| `HOLD_NOT_FOUND` | 404 | Hold ID invalid or already processed |


---

## System Maintenance (internal/ops)

These endpoints are for ops/admin use only. They are not called from the frontend.

```
POST /api/wallet/system/maintenance/cleanup/outbox/report
POST /api/wallet/system/maintenance/cleanup/outbox
```

**Auth:** `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

### Outbox cleanup report
`POST /api/wallet/system/maintenance/cleanup/outbox/report` → **200** — dry-run count of deletable outbox events.

### Outbox cleanup
`POST /api/wallet/system/maintenance/cleanup/outbox` → **200** — batched deletion. Body: `{ "dryRun": true }` to simulate. `maxRuntimeMs` defaults to 20 seconds.
