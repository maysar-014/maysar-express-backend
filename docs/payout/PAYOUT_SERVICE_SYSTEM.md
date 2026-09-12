# Maysar Payout Service — Implementation Reference (As-Built)

> **Status:** Live and verified — seller/enabler/courier payouts, bank transfer, mobile money, payout scheduling.
> **Last updated:** September 2026
> **Scope:** `services/payout-service`

---

## 1. Guiding Principles

| Principle | Where it lives |
|---|---|
| **Payouts are initiated from wallet** | `InitiatePayoutFromWalletUseCase` in wallet-service debits wallet → calls payout-service |
| **Payout methods match payment methods** | MPESA, Airtel Money, Tigo Pesa, HaloPesa, bank transfer |
| **Payouts are idempotent** | Duplicate payout requests with same idempotency key return original result |
| **Payout status is tracked** | `PENDING → PROCESSING → COMPLETED | FAILED | REVERSED` |
| **Minimum payout threshold enforced** | Configurable per method; prevents micro-payouts |

---

## 2. Payout Methods

| Method | Min amount | Processing time |
|---|---|---|
| MPESA | TZS 1,000 | Instant–5 min |
| Airtel Money | TZS 1,000 | Instant–5 min |
| Tigo Pesa | TZS 1,000 | Instant–5 min |
| HaloPesa | TZS 1,000 | Instant–5 min |
| Bank Transfer | TZS 10,000 | 1–3 business days |

---

## 3. Application Layer

| Use case | What it does |
|---|---|
| `InitiatePayoutUseCase` | Validates amount + method → routes to provider |
| `CheckPayoutStatusUseCase` | Polls provider for status update |
| `ReversePayoutUseCase` | Admin-initiated reversal on failed delivery |
| `GetPayoutHistoryUseCase` | Paginated payout history |
| `SchedulePayoutUseCase` | Scheduled weekly/monthly payout runs |

---

## 4. HTTP Surface

Mounted at `/api/payout` (module name `payout-service` → strip `-service` → `/api/payout`).

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/payout/payouts` | system/user JWT | Initiate payout |
| GET  | `/api/payout/payouts/:payoutId` | JWT | Payout status |
| GET  | `/api/payout/payouts` | JWT | Payout history |
| POST | `/api/payout/payouts/:payoutId/cancel` | JWT | Cancel pending payout |
| POST | `/api/payout/payouts/:payoutId/reverse` | admin JWT | Admin-initiated reversal |
| GET  | `/api/payout/health` | none | Health check |

---

## 5. Frontend Integration Guide

### Payout history

`GET /api/payout/payouts?limit=20&cursor=...`

```jsonc
{
  "data": {
    "payouts": [
      {
        "payoutId": "pyt_01...",
        "amount": 150000,
        "method": "MPESA",
        "status": "COMPLETED",
        "phoneNumber": "+255712***678",
        "completedAt": "2026-09-01T14:30:00Z"
      }
    ]
  }
}
```

Note: phone numbers are masked in responses — show last 3 digits only.

### Payout status display

| Status | Display |
|---|---|
| `PENDING` | Processing |
| `PROCESSING` | Sending to provider |
| `COMPLETED` | Paid |
| `FAILED` | Failed — contact support |
| `REVERSED` | Reversed |

### Integration checklist

- [ ] Show payout history in seller/enabler/courier earnings section
- [ ] Display masked phone number for mobile money payouts
- [ ] Show processing time estimate based on method
- [ ] Handle `FAILED` status with support contact CTA
- [ ] Sellers can configure preferred payout method in profile settings
