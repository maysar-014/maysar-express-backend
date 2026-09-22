# Payment Service — Admin & Operations Guide

> Audience: Ops engineers, platform admins, and payment-service maintainers
> All admin endpoints require `Authorization: Bearer <adminJWT>` with `admin` or `system` role
> Mount path: `/api/payment`

---

## 1. Overview

The payment service treats each of the 7 payment methods as an independent channel with its own environment (`sandbox | live | off`) and its own configuration. This guide covers everything an operator needs to:

1. **Inspect** the operational state of every method (admin API + startup report)
2. **Configure** methods through environment variables (declared & validated)
3. **Enable / test / disable / cut over** individual methods without a frontend release
4. **Run sandbox testing** against the built-in payment simulator
5. **Stay safe** with production credentials

The **backend is the source of truth.** Buyers see only what the discovery endpoint returns; the frontend never hard-codes methods.

---

## 2. Operational States

Every method is always in exactly one state:

| State | Meaning | Buyer visibility | Backend behavior |
|---|---|---|---|
| `sandbox` | Powered by the in-service simulator (no credentials needed) | Shown (`available: true`) | Full lifecycle: initiation → callback → verify → state sync → notification |
| `live` | Real provider (Selcom) with strictly required live credentials | Shown (`available: true`) | Real transactions; `METHOD_MISCONFIGURED` if credentials incomplete |
| `off` | Completely disabled | Hidden (`available: false`) | Rejected at the availability gate; no transaction can start |

**Rules that are enforced by code, not by convention:**
- Sandbox never requires credentials and never uses live credentials.
- Live never falls back to sandbox/development/hard-coded/other-provider credentials. An incomplete `live` configuration is **non-operational** (`configuration_error`).
- A sandbox transaction (`sbx_`-prefixed) is verified against the sandbox ledger and can never silently become a live transaction.

---

## 3. Inspect Operational State

### 3.1 Admin API
`GET /api/payment/admin/payment-methods` → **200** (admin/system JWT required)

```jsonc
{
  "success": true,
  "data": [
    {
      "code": "mpesa", "name": "M-Pesa", "type": "mobile_money", "provider": "selcom",
      "environment": "live", "operationalStatus": "operational",
      "configurationStatus": "configured", "missingKeys": [],
      "credentialsPresent": { "API_KEY": true, "MERCHANT_CODE": true, "BASE_URL": true },
      "lastValidatedAt": "2026-09-13T10:00:00Z"
    },
    {
      "code": "halopesa", "name": "HaloPesa", "type": "mobile_money", "provider": "selcom",
      "environment": "sandbox", "operationalStatus": "operational",
      "configurationStatus": "not_required", "missingKeys": [],
      "credentialsPresent": { "API_KEY": false, "MERCHANT_CODE": false, "BASE_URL": false },
      "lastValidatedAt": "2026-09-13T10:00:00Z"
    },
    {
      "code": "card", "name": "Card", "type": "card", "provider": "selcom",
      "environment": "live", "operationalStatus": "configuration_error",
      "configurationStatus": "missing_credentials",
      "missingKeys": ["PAYMENT_SELCOM_LIVE_API_KEY", "PAYMENT_SELCOM_LIVE_MERCHANT_CODE", "PAYMENT_SELCOM_LIVE_BASE_URL"],
      "credentialsPresent": { "API_KEY": false, "MERCHANT_CODE": false, "BASE_URL": false },
      "lastValidatedAt": "2026-09-13T10:00:00Z"
    },
    {
      "code": "mixx_by_yas", "name": "Mixx by Yas", "type": "mobile_money", "provider": "selcom",
      "environment": "off", "operationalStatus": "disabled",
      "configurationStatus": "configured", "missingKeys": [],
      "credentialsPresent": { "API_KEY": false, "MERCHANT_CODE": false, "BASE_URL": false },
      "lastValidatedAt": "2026-09-13T10:00:00Z"
    }
  ],
  "meta": { "misconfiguredCodes": ["card"], "misconfiguredCount": 1 }
}
```

| Field | Meaning |
|---|---|
| `environment` | `sandbox` \| `live` \| `off` |
| `operationalStatus` | `operational` — can accept transactions · `disabled` — `off` · `configuration_error` — enabled but misconfigured |
| `configurationStatus` | `configured` · `missing_credentials` (live only) · `not_required` (sandbox/internal) |
| `missingKeys` | Env var **names** that must be provided (never values) |
| `credentialsPresent` | Presence booleans per key — **no credential values, ever** |

### 3.2 Startup report
On boot, `PaymentModule.initialize()` logs a per-method report and runs `validateAll()`:
```text
Payment method environment configuration:
  M-Pesa           LIVE (operational)
  HaloPesa         SANDBOX (operational)
  Card             LIVE (CONFIGURATION ERROR)
    └─ Payment configuration error: Card is configured as LIVE but required live configuration is missing (missing: PAYMENT_SELCOM_LIVE_API_KEY, ...)
```
A method in `configuration_error` is rejected at runtime with `METHOD_MISCONFIGURED` (503) — it is **never** presented as operational.

### 3.3 Buyer-side (sanity check)
`GET /api/payment/payment-methods` (no auth) — `available: true` only for operational methods. If a method should be hidden and it isn't, check its `MODE` var; if it should be visible and isn't, check for a config error via the admin endpoint.
---

## 4. Configuration Reference

All variables are declared in `paymentEnvSchema` (`config/payment-methods.config.ts`) and validated at startup — an invalid value aborts with the variable name.

### 4.1 Modes (per method)
```bash
PAYMENT_MPESA_MODE=sandbox           # sandbox | live | off
PAYMENT_AIRTEL_MONEY_MODE=sandbox
PAYMENT_MIXX_BY_YAS_MODE=off         # formerly TIGO_PESA
PAYMENT_HALOPESA_MODE=sandbox
PAYMENT_CARD_MODE=off
PAYMENT_BANK_TRANSFER_MODE=off
PAYMENT_WALLET_MODE=sandbox
```
Defaults when a variable is **absent or empty**: `off` in `NODE_ENV=production`, `sandbox` otherwise. In other words, production can never accidentally enable a method.

### 4.2 Selcom credentials
```bash
# Sandbox-only (optional — the simulator needs none; provided values are carried
# through but never gate operation and are never used in live)
PAYMENT_SELCOM_SANDBOX_API_KEY=
PAYMENT_SELCOM_SANDBOX_MERCHANT_CODE=
PAYMENT_SELCOM_SANDBOX_BASE_URL=https://apigwtest.selcommobile.com/v1

# LIVE-ONLY (strictly required for any method with mode=live)
PAYMENT_SELCOM_LIVE_API_KEY=
PAYMENT_SELCOM_LIVE_MERCHANT_CODE=
PAYMENT_SELCOM_LIVE_BASE_URL=https://apigw.selcommobile.com/v1
```

### 4.3 Simulator controls
```bash
PAYMENT_SANDBOX_COMPLETION_DELAY_MS=2000   # ms; default 2000, clamped 0–60 000
```

---

## 5. Operating Workflows

### 5.1 Enable a method in `sandbox` (default for dev)
Set `PAYMENT_<METHOD>_MODE=sandbox` (or omit the var in non-production). No credentials required — the simulator runs the full flow immediately. No frontend release needed.

### 5.2 Move a method to `live`
1. Obtain production credentials from the provider and inject them via the secrets manager (never commit, never `.env` in git).
2. Set `PAYMENT_<METHOD>_MODE=live` and `NODE_ENV=production`.
3. Restart — the startup report must show `LIVE (operational)`. If credentials are missing, the method stays `configuration_error` and **no transactions proceed**.
4. Verify via `GET /api/payment/admin/payment-methods` before allowing traffic.

### 5.3 Disable a method (`off`)
Set `PAYMENT_<METHOD>_MODE=off`. It disappears from discovery (`available: false`), is not offered at checkout, and every initiation attempt is rejected with `METHOD_DISABLED`. Credentials may be left in place (ignored) or rotated.

### 5.4 Roll back
Change `PAYMENT_<METHOD>_MODE` back to `sandbox` — the real-provider path is bypassed and the simulator takes over. This is the incident rollback path.

---

## 6. Sandbox Testing (Simulator)

Sandbox is **not** a frontend mock — it exercises the identical Maysar lifecycle against `services/payment-service/src/infrastructure/providers/sandbox-simulation/`:

```text
Checkout → method gate → create payment → simulator initiation → provider-style
reference (sbx_*) → async processing → webhook through HandlePaymentWebhookUseCase
→ ledger verification → state transition → payment.completed / payment.failed →
order synchronization
```

| Concept | Detail |
|---|---|
| Outcomes | Deterministic per transaction via `metadata.sandboxOutcome`: `SUCCESS` (default) · `INSUFFICIENT_FUNDS` · `DECLINED` · `TIMEOUT` · `CANCELLED` |
| Failure reasons | `PAYMENT_DECLINED: <…> (simulated)`, `PAYMENT_EXPIRED: provider timeout (simulated)` etc. — exercised through the real pipeline |
| Completion delay | `PAYMENT_SANDBOX_COMPLETION_DELAY_MS` |
| Idempotency | One shared `SandboxLedger`; terminal states are immutable — duplicate callbacks can never double-process |
| Unknown references | Resolve to `PAYMENT_VERIFICATION_FAILED` — the simulator never fabricates success |

Reference checking this code: `infrastructure/providers/sandbox-simulation/` + its `__tests__/` suite.

---

## 7. Security

- Provider secrets remain **server-side** — never returned by discovery/admin APIs, never logged, never stored in source control, never exposed to Flutter/web clients.
- Credentials are scoped **per provider and per environment**; sandbox and live credential sets never mix.
- Rotation requires **no frontend changes**.
- Admin API reveals only key **presence** (`credentialsPresent`) and **names** of missing keys, never values.

---

## 8. Health

| Probe | Path | Purpose |
|---|---|---|
| Liveness | `GET /api/payment/health/live` | Process is up |
| Readiness | `GET /api/payment/health/ready` | Config validated, dependencies reachable |
| Health | `GET /api/payment/health` | Overall status incl. method config state |