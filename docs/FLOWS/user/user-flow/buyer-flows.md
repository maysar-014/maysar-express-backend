# Buyer Flows — User Service

> **Verification status:** Partially Verified
> **Verification basis:** `docs/FLOWS/_verification/analysis-report.md` (September 2026); `docs/user/USER_SERVICE_SYSTEM.md`
> **Last updated:** September 2026

## Overview

This document covers user-service flows from the buyer's perspective: viewing and updating their profile, and understanding how their COD reputation tier is tracked. Internal lookup endpoints are restricted — buyers can only access their own profile.

---

## Flow Index

| # | Flow Name | Verification Status | Primary Endpoint |
|---|---|---|---|
| 1 | View Own Profile | Partially Verified | `GET /api/user/:userId` |
| 2 | Update Profile | Partially Verified | `PUT /api/user/:userId` or `PATCH /api/user/:userId` |
| 3 | COD Reputation (Informational) | Partially Verified | Event-driven; read via profile |

---

## Flow 1: View Own Profile

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer views their account profile page |
| Preconditions | Authenticated (Bearer JWT); requesting own profile only |
| Terminal states | 200 — profile including COD tier; 403 if requesting another user's profile |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Fetch own profile | `GET /api/user/:userId` | Bearer JWT | 200 `{ userId, email, phoneNumber, name, address, codTier, accountStatus }` |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Requesting another user's profile | 403 | `FORBIDDEN` |
| `GET /api/user/lookup` or `GET /api/user/search` | 403 "Internal endpoint" | — (restricted to internal service calls only) |

---

## Flow 2: Update Profile

### Summary

| Field | Value |
|---|---|
| Actor | Buyer |
| Trigger | Buyer updates name, address, or phone number |
| Preconditions | Authenticated (Bearer JWT); updating own profile |
| Terminal states | 200 — profile updated |
| Verification status | Partially Verified |

### Happy Path

| Step | Actor/System | Action | Endpoint | Auth | Expected Response |
|---|---|---|---|---|---|
| 1 | Buyer | Submit profile update | `PATCH /api/user/:userId` | Bearer JWT | 200 `{ userId, updated fields }` |

### Unhappy Path Branches

| Trigger | System Response | Error Code |
|---|---|---|
| Invalid phone number format | 422 | `VALIDATION_ERROR` |
| Updating another user's profile | 403 | `FORBIDDEN` |

---

## Flow 3: COD Reputation (Informational)

The buyer's COD trust tier is computed by order-service and stored on their user profile. It is not set by the buyer — it changes automatically based on platform events.

| Signal | Event | Score Change | Source Service |
|---|---|---|---|
| Successful delivery | `Delivery.Success.v1` | +10 (SUCCESSFUL_DELIVERY) | logistics-service |
| COD payment confirmed | `Delivery.Success.v1` | +5 (PAYMENT_ON_DELIVERY) | logistics-service |
| Repeat purchase | Order event | +3 (REPEAT_PURCHASE) | order-service |
| Refused delivery | `COD_DISPUTE_RESOLVED` | -15 (REFUSED_DELIVERY) | support-service |
| Fraudulent order | `COD_DISPUTE_RESOLVED` | -30 (FRAUDULENT_ORDER) | support-service |

Buyers see their current tier via their profile (`codTier` field). Tier thresholds and radius/exposure limits are documented in `docs/FLOWS/role-overviews/buyer-lifecycle.md`.
