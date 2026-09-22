# Supplier Guide — Payout Service

> Mirrors: docs/FLOWS/payout/user-flow/supplier-flows.md
> Verification status: Verified (payout flows); Partially Verified (upstream supplier wallet credits via production-service events)
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the payout UI for suppliers. It covers three flows: initiating a payout of accumulated receivables, checking the status of a submitted payout, and cancelling a pending payout. Payouts require KYC level 2. Supplier receivables accumulate in the wallet from bulk order fulfillment credits. The payout initiation UI must never be shown to buyers.

> ⚠️ **Role gate:** Never render the payout initiation UI for users with the `buyer` role. Check the role from the JWT before showing any payout-related screens. `POST /api/payout/payouts` returns 403 for buyers — this is correct by design, not a bug.

> **Partial verification note:** Supplier wallet credits are triggered by production-service event subscriptions (`order.completed` → production-service → `wallet.credit`). These event subscription paths are Partially Verified as of the September 2026 sweep. If a supplier's wallet balance appears inconsistent with expected receivables, the upstream production-service event chain should be investigated first. The payout flows documented here are Verified.

---

## Flow 1: Initiate Payout

**User Goal:** Withdraw accumulated receivables to a mobile money account or bank.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | "Requesting payout…" | Loading spinner; disable the submit button and all form inputs |
| Success | Payout requested | "Payout requested — you'll receive funds in {method processing time}." Show the payout reference ID. |
| KYC gate | KYC required | "Complete your KYC verification (level 2) to request payouts." Show a link/button to the KYC verification flow. |
| Insufficient balance | Balance too low | "Your available balance is insufficient for this payout amount." Show current `availableBalance`. |
| Below minimum | Amount too small | "The minimum payout amount for {method} is TZS {minimum}." Show the minimum for the selected method. |
| Provider unavailable | Provider down | "Payout provider temporarily unavailable. Please try again." + retry button |
| Error | Generic failure | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Submit payout request:**
- What the supplier sees: Payout form with amount input, payout method selector (mobile money or bank transfer), and account details input. Show their `availableBalance` from `GET /api/wallet/balance` above the form.
- What they click/tap: "Request payout" button
- API call: `POST /api/payout/payouts`
- Auth: Bearer JWT (supplier role)
- Request body (mobile money):
  ```json
  {
    "amount": 300000,
    "currency": "TZS",
    "method": "MPESA",
    "accountDetails": {
      "phoneNumber": "+255712345678"
    }
  }
  ```
- Request body (bank transfer):
  ```json
  {
    "amount": 500000,
    "currency": "TZS",
    "method": "BANK_TRANSFER",
    "accountDetails": {
      "bankCode": "CRDB",
      "accountNumber": "0123456789"
    }
  }
  ```
- Success response: `201 { payoutId, status: "PENDING", amount, method, estimatedCompletion }`
- Success handling: Show "Payout requested — you'll receive funds in {processing time for selected method}." Display the `payoutId` as a reference number. Offer a link to the payout status screen.
- Error handling: See error code table below.

**Payout method options and processing times:**

| Method | Minimum Amount | Processing Time |
|---|---|---|
| MPESA | TZS 1,000 | Instant – 5 minutes |
| AIRTEL_MONEY | TZS 1,000 | Instant – 5 minutes |
| TIGO_PESA | TZS 1,000 | Instant – 5 minutes |
| HALOPESA | TZS 1,000 | Instant – 5 minutes |
| BANK_TRANSFER | TZS 10,000 | 1–3 business days |

**Payout saga stages to display:**

Show a progress indicator during and after submission reflecting the saga stages:

1. "Checking eligibility" — KYC and balance validation
2. "Reserving funds" — wallet freeze in progress
3. "Processing" — payment being sent to provider
4. "Disbursed" — payout completed

Before submission: show stages as upcoming steps. After 201 response: advance to step 3 ("Processing"). The final "Disbursed" state is shown when status reaches `COMPLETED` (via Flow 2: Check Payout Status).

**KYC gate handling:**
- If the API returns `422 KYC_LEVEL_INSUFFICIENT`, show: "Complete your KYC verification (level 2) to request payouts."
- Include a call-to-action button linking to the KYC verification flow.
- Do not show a generic error — the message must make the KYC requirement clear.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 400 | INVALID_PAYOUT_METHOD | "This payout method is not supported." | No — choose another method |
| 400 | VALIDATION_ERROR | "Please check your payout details and try again." | Yes — fix input |
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 402 | INSUFFICIENT_BALANCE | "Your available balance is insufficient for this payout amount." | No — reduce amount |
| 403 | FORBIDDEN | (Buyer role) — do not show payout UI to buyers | N/A |
| 422 | KYC_LEVEL_INSUFFICIENT | "Complete your KYC verification (level 2) to request payouts." | No — complete KYC first |
| 422 | BELOW_MINIMUM_PAYOUT | "The minimum payout amount for {method} is TZS {minimum}." | Yes — increase amount |
| 503 | PROVIDER_UNAVAILABLE | "Payout provider temporarily unavailable. Please try again." | Yes — retry after delay |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the Supplier Should Understand at Every Stage:**
- Before submitting, they see their available balance. This reflects receivables credited from completed bulk orders (minus any prior payouts).
- If the balance appears lower than expected, it may be due to a delay in the upstream production-service event chain. Check the wallet statement for recent `CREDIT` entries before raising a support ticket.
- After submission, mobile money payouts typically arrive within minutes. Bank transfers take 1–3 business days.
- A `PENDING` payout can be cancelled (Flow 3). Once it advances to `PROCESSING`, it cannot be cancelled.

---

## Flow 2: Check Payout Status

**User Goal:** Track the progress of a submitted payout.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Status loading | Skeleton card matching the payout detail layout |
| PENDING | "Processing" | Payout queued. Show saga progress at step 2–3. |
| PROCESSING | "Sending to provider" | Payout is with the provider. Show saga at step 3. |
| COMPLETED | "Paid" | Payout successful. Show saga at step 4 "Disbursed". Show `completedAt` timestamp. |
| FAILED | "Failed" | "Failed — contact support." Show support contact option. |
| REVERSED | "Reversed" | "Reversed." Show explanation if available. |
| Not Found | Payout not found | "Payout not found." |
| Error | Failed to load | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Load payout status:**
- What the supplier sees: Payout history list or payout detail screen
- What they click/tap: Tap a payout from the history list, or navigate from the initiation success screen
- API call: `GET /api/payout/payouts/:id`
- Auth: Bearer JWT (supplier role)
- Request body: none
- Success response: `200 { payoutId, status, amount, method, accountDetails (masked), createdAt, completedAt? }`
- Success handling: Map `status` to the display label below. Show the payout saga progress indicator. If `status === "PENDING"`, show the cancel option (Flow 3).
- Error handling: See error code table below.

**Status display mapping:**

| API Status | User-Facing Label | Saga Stage |
|---|---|---|
| `PENDING` | "Processing" | Step 2: Reserving funds |
| `PROCESSING` | "Sending to provider" | Step 3: Processing |
| `COMPLETED` | "Paid" | Step 4: Disbursed |
| `FAILED` | "Failed — contact support" | — |
| `REVERSED` | "Reversed" | — |

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | PAYOUT_NOT_FOUND | "Payout not found." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the Supplier Should Understand at Every Stage:**
- `PENDING` means the funds are reserved and the payout is queued for the payment provider.
- `COMPLETED` means the funds have been disbursed to the specified account. Check the mobile money app or bank account for confirmation.
- `FAILED` payouts return the funds to the wallet automatically. Contact support if the issue persists.

---

## Flow 3: Cancel Payout

**User Goal:** Cancel a payout before it is processed and return funds to available balance.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Cancel available | Cancel option visible | Show "Cancel payout" only when status is `PENDING` |
| Confirmation dialog | Confirm before cancelling | "Cancel this payout? Funds will be returned to your available balance." — "Cancel payout" and "Keep payout" buttons |
| Loading | Cancelling | Loading indicator; disable buttons |
| Success | Payout cancelled | "Payout cancelled. Funds returned to your wallet." Update status to `CANCELLED`. |
| Already processing | Cannot cancel | "This payout is already being processed and cannot be cancelled." |
| Error | Failed | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Cancel pending payout:**
- What the supplier sees: Payout detail screen showing `PENDING` status with a "Cancel payout" option
- What they click/tap: "Cancel payout" → confirmation dialog
- Confirmation dialog: "Cancel this payout? Funds will be returned to your available balance." with "Cancel payout" (destructive) and "Keep payout" (safe) buttons
- After confirming:
  - API call: `POST /api/payout/payouts/:id/cancel`
  - Auth: Bearer JWT (supplier role)
  - Request body: none
  - Success response: `200 { payoutId, status: "CANCELLED" }`
- Success handling: Update payout status to `CANCELLED`. Show: "Payout cancelled. Funds returned to your wallet." The `availableBalance` restores automatically.
- Error handling: See error code table below.

> ⚠️ **Cancel availability:** Only show the cancel option when payout status is `PENDING`. Remove or disable the cancel button for `PROCESSING`, `COMPLETED`, `FAILED`, and `REVERSED` states.

> ⚠️ **Confirmation dialog required:** Always show a confirmation before submitting the cancel request. Do not submit on first tap.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | PAYOUT_NOT_FOUND | "Payout not found." | No |
| 422 | INVALID_STATUS_TRANSITION | "This payout is already being processed and cannot be cancelled." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the Supplier Should Understand at Every Stage:**
- Cancelling a pending payout immediately returns the reserved amount to available balance. A new payout can be initiated at any time.
- Once the payout is `PROCESSING`, it is with the payment provider and cannot be reversed through the app. Contact support if a processing payout requires intervention.
