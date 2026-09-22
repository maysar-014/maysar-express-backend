# Buyer Guide — User Service

> Mirrors: `docs/FLOWS/user/user-flow/buyer-flows.md`
> Verification status: Partially Verified
> Last updated: September 2026

## Overview

Profile management and COD trust tier display for buyers.

---

## Flow 1: View Profile

**Action:** `GET /api/user/:userId` with buyer JWT (own profile only)

**UI States:** Loading | Profile displayed | Error

Show: name, email, phone number, address, COD trust tier prominently.

> ⚠️ Never call `GET /api/user/lookup` or `GET /api/user/search` from the buyer frontend — these return 403 "Internal endpoint" and are for internal service use only.

---

## Flow 2: Update Profile

**Action:** `PATCH /api/user/:userId` with buyer JWT

**UI States:** Form | Loading | Success ("Profile updated") | Validation error | Error

Show field-level validation errors. Phone number must be in E.164 format (+255XXXXXXXXX).

| Status | Message |
|---|---|
| 422 VALIDATION_ERROR | Highlight the specific invalid field |
| 403 | "You can only update your own profile." |

---

## Flow 3: COD Trust Tier Display

The buyer's COD tier is shown on their profile and wallet screens. Display the current tier with its limits:

| Tier | What to Show |
|---|---|
| NEW_BUYER | "COD Trust: Starter — up to TZS 30,000" |
| TRUSTED_BEGINNER | "COD Trust: Beginner — up to TZS 150,000" |
| TRUSTED_BUYER | "COD Trust: Trusted — up to TZS 500,000" |
| GOLD_BUYER | "COD Trust: Gold — up to TZS 2,000,000" |
| PLATINUM_BUYER | "COD Trust: Platinum — up to TZS 10,000,000" |

Tier is read-only — the buyer cannot change it. Explain that completing successful deliveries increases the tier.
