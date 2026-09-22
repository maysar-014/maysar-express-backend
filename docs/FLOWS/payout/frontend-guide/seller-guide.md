# Seller Guide — Payout Service

> Mirrors: docs/FLOWS/payout/user-flow/seller-flows.md
> Verification status: Verified
> Last updated: September 2026

## Overview

This guide is for frontend developers implementing the payout UI for sellers. It covers three flows: initiating a payout of accumulated wallet earnings, checking the status of a submitted payout, and cancelling a pending payout. Payouts require KYC level 2. The payout initiation UI must never be shown to buyers — `POST /api/payout/payouts` returns 403 for the buyer role by design.

> ⚠️ **Role gate:** Never render the payout initiation UI for users with the `buyer` role. Check the role from the JWT before showing any payout-related screens. `POST /api/payout/payouts` returns 403 for buyers — this is correct by design, not a bug.

---

## Flow 1: Initiate Payout

**User Goal:** Withdraw accumulated wallet earnings to a mobile money account or bank.

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
- What the seller sees: Payout form with amount input, payout method selector (mobile money or bank transfer), and account details input. Show their `availableBalance` from `GET /api/wallet/balance` above the form.
- What they click/tap: "Request payout" button
- API call: `POST /api/payout/payouts`
- Auth: Bearer JWT (seller role)
- Request body (mobile money):
  ```json
  {
    "amount": 150000,
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

**What the Seller Should Understand at Every Stage:**
- Before submitting, they see their available balance and can verify they have enough to cover the requested amount plus any applicable fees.
- After submission, the payout is in `PENDING` status — funds are being reserved and sent to the provider. Mobile money payouts typically arrive within minutes; bank transfers take 1–3 business days.
- They can cancel the payout if it is still `PENDING` (Flow 3). Once `PROCESSING`, cancellation is no longer possible.

---

## Flow 2: Check Payout Status

**User Goal:** Track the progress of a submitted payout.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Loading | Status loading | Skeleton card matching the payout detail layout |
| PENDING | "Processing" | Payout is queued. Show payout saga progress at step 2–3. |
| PROCESSING | "Sending to provider" | Payout is with the payment provider. Show saga at step 3. |
| COMPLETED | "Paid" | Payout successful. Show saga at step 4 "Disbursed". Show `completedAt` timestamp. |
| FAILED | "Failed" | "Failed — contact support." Show support contact option. |
| REVERSED | "Reversed" | "Reversed." Show explanation if available. |
| Not Found | Payout not found | "Payout not found." |
| Error | Failed to load | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Load payout status:**
- What the seller sees: Payout history list or the payout detail screen navigated from the initiation success screen
- What they click/tap: Tap a payout in the history list, or navigate directly from payout initiation
- API call: `GET /api/payout/payouts/:id`
- Auth: Bearer JWT (seller role)
- Request body: none
- Success response: `200 { payoutId, status, amount, method, phoneNumber (masked), createdAt, completedAt? }`
- Success handling: Map `status` to the display label below. Show the payout saga progress indicator based on current status. If `status === "PENDING"`, show the cancel option (Flow 3).
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

**What the Seller Should Understand at Every Stage:**
- `PENDING` means the funds are reserved and the payout is queued for processing with the provider. This typically advances to `PROCESSING` quickly.
- `COMPLETED` means the funds have been disbursed. They should check their mobile money app or bank account for confirmation.
- `FAILED` payouts require contacting support — the funds are returned to the wallet automatically if the disbursement failed.

---

## Flow 3: Cancel Payout

**User Goal:** Cancel a payout before it is processed and return funds to the available wallet balance.

**UI States to Handle:**

| State | What User Sees | UI Treatment |
|---|---|---|
| Cancel available | Cancel option visible | Show "Cancel payout" option only when status is `PENDING` |
| Confirmation dialog | Confirm before cancelling | "Cancel this payout? Funds will be returned to your available balance." — "Cancel payout" and "Keep payout" buttons |
| Loading | Cancelling | Loading indicator; disable buttons |
| Success | "Payout cancelled. Funds returned to your wallet." | Update payout status display to `CANCELLED` |
| Already processing | Cannot cancel | "This payout is already being processed and cannot be cancelled." |
| Error | Failed | "Something went wrong. Please try again." + retry |

**Actions the User Can Take:**

**Cancel pending payout:**
- What the seller sees: Payout detail screen showing status `PENDING` with a "Cancel payout" option
- What they click/tap: "Cancel payout" → confirmation dialog
- Confirmation dialog: "Cancel this payout? Funds will be returned to your available balance." with "Cancel payout" (destructive) and "Keep payout" (safe) buttons
- After confirming in the dialog:
  - API call: `POST /api/payout/payouts/:id/cancel`
  - Auth: Bearer JWT (seller role)
  - Request body: none
  - Success response: `200 { payoutId, status: "CANCELLED" }`
- Success handling: Update the payout status to `CANCELLED`. Show: "Payout cancelled. Funds returned to your wallet." The funds are unfrozen and `availableBalance` restores automatically.
- Error handling: See error code table below.

> ⚠️ **Cancel availability:** Only show the cancel option when payout status is `PENDING`. Once the payout advances to `PROCESSING`, it cannot be cancelled. Remove or disable the cancel button when the status is `PROCESSING`, `COMPLETED`, `FAILED`, or `REVERSED`.

> ⚠️ **Confirmation dialog required:** Always show a confirmation before submitting the cancel request. Do not submit on first tap.

**Error Code Table:**

| HTTP Status | Error Code | User-Facing Message | Retry? |
|---|---|---|---|
| 401 | UNAUTHORIZED | "Please log in again." | Yes — re-authenticate |
| 404 | PAYOUT_NOT_FOUND | "Payout not found." | No |
| 422 | INVALID_STATUS_TRANSITION | "This payout is already being processed and cannot be cancelled." | No |
| 5xx | — | "Something went wrong. Please try again." | Yes — retry after delay |

**What the Seller Should Understand at Every Stage:**
- Cancelling a pending payout immediately returns the reserved funds to the available balance. They can initiate a new payout at any time after cancellation.
- Once a payout moves to `PROCESSING`, it is with the payment provider and cannot be reversed through the app. Contact support if a processing payout needs to be recalled.
