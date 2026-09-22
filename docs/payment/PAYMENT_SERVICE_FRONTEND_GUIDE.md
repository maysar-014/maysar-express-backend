# Payment Service — Frontend Integration Guide

> Mount path: `/api/payment`
> Last updated: September 2026 — includes major upgrade: dynamic payment method discovery, MIXX_BY_YAS rebrand, environment-driven method control, explicit failure codes.

---

## Critical Rule: Never Hard-Code Payment Methods

The set of available payment methods is **server-determined and environment-driven**. A method can be switched `off` or moved to `sandbox` by ops without a deployment. **Always fetch the list from the discovery endpoint before rendering the checkout payment screen.** Do not maintain a hard-coded list of methods in the frontend.

---

## Payment Method Discovery

### Get available payment methods
`GET /api/payment/payment-methods` — **no auth required**

Call this before rendering the payment options screen. The response is the authoritative list of what is currently operational.

```jsonc
// Response 200
{
  "success": true,
  "data": [
    { "code": "mpesa",         "name": "M-Pesa",        "type": "mobile_money",  "status": "live",    "available": true },
    { "code": "airtel_money",  "name": "Airtel Money",  "type": "mobile_money",  "status": "live",    "available": true },
    { "code": "mixx_by_yas",   "name": "Mixx by Yas",   "type": "mobile_money",  "status": "sandbox", "available": true },
    { "code": "halopesa",      "name": "HaloPesa",      "type": "mobile_money",  "status": "off",     "available": false },
    { "code": "card",          "name": "Card",          "type": "card",          "status": "off",     "available": false },
    { "code": "bank_transfer", "name": "Bank Transfer", "type": "bank_transfer", "status": "sandbox", "available": true },
    { "code": "wallet",        "name": "Wallet",        "type": "wallet",        "status": "live",    "available": true }
  ]
}
```

**Response fields:**

| Field | Values | Meaning |
|---|---|---|
| `code` | string (lowercase) | Use this as the `method` value when initiating a payment |
| `name` | string | Display label — use this in the UI, not the code |
| `type` | `mobile_money` \| `card` \| `bank_transfer` \| `wallet` | Category for grouping in the UI |
| `status` | `live` \| `sandbox` \| `off` | Operational environment |
| `available` | boolean | **The only field you need for rendering** — `true` means the method can accept transactions right now |

---

## Rendering Payment Options

### Mobile Money group

```
Show "Mobile Money" section only when:
  filtered_methods = methods where type === "mobile_money" AND available === true

If filtered_methods.length >= 1  →  show "Mobile Money" section listing each method
If filtered_methods.length === 0  →  hide "Mobile Money" section entirely (no stub, no disabled state)
```

Each available mobile money method is shown as a selectable option using `method.name` as the label.

### Other payment types

Apply the same rule: render a section only if `available === true` entries exist for that type.

| Type | Section label | Show condition |
|---|---|---|
| `mobile_money` | "Mobile Money" | `>= 1` available method of this type |
| `wallet` | "Maysar Wallet" | `>= 1` available method of this type |
| `card` | "Credit / Debit Card" | `>= 1` available method of this type |
| `bank_transfer` | "Bank Transfer" | `>= 1` available method of this type |

### Implementation pattern

```typescript
// Load once per checkout screen mount
const { data: methods } = await fetch('/api/payment/payment-methods').then(r => r.json());

const available = methods.filter(m => m.available);
const mobileMoney = available.filter(m => m.type === 'mobile_money');
const wallet     = available.filter(m => m.type === 'wallet');
const card       = available.filter(m => m.type === 'card');
const bank       = available.filter(m => m.type === 'bank_transfer');

// Render Mobile Money section only if mobileMoney.length > 0
// Use m.code (uppercase when POSTing) and m.name (for display)
```

---

## Provider Fees

Fees are server-calculated and deducted automatically. These are informational only — **never use for checkout total calculation**.

| Method | Provider fee | Platform fee | Total fee | Min amount (TZS) |
|---|---|---|---|---|
| `MPESA` | 1.5% | 2% | 3.5% | 500 |
| `AIRTEL_MONEY` | 1.5% | 2% | 3.5% | 500 |
| `MIXX_BY_YAS` | 1.5% | 2% | 3.5% | 500 |
| `HALOPESA` | 1.5% | 2% | 3.5% | 500 |
| `CARD` | 2.9% | 2% | 4.9% | 1,000 |
| `BANK_TRANSFER` | 1% | 2% | 3% | 1,000 |
| `WALLET` | 0% | 2% | 2% | 100 |

> **TIGO_PESA → MIXX_BY_YAS:** Tigo Pesa has been rebranded to "Mixx by Yas". The method code `TIGO_PESA` is deprecated — both are accepted by the server (normalized automatically), but all new code and UI should use `MIXX_BY_YAS` and display "Mixx by Yas".

---

## Payment Status Machine

```
PENDING → PROCESSING → COMPLETED → REFUNDED
                     → PARTIALLY_REFUNDED → REFUNDED
                     → FAILED
                     → CANCELLED
PENDING → FAILED
PENDING → CANCELLED
```

`FAILED` and `CANCELLED` are terminal — no further transitions allowed.

---

## Refund Policy

| Window | Refund amount |
|---|---|
| 0–7 days after payment | 100% of remaining amount |
| 8–14 days after payment | 80% of remaining amount |
| After 14 days | 0% — no refund |
| After 30 days | Window expired — `canRefund: false` |

`canRefund()` = `status === COMPLETED` or `PARTIALLY_REFUNDED` AND `refundedAmount < amount` AND within 30-day window.

---

## Fraud Scoring

Risk score is the sum of flag weights (capped at 100):

| Risk score | Risk level | Action |
|---|---|---|
| 0–29 | `low` | `approve` — proceed normally |
| 30–59 | `medium` | `approve` — logged internally |
| 60–79 | `high` | `review` — manual review required |
| ≥ 80 | `critical` | `decline` — auto-declined |

Flags: `high_frequency` (+25), `impossible_travel` (+40), `high_risk_device` (+30), `unusual_amount` (+15), `new_device` (+10), `unusual_time` (+8), `new_payment_method` (+12).

Never expose the risk score or individual flags to users. Show generic "Payment declined" message.

---

## Payment Limits

| Limit | Value |
|---|---|
| Single transaction max | TZS 5,000,000 |
| Daily total | TZS 10,000,000 |
| Monthly total | TZS 50,000,000 |

Per-method limits:

| Method | Min (TZS) | Max (TZS) | Daily limit (TZS) | Max tx/day |
|---|---|---|---|---|
| `MPESA` | 500 | 5,000,000 | 10,000,000 | 50 |
| `AIRTEL_MONEY` | 500 | 5,000,000 | 10,000,000 | 50 |
| `MIXX_BY_YAS` | 500 | 5,000,000 | 10,000,000 | 50 |
| `HALOPESA` | 500 | 5,000,000 | 10,000,000 | 50 |
| `WALLET` | 100 | 10,000,000 | 20,000,000 | 100 |
| `BANK_TRANSFER` | 1,000 | 50,000,000 | 50,000,000 | 20 |
| `CARD` | 1,000 | 20,000,000 | 20,000,000 | 30 |

### Supported currencies
`TZS`, `USD`, `EUR`, `GBP`, `KES`, `UGX`

---

## Route Reference

### Initiate payment
`POST /api/payment/payments` — requires auth

Use the `code` value from the discovery endpoint as the `method` field (send uppercase).

```jsonc
// Mobile money
{
  "orderId": "ORD-01J...",
  "amount": 33000,
  "currency": "TZS",
  "method": "MPESA",
  "metadata": { "phoneNumber": "+255712345678" }
}

// Wallet
{
  "orderId": "ORD-01J...",
  "amount": 33000,
  "currency": "TZS",
  "method": "WALLET"
}

// Card
{
  "orderId": "ORD-01J...",
  "amount": 33000,
  "currency": "TZS",
  "method": "CARD"
}
```

```jsonc
// Response 201
{
  "success": true,
  "data": {
    "paymentId": "pay_01J...",
    "status": "PENDING",
    "method": "MPESA",
    "amount": 33000,
    "environment": "LIVE",
    "providerReference": "SEL-12345"
  }
}
```

`environment` is `"LIVE"` or `"SANDBOX"` — show a sandbox badge in development/staging UIs.

### Get payment status
`GET /api/payment/payments/:paymentId`

```jsonc
{
  "success": true,
  "data": {
    "paymentId": "pay_01J...",
    "status": "COMPLETED",
    "method": "MPESA",
    "amount": 33000,
    "refundedAmount": 0,
    "environment": "LIVE",
    "failureCode": null,
    "failureReason": null,
    "completedAt": "2026-09-01T10:05:00Z",
    "providerTransactionId": "MPESA-ABC123"
  }
}
```

`failureCode` is populated on `FAILED` status. **Never show to user** — use generic failure message. See error codes section below.

### Get payment status (lightweight)
`GET /api/payment/payments/:id/status` — requires auth

Returns a slimmed-down status view without the full payment object:

```jsonc
{
  "success": true,
  "data": {
    "status": "COMPLETED",
    "amount": 33000,
    "currency": "TZS",
    "completedAt": "2026-09-01T10:05:00Z",
    "failureReason": null
  }
}
```

Use this for efficient polling instead of `GET /payments/:id` when you only need the status field.

### Get payment by order ID
`GET /api/payment/payments/order/:orderId`

Returns the payment record for a given order. If no payment record exists (e.g. wallet-deferred or direct orders), returns **200** with a synthesized stub:

```jsonc
{
  "success": true,
  "data": {
    "orderId": "ORD-01J...",
    "status": "cancelled",
    "paymentMethod": "WALLET",
    "message": "Order was paid via wallet debit — no payment service record exists"
  }
}
```

This is not an error — it means the order was fulfilled through a path that doesn't create a payment-service record (e.g. internal wallet debit). Do not treat `status: "cancelled"` here as a payment failure.

### Refund payment
`POST /api/payment/payments/:paymentId/refund`

```jsonc
{ "amount": 33000, "reason": "Order cancelled by seller" }
```

### Block transaction (admin)
`POST /api/payment/payments/:paymentId/block`

### Flag transaction (admin)
`POST /api/payment/payments/:paymentId/flag`

### Webhook endpoints (server-to-server only)
```
POST /api/payment/payments/webhooks/payment-gateway
```
Called by payment providers (Selcom) — not by frontend.

---

## Payment Method Flows

### Mobile money (MPESA, AIRTEL_MONEY, MIXX_BY_YAS, HALOPESA)
```
POST /payments  →  status: PENDING
User receives USSD push on phone
User approves on phone
Provider webhook → payment.completed event
GET /payments/:id  →  status: COMPLETED
```
Poll every **3 seconds** for up to **3 minutes** (60 attempts max).
After 3 minutes: show "Payment timed out" with retry option.
**Stop polling when:** `status` is `COMPLETED`, `FAILED`, or `CANCELLED`.

### Wallet
```
POST /payments (method: WALLET)  →  status: COMPLETED immediately
```
No polling needed. Show success on 201 response.

### Card
```
POST /payments (method: CARD)  →  { redirectUrl: "https://..." }
Redirect user to card gateway
Gateway redirects back with result
GET /payments/:id  →  confirm final status (poll once — not a loop)
```

### Bank transfer
Async — user makes manual bank transfer. Poll `GET /payments/:id` every **30 seconds** until terminal status.
**Stop polling when:** `status` is `COMPLETED`, `FAILED`, or `CANCELLED`.

---

## Status Display Mapping

| Status | Display | Color | Next action |
|---|---|---|---|
| `PENDING` | Awaiting payment | yellow | Poll / wait |
| `PROCESSING` | Processing | blue | Poll |
| `COMPLETED` | Payment successful | green | Proceed to order tracking |
| `FAILED` | Payment failed | red | Show generic message, offer retry |
| `CANCELLED` | Cancelled | gray | Offer retry |
| `REFUNDED` | Fully refunded | blue | Show refund details |
| `PARTIALLY_REFUNDED` | Partially refunded | blue | Show `refundedAmount` |

---

## Refund Timeline by Method

| Method | Timeline |
|---|---|
| `WALLET` | Instant |
| Mobile money | 1–3 business days |
| `CARD` | 5–10 business days |
| `BANK_TRANSFER` | 3–7 business days |

---

## Error Codes

| Code | HTTP | Meaning | UI action |
|---|---|---|---|
| `METHOD_DISABLED` | 409 | Method is set to `off` in ops config | Refresh payment methods, remove option |
| `METHOD_MISCONFIGURED` | 503 | Live method credentials incomplete (ops issue) — sandbox methods are credential-free and never return this | Show "method temporarily unavailable", hide option |
| `METHOD_NOT_FOUND` | 404 | Unknown method code sent | Check discovery endpoint, use correct code |
| `PAYMENT_DECLINED` | 402 | Fraud score triggered auto-decline | Show generic "Payment declined" message |
| `PAYMENT_FAILED` | 400 | Generic provider failure | Show `failureReason` if safe, offer retry |
| `PAYMENT_EXPIRED` | 408 | Mobile money not approved in time | Show "Payment timed out", offer retry |
| `DUPLICATE_PAYMENT` | 409 | Payment for this order already exists | Navigate to existing payment status |
| `INSUFFICIENT_WALLET_BALANCE` | 400 | Wallet balance too low | Show current balance, suggest top-up |
| `INVALID_PHONE_NUMBER` | 400 | Phone number format invalid | Highlight phone field |
| `REFUND_EXCEEDS_AMOUNT` | 400 | Refund amount > refundable amount | Show max refundable amount |
| `PAYMENT_NOT_REFUNDABLE` | 400 | Outside refund window or wrong status | Show refund policy |
| `EXCEEDS_TRANSACTION_LIMIT` | 400 | Amount exceeds per-method max | Show limit for selected method |
| `EXCEEDS_DAILY_LIMIT` | 400 | Daily limit reached | Show reset time |
| `UNSUPPORTED_CURRENCY` | 400 | Currency not supported | Switch to TZS |

## Sandbox methods behave exactly like real ones

A method in `sandbox` mode returns `available: true` **without any provider credentials** — the payment service runs the complete payment flow (initiation, provider reference, callback/webhook, status update, order sync) against its in-service simulator. From the buyer's perspective nothing changes:

- The method appears, is selectable, and processes normally.
- Status polling works the same as live (`PROCESSING` → `COMPLETED` / `FAILED` / `CANCELLED`).
- The only visible difference is the `environment: "SANDBOX"` badge in non-production UIs (see §Payment Response).
- Sandbox transactions can never become live: provider references are `sbx_`-prefixed and resolved by the sandbox ledger.

---

## Admin Endpoint

### Get payment method configuration status (admin/ops only)
`GET /api/payment/admin/payment-methods` — requires `admin` or `system` role

```jsonc
{
  "success": true,
  "data": [
    {
      "code": "mpesa",
      "name": "M-Pesa",
      "type": "mobile_money",
      "provider": "selcom",
      "environment": "live",
      "operationalStatus": "operational",
      "configurationStatus": "configured",
      "missingKeys": [],
      "credentialsPresent": { "API_KEY": true, "MERCHANT_CODE": true, "BASE_URL": true },
      "lastValidatedAt": "2026-09-06T10:00:00Z"
    },
    {
      "code": "halopesa",
      "name": "HaloPesa",
      "type": "mobile_money",
      "provider": "selcom",
      "environment": "sandbox",
      "operationalStatus": "operational",
      "configurationStatus": "not_required",
      "missingKeys": [],
      "credentialsPresent": { "API_KEY": false, "MERCHANT_CODE": false, "BASE_URL": false },
      "lastValidatedAt": "2026-09-13T10:00:00Z"
    },
    {
      "code": "card",
      "name": "Card",
      "type": "card",
      "provider": "selcom",
      "environment": "live",
      "operationalStatus": "configuration_error",
      "configurationStatus": "missing_credentials",
      "missingKeys": [
        "PAYMENT_SELCOM_LIVE_API_KEY",
        "PAYMENT_SELCOM_LIVE_MERCHANT_CODE",
        "PAYMENT_SELCOM_LIVE_BASE_URL"
      ],
      "credentialsPresent": { "API_KEY": false, "MERCHANT_CODE": false, "BASE_URL": false },
      "lastValidatedAt": "2026-09-13T10:00:00Z"
    }
  ],
  "meta": {
    "misconfiguredCodes": ["card"],
    "misconfiguredCount": 1
  }
}
```

`operationalStatus` values:
- `operational` — method is enabled and its required configuration is present. `sandbox` requires **no credentials** (simulated provider); `live` requires the complete live credential set
- `disabled` — method is `off`
- `configuration_error` — method is `live` but credentials are missing/invalid (sandbox can never be in this state)

**Credential values are never returned** — only presence booleans (`credentialsPresent`).

---

## Integration Checklist

- [ ] Fetch `/api/payment/payment-methods` on checkout screen mount — never use a hard-coded list
- [ ] Render Mobile Money section only when `>= 1` method with `type === "mobile_money"` and `available === true` exists
- [ ] Render each section (mobile money, wallet, card, bank) only if at least one available method of that type exists
- [ ] Use `m.code` (uppercase) as the `method` value in `POST /payments` — use `m.name` for display
- [ ] Display "Mixx by Yas" (not "Tigo Pesa") in UI — use the `name` field from discovery endpoint
- [ ] Show `environment: "SANDBOX"` badge in non-production UI
- [ ] On `METHOD_DISABLED` (409) or `METHOD_MISCONFIGURED` (503): refresh the method list and hide the affected option
- [ ] On mobile money: poll every 3s, max 3 minutes (60 polls), stop on `COMPLETED` / `FAILED` / `CANCELLED`
- [ ] On bank transfer: poll every 30s, stop on terminal status
- [ ] Wallet: no polling needed — show success immediately on 201
- [ ] Never expose `failureCode` to users — it's for ops/debugging only
- [ ] Never calculate total from provider fees in the UI — always display server-returned amounts


---

## System Maintenance (internal/ops)

These endpoints are for ops/admin use only. They are not called from the frontend.

```
POST /api/payment/system/maintenance/cleanup/outbox/report
POST /api/payment/system/maintenance/cleanup/outbox
```

**Auth:** `requireRoleOrService(['admin','system'])` **and** `x-service-key` header.

### Outbox cleanup report
`POST /api/payment/system/maintenance/cleanup/outbox/report` → **200** — dry-run count of deletable outbox events.

### Outbox cleanup
`POST /api/payment/system/maintenance/cleanup/outbox` → **200** — batched deletion. Body: `{ "dryRun": true }` to simulate. `maxRuntimeMs` defaults to 20 seconds.
