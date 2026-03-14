# Redis Stock Reservation Migration Plan

## Goal
Move inventory reservations to Redis-backed `StockEngine` safely while keeping the database as the system of record during transition.

## Current Implementation
The reservation flow remains database-first. When Redis is configured, we now **shadow-write** reservation activity into Redis (variant-level) and release those shadow reservations on cancel/fulfill/expire.

## Feature Flag
`INVENTORY_REDIS_RESERVATIONS_MODE`
- `off` (default when no `REDIS_URL`): no Redis reservation writes
- `shadow` (default when `REDIS_URL` is set): shadow-write to Redis and log failures, but do not block primary flow

## Phase 1: Shadow (Now)
1. Enable Redis and set `INVENTORY_REDIS_RESERVATIONS_MODE=shadow`.
2. Monitor Redis shadow write failures and latency.
3. Validate Redis reservation counts against DB reservation totals for a sample of variants.

## Phase 2: Dual-Read Validation
1. Add a background checker to compare DB availability vs Redis availability for top variants.
2. Alert on divergence beyond threshold (e.g., >1% mismatch).
3. Confirm Redis TTL behavior matches DB reservation expiry windows.

## Phase 3: Primary with Fallback
1. Use Redis `StockEngine` for availability checks and reservations.
2. Keep DB reservation writes for audit and as a fallback.
3. On Redis errors, fail open to DB flow and alert.

## Phase 4: Primary Only (Optional)
1. Remove DB reservation writes (or keep as audit only).
2. Keep periodic reconciliation job to detect and correct drift.

## Rollback Plan
Set `INVENTORY_REDIS_RESERVATIONS_MODE=off` and restart services to return to DB-only behavior.
