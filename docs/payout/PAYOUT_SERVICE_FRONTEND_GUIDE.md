# Payout Service — Frontend Integration Guide

> Audience: Client app engineers (seller portal, courier app, enabler dashboard, admin panel)
> Mount path: `/api/payout` → payout routes at `/api/payout/payouts`

---

## 1. What the Payout Service Does

Transfers earned funds to sellers, couriers, enablers, and suppliers via bank transfer, mobile money, or wallet. Payouts require **KYC level 2** (identity verified). The service enforces a minimum payout amount, a minimum remaining balance, a weekly schedule, and fee deductions before any transfer is processed.

```
Seller requests payout → KYC gate (level 2) → policy checks → PENDING
→ processing saga → PROCESSING → COMPLETED | FAILED
```

**Buyers cannot request payouts.** The server rejects any payout request where `userRole === 'buyer'` with a 400 error.

---

## 2. Service at a Glance

| Aspect | Detail |
|--------|--------|
| Mount path | `/api/payout` |
| Payout routes | `/api/payout/payouts` |
| Auth | `requireAuth` + role check on initiate |
| Eligible roles | `seller`, `supplier`, `courier`, `enabler`, `system` |
| KYC gate | Level 2 required for `POST /payouts` |
| Minimum payout | TZS 10,000 |
| Minimum balance after payout | TZS 1,000 must remain in wallet |
| Default schedule | Weekly (Fridays) |
| Error envelope | `{ success: false, error: { code, message }, timestamp }` |

---

## 3. Authentication & Roles

| Endpoint | Auth | Roles |
|----------|------|-------|
| `POST /api/payout/payouts` | JWT + KYC level 2 | seller, supplier, courier, enabler, system |
| `GET /api/payout/payouts` | JWT | own payouts (admin sees all) |
| `GET /api/payout/payouts/:id` | JWT | own payout |
| `POST /api/payout/payouts/:id/cancel` | JWT | own payout (PENDING only) |

**KYC gate:** If the user has not completed identity verification (KYC level 2), `POST /payouts` returns **403** with `KYC_LEVEL_REQUIRED`. Redirect to the KYC verification flow before showing the payout form.

---

## 4. Core Domain Objects

```
Payout
  ├── id
  ├── userId + userRole
  ├── amount          ← gross amount requested
  ├── fee             ← deducted from amount
  ├── netAmount       ← amount - fee (what user actually receives)
  ├── currency (TZS)
  ├── method: BANK_TRANSFER | MOBILE_MONEY | WALLET
  ├── status: PENDING → PROCESSING → COMPLETED | FAILED | CANCELLED
  ├── reference       ← provider transfer ID, set on COMPLETED
  ├── failureReason   ← set on FAILED
  ├── processedAt, completedAt, failedAt
  ├── bankDetails     ← required when method = BANK_TRANSFER
  └── mobileMoneyDetails ← required when method = MOBILE_MONEY
```

### Payout status machine

```
PENDING → PROCESSING → COMPLETED
        → FAILED          (from PENDING or PROCESSING — system retries automatically)
        → CANCELLED       (only from PENDING — user-initiated)
COMPLETED → REVERSED      (admin-initiated reversal only)
```

**Critical for UI:** `FAILED` can come from either `PENDING` or `PROCESSING`. The system retries automatically. Never show a permanent error for `FAILED` — show "processing" and poll until `COMPLETED` or the user explicitly cancels.

`REVERSED` is set by admin after a completed payout is recalled (e.g. fraud or error). Show "Reversed — contact support" with a support link.

---

## 5. Payout Fees (from PayoutPolicy + Payout entity)

The fee is deducted from the gross amount. The user receives `netAmount = amount - fee`.

| Method | Fee rate | Min fee (TZS) | Max fee (TZS) |
|--------|----------|---------------|---------------|
| `BANK_TRANSFER` | 1% | 500 | 10,000 |
| `MOBILE_MONEY` | 1.5% | 300 | 5,000 |
| `WALLET` | 0% | 0 | 0 |

**Always show the fee and net amount before the user confirms.** Example: TZS 50,000 bank transfer → fee = max(50,000 × 0.01, 500) = TZS 500 → user receives TZS 49,500.

---

## 6. Policy Rules (all enforced server-side — from PayoutPolicy)

The server checks all of these before accepting a payout request. Show them in the UI proactively:

| Rule | Value | Error when violated |
|------|-------|---------------------|
| Minimum payout amount | TZS 10,000 | `BELOW_MINIMUM_AMOUNT` |
| Minimum remaining balance | TZS 1,000 must stay in wallet | `MINIMUM_BALANCE_REQUIRED` |
| Sufficient balance | `amount ≤ availableBalance` | `INSUFFICIENT_BALANCE` |
| Role eligibility | Not `buyer` | `BUYER_NOT_ELIGIBLE` |
| User status | Must be `ACTIVE` or `VERIFIED` | `USER_STATUS_INELIGIBLE` |
| Weekly schedule | 7 days since last payout | `PAYOUT_SCHEDULE_RESTRICTION` (includes `nextPayoutDate`) |

---

## 7. API Reference

### 7.1 Initiate a payout
`POST /api/payout/payouts` → **201**

**Bank transfer:**
```jsonc
{
  "amount": 50000,
  "currency": "TZS",
  "method": "BANK_TRANSFER",
  "bankDetails": {
    "bankName": "CRDB Bank",
    "bankCode": "CRDB",
    "accountNumber": "01501234567890",
    "accountName": "John Doe",
    "branchCode": "001"
  }
}
```

**Mobile money:**
```jsonc
{
  "amount": 25000,
  "currency": "TZS",
  "method": "MOBILE_MONEY",
  "mobileMoneyDetails": {
    "provider": "M-Pesa",
    "phoneNumber": "+255712345678",
    "accountName": "John Doe"
  }
}
```

**Validation rules (server-enforced):**
- `bankDetails.accountNumber` must be 10–20 digits
- `mobileMoneyDetails.phoneNumber` must match `(+255|255|0)[67][0-9]{8}`
- `bankDetails` required when `method = BANK_TRANSFER`
- `mobileMoneyDetails` required when `method = MOBILE_MONEY`

Response:
```jsonc
{
  "success": true,
  "data": {
    "id": "pay_01J...",
    "amount": 50000,
    "fee": 500,
    "netAmount": 49500,
    "currency": "TZS",
    "method": "BANK_TRANSFER",
    "status": "PENDING",
    "createdAt": "2026-09-06T10:00:00Z"
  }
}
```

### 7.2 List payouts
`GET /api/payout/payouts?limit=20&cursor=...` → **200**

```jsonc
{
  "success": true,
  "data": [
    {
      "id": "pay_01J...",
      "amount": 50000,
      "fee": 500,
      "netAmount": 49500,
      "currency": "TZS",
      "method": "BANK_TRANSFER",
      "status": "COMPLETED",
      "reference": "CRDB-TXN-12345",
      "createdAt": "2026-09-06T10:00:00Z",
      "completedAt": "2026-09-06T10:05:00Z"
    }
  ],
  "pagination": { "cursor": "...", "hasMore": false }
}
```

### 7.3 Get a single payout
`GET /api/payout/payouts/:id` → **200**

On `FAILED`, includes `failureReason`. On `COMPLETED`, includes `reference` (provider transfer ID to show as confirmation number).

### 7.4 Cancel a payout
`POST /api/payout/payouts/:id/cancel` → **200**

```jsonc
{ "reason": "Entered wrong account number" }
```

Only allowed when `status === 'PENDING'`. Returns 422 if the payout has moved to `PROCESSING`.

---

## 8. Error Codes

| Code | HTTP | Meaning | UI action |
|------|------|---------|-----------|
| `UNAUTHORIZED` | 401 | No/expired JWT | Re-login |
| `KYC_LEVEL_REQUIRED` | 403 | KYC level 2 not completed | Redirect to KYC flow |
| `BUYER_NOT_ELIGIBLE` | 400 | Buyer role cannot payout | Hide payout feature entirely |
| `INSUFFICIENT_BALANCE` | 400 | `amount > availableBalance` | Show current balance |
| `MINIMUM_BALANCE_REQUIRED` | 400 | Would leave < TZS 1,000 | Show "TZS 1,000 must remain" |
| `BELOW_MINIMUM_AMOUNT` | 400 | `amount < TZS 10,000` | Show minimum amount |
| `PAYOUT_SCHEDULE_RESTRICTION` | 400 | Too soon since last payout | Show `nextPayoutDate` from error body |
| `USER_STATUS_INELIGIBLE` | 400 | Account suspended/inactive | Show account status message |
| `INVALID_STATUS_TRANSITION` | 422 | Cancelling non-PENDING payout | Refresh, disable cancel |
| `PAYOUT_NOT_FOUND` | 404 | Invalid payout ID | Show "not found" |
| `VALIDATION_ERROR` | 400 | Missing/invalid fields | Highlight fields |
| `INTERNAL_SERVER_ERROR` | 500 | Server failure | Retry with backoff |

---

## 9. UX Patterns

**Payout request form — show before submit:**
1. Fetch `availableBalance` from wallet-service.
2. Show: minimum payout (TZS 10,000), available balance, fee preview (calculate client-side using fee table in section 5), net amount the user will receive.
3. Show `nextPayoutDate` if the user has already paid out this week — disable the form until that date.
4. Dynamically show `bankDetails` or `mobileMoneyDetails` fields based on selected `method`.
5. On submit → `POST /payouts` → show "Payout requested" with payout ID.

**Payout history list:**
- Show `netAmount` (what they received), not `amount` (gross).
- Show `reference` on `COMPLETED` rows as the transfer confirmation number.
- Color-code: `PENDING` = yellow, `PROCESSING` = blue, `COMPLETED` = green, `FAILED` = orange (not red — may auto-retry), `CANCELLED` = grey, `REVERSED` = purple (contact support).
- Show cancel button only for `PENDING` payouts.

**Polling while PROCESSING:**
- Poll `GET /payouts/:id` every 10s.
- Stop on `COMPLETED`, `FAILED` (after 3 retries), or `CANCELLED`.

**Integration checklist:**
- [ ] Gate the payout form behind KYC level 2 check
- [ ] Hide payout feature entirely for `buyer` role
- [ ] Show fee and `netAmount` preview before user confirms
- [ ] Show `nextPayoutDate` when `PAYOUT_SCHEDULE_RESTRICTION` is returned
- [ ] Display `netAmount` in history, not gross `amount`
- [ ] Show `reference` as confirmation number on completed payouts
- [ ] Poll `GET /payouts/:id` every 10s while `PROCESSING`
- [ ] Validate phone number format client-side: `(+255|255|0)[67][0-9]{8}`
- [ ] Validate account number: 10–20 digits only

---

## 10. Route Map

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/payout/payouts` | JWT + KYC L2 | Initiate payout |
| GET | `/api/payout/payouts` | JWT | List payouts |
| GET | `/api/payout/payouts/:id` | JWT | Get payout detail |
| POST | `/api/payout/payouts/:id/cancel` | JWT | Cancel payout (PENDING only) |
| POST | `/api/payout/payouts/:id/reverse` | JWT (admin) | Admin reversal of COMPLETED payout |
