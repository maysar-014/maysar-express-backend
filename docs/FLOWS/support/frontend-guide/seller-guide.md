# Seller Guide — Support Service

> Mirrors: `docs/FLOWS/support/user-flow/seller-flows.md`
> Verification status: Verified
> Last updated: September 2026

## Overview

Support ticket flows for sellers are identical to buyer flows. This guide documents the seller-specific context. See `docs/FLOWS/support/frontend-guide/buyer-guide.md` for full UI states, error codes, and patterns.

---

## Seller-Relevant Ticket Categories

The most common categories for seller tickets:
- `ORDER_ISSUE` — fulfillment disputes, missing orders
- `PAYMENT_ISSUE` — settlement delays, payout problems
- `DELIVERY_ISSUE` — logistics coordination issues
- `KYC_ISSUE` — KYC verification questions

---

## Flow 1: Create Support Ticket

Same as buyer guide. `POST /api/support/tickets` with seller JWT.

---

## Flow 2: Add Message to Ticket

Same as buyer guide. `POST /api/support/tickets/:ticketId/messages` with seller JWT.

---

## Flow 3: View Ticket Status

Same as buyer guide. `GET /api/support/tickets/:ticketId` with seller JWT. Same status label mapping applies.
