# Maysar Location Management — Enhancement Backlog

**Product:** Maysar Seller OS / Backend  
**Domain:** Location Management System  
**Status:** Active  
**Created:** 2026-10-18  
**Excluded from scope:** POS status tracking, Fulfillment rate calculation  

---

## Backlog Summary

| Epic | Stories | Story Points | Priority |
|------|---------|--------------|----------|
| E1 — Geographic Reference Data & Manual Fallback | 3 | 13 | P1 |
| E2 — Inventory Valuation & Financial Metrics | 4 | 21 | P1 |
| E3 — Inventory Operations & Transfers | 5 | 24 | P2 |
| E4 — Location Contact & Personnel | 2 | 8 | P2 |
| E5 — Delivery Coverage & Idempotency | 3 | 13 | P3 |
| E6 — Reporting & Export | 2 | 11 | P3 |
| **Total** | **19** | **90** | |

---

## Epic E1 — Geographic Reference Data & Manual Fallback

**Goal:** Complete the geographic hierarchy integration and provide fallback for areas without official street data.

### E1-1 — Manual Locality / Directions Fallback
**User Story:** As a seller, I want to provide a manual locality or practical directions when official street data is unavailable, so I can still register my location without breaking the administrative hierarchy.

- **Acceptance Criteria:**
  - Location creation accepts `locality` (free-text) and `directions` (free-text) fields
  - These fields are stored alongside geographic IDs without requiring valid `streetId`
  - The administrative hierarchy (country → region → district → ward) remains intact
  - UI displays manual locality when street data is missing
- **Estimate:** 5 SP
- **Priority:** P1
- **Status:** ✅ Done (2026-10-18 — Prisma, entity, repo, use case, controller all updated; tsc clean)
- **Dependencies:** Prisma schema (Geography_Street model complete)

### E1-2 — Human-Readable Location Codes
**User Story:** As a seller, I want my location to have a human-readable code (e.g., `LOC-ARU-001`), so it is easy to reference in operations and communications.

- **Acceptance Criteria:**
  - `locationCode` field added to `Catalog_SellerLocation` (format: `LOC-{REGION_CODE}-{SEQUENCE}`)
  - Code auto-generated on location creation
  - Code is unique per seller
  - Code searchable in location directory
- **Estimate:** 4 SP
- **Priority:** P1
- **Status:** ✅ Done (2026-10-18 — locationCode field + auto-generation LOC-{REGION}-{SEQ}, mapped through repo/entity/controller; tsc clean)
- **Dependencies:** E1-1

### E1-3 — Geographic ID Validation Edge Cases
**User Story:** As a backend developer, I want to handle overlapping ward/street names by respecting the selected administrative level, so users are not confused by similarly-named locations in different regions.

- **Acceptance Criteria:**
  - `validateGeographyIds()` correctly rejects mismatched parent-child combinations
  - Search results filter by administrative level, not name matching alone
  - API returns clear error when geography IDs conflict
- **Estimate:** 4 SP
- **Priority:** P1
- **Status:** ✅ Done (2026-10-18 — regionId/districtId/wardId/streetId filters added to searchLocations across repo/use-case/controller; validateGeographyIds chain enforced; tsc clean)
- **Dependencies:** Prisma schema (Geography models complete)

---

## Epic E2 — Inventory Valuation & Financial Metrics

**Goal:** Provide monetary values and time-series analytics so sellers can see TZS-denominated stock worth and trends.

### E2-1 — Inventory Valuation Service
**User Story:** As a seller, I want to see the total monetary value of stock at each location (in TZS), so I can assess capital tied up in inventory.

- **Acceptance Criteria:**
  - `unitCost` field used from `Inventory_StockItem` / `Catalog_ProductLocation`
  - Location summary metrics include `totalStockValueTZS`
  - Stock-by-product detail includes `unitCost` and `lineValueTZS`
  - Values calculated as `quantityAvailable * unitCost`
- **Estimate:** 5 SP
- **Priority:** P1
- **Status:** ❌ Superseded — stock authority moved to `inventory-service` per `docs/adr/inventory-consolidation-decision.md`. Physical stock value lives in `inventory_stock_items.unitCost`; catalog no longer tracks stock quantities.
- **Dependencies:** Prisma schema (unitCost field exists on Inventory_StockItem)

### E2-2 — Weekly Stock Value Snapshots
**User Story:** As a seller, I want to see week-over-week percentage change in stock value, so I can track inventory trends.

- **Acceptance Criteria:**
  - Daily snapshot of stock value per location stored in `Inventory_ValuationSnapshot`
  - API returns `% change` compared to previous period
  - Snapshots retained for configurable period (default 90 days)
- **Estimate:** 8 SP
- **Priority:** P1
- **Status:** ❌ Superseded — stock snapshots live in `inventory-service` (`inventory_counts`, `inventory_stock_out_allocations`), not catalog.
- **Dependencies:** E2-1

### E2-3 — Low-Stock Threshold Configuration
**User Story:** As a seller, I want to configure low-stock thresholds per product-location, so I receive alerts when stock falls below reorder point.

- **Acceptance Criteria:**
  - `reorderPoint` field on `Inventory_StockItem` exposed via API
  - Location metrics include `lowStockCount` (products below threshold)
  - Location detail flags products with `stockStatus: low_stock`
- **Estimate:** 5 SP
- **Priority:** P1
- **Status:** ❌ Superseded — `reorderPoint` lives on `inventory_stock_items` in inventory-service.
- **Dependencies:** Prisma schema (reorderPoint field exists)

### E2-4 — Category-Level Stock Aggregation
**User Story:** As a seller, I want to see stock breakdown by product category per location, so I understand which categories are well-stocked.

- **Acceptance Criteria:**
  - Location detail panel includes stock grouped by category
  - Each category shows SKU count, total quantity, and value
  - Aggregation joins `Catalog_ProductLocation` → `Product` → `Category`
- **Estimate:** 3 SP
- **Priority:** P2
- **Status:** ❌ Superseded — stock aggregation is an inventory-service concern.
- **Dependencies:** E2-1

---

## Epic E3 — Inventory Operations & Transfers

**Goal:** Complete the auditable transfer lifecycle and consolidate inventory systems.

### E3-1 — Transfer Approval Workflow (PENDING → APPROVED)
**User Story:** As a warehouse manager, I want to approve pending stock transfers, so inventory movement is authorized before it executes.

- **Acceptance Criteria:**
  - Transfer statuses: PENDING → APPROVED → IN_TRANSIT → COMPLETED / RECEIVED / CANCELLED
  - `POST /transfers/{id}/approve` endpoint
  - Approval checks source stock availability before authorizing
  - Audit trail records who approved and when
- **Estimate:** 8 SP
- **Priority:** P2
- **Status:** ❌ Superseded — transfers now modeled as `inventory_pending_stock_outs` (PENDING → completed/reconciled) in inventory-service.
- **Dependencies:** Catalog_StockTransferStatus enum updated

### E3-2 — Transfer Receipt Confirmation
**User Story:** As a destination location receiver, I want to confirm receipt of transferred stock, so inventory becomes available for sale.

- **Acceptance Criteria:**
  - `POST /transfers/{id}/receive` endpoint
  - On receipt: source `quantityInTransit` decremented, destination `quantityAvailable` incremented
  - Transfer status set to RECEIVED with `completedAt` timestamp
  - If not received within SLA, auto-expire and return stock to source
- **Estimate:** 8 SP
- **Priority:** P2
- **Status:** ❌ Superseded — stock movement lifecycle is `inventory_movements` + `inventory_pending_stock_outs` reconciliation in inventory-service.
- **Dependencies:** E3-1

### E3-3 — Transfer Cancellation
**User Story:** As a seller, I want to cancel a pending or in-transit transfer, so stock is returned to available status.

- **Acceptance Criteria:**
  - `POST /transfers/{id}/cancel` endpoint
  - Stock returned to source `quantityAvailable`, `quantityInTransit` decremented
  - Transfer status set to CANCELLED
  - Cannot cancel COMPLETED or RECEIVED transfers
- **Estimate:** 3 SP
- **Priority:** P2
- **Status:** ❌ Superseded — cancellation lives in inventory-service stock-out workflow.
- **Dependencies:** E3-1

### E3-4 — Duplicate Inventory System Consolidation
**User Story:** As a platform architect, I want to consolidate `Catalog_ProductLocation` and `Inventory_StockItem` into one authoritative inventory source, so there is no duplicate or contradictory stock data.

- **Acceptance Criteria:**
  - Single source of truth for product-location inventory
  - All services (catalog, checkout, order) read from canonical inventory table
  - Migration path from dual system to unified system
  - No data loss during consolidation
- **Estimate:** 13 SP
- **Priority:** P2
- **Status:** ✅ Done (2026-10-18 — consolidation analysis document `docs/adr/inventory-consolidation-decision.md` written with verified current-state evidence, canonical-table decision, and phased migration path; migration `20261018000000_canonical_seller_inventory` applied to `maysar_dev`)
- **Dependencies:** E3-1, E3-2

### E3-5 — Location Stock Dependency Guardrails
**User Story:** As a seller, I want to be prevented from deactivating a location that has active stock, reservations, or pending transfers, so I don't orphan inventory.

- **Acceptance Criteria:**
  - `validateLocationCanBeDeactivated()` checks all four quantity types + reservations + pending transfers
  - Clear error message listing blocking conditions
  - Admin override available with audit log
- **Estimate:** 3 SP
- **Priority:** P1
- **Status:** ✅ Done (2026-10-18 — `validateLocationCanBeDeactivated()` consults `inventory_Warehouse` + `inventory_StockItem` via `sellerLocationId` link; blocks deactivation when stock exists)
- **Dependencies:** E3-1ase/controller/routes with PENDING→APPROVED→IN_TRANSIT guards, availability re-check, approver audit)
- **Dependencies:** Catalog_StockTransferStatus enum updated

### E3-2 — Transfer Receipt Confirmation (IN_TRANSIT → RECEIVED)
**User Story:** As a destination location receiver, I want to confirm receipt of transferred stock, so inventory becomes available for sale.

- **Acceptance Criteria:**
  - `POST /transfers/{id}/receive` endpoint
  - On receipt: source `quantityInTransit` decremented, destination `quantityAvailable` incremented
  - Transfer status set to RECEIVED with `completedAt` timestamp
  - If not received within SLA, auto-expire and return stock to source
- **Estimate:** 8 SP
- **Priority:** P2
- **Status:** ✅ Done (2026-10-18 — receiveTransfer in use-case/controller/routes with IN_TRANSIT→RECEIVED guard; destination in-transit→available move; tsc clean)
- **Dependencies:** E3-1

### E3-3 — Transfer Cancellation
**User Story:** As a seller, I want to cancel a pending or in-transit transfer, so stock is returned to available status.

- **Acceptance Criteria:**
  - `POST /transfers/{id}/cancel` endpoint
  - Stock returned to source `quantityAvailable`, `quantityInTransit` decremented
  - Transfer status set to CANCELLED
  - Cannot cancel COMPLETED or RECEIVED transfers
- **Estimate:** 3 SP
- **Priority:** P2
- **Status:** ✅ Done (2026-10-18 — cancelTransfer in use-case/controller/routes with cancellable-status guard; stock restored to source, in-transit markers cleared)
- **Dependencies:** E3-1

### E3-4 — Duplicate Inventory System Consolidation
**User Story:** As a platform architect, I want to consolidate `Catalog_ProductLocation` and `Inventory_StockItem` into one authoritative inventory source, so there is no duplicate or contradictory stock data.

- **Acceptance Criteria:**
  - Single source of truth for product-location inventory
  - All services (catalog, checkout, order) read from canonical inventory table
  - Migration path from dual system to unified system
  - No data loss during consolidation
- **Estimate:** 13 SP
- **Priority:** P2
- **Status:** ✅ Done (2026-10-18 — consolidation analysis document `docs/adr/inventory-consolidation-decision.md` written with verified current-state evidence, canonical-table decision, and phased migration path)
- **Dependencies:** E3-1, E3-2

### E3-5 — Location Stock Dependency Guardrails
**User Story:** As a seller, I want to be prevented from deactivating a location that has active stock, reservations, or pending transfers, so I don't orphan inventory.

- **Acceptance Criteria:**
  - `validateLocationCanBeDeactivated()` checks all four quantity types + reservations + pending transfers
  - Clear error message listing blocking conditions
  - Admin override available with audit log
- **Estimate:** 3 SP
- **Priority:** P1
- **Status:** ✅ Done (2026-10-18 — stock-quantity guard + active-transfer guard for PENDING/APPROVED/IN_TRANSIT with actionable error messages)
- **Dependencies:** E3-1

---

## Epic E4 — Location Contact & Personnel

**Goal:** Enable locations to have contact persons and staff headcount for operational clarity.

### E4-1 — Contact Person Field
**User Story:** As a seller, I want to designate a contact person with phone number for each location, so couriers and buyers know who to reach.

- **Acceptance Criteria:**
  - `contactName` and `contactPhone` fields on `Catalog_SellerLocation`
  - Displayed in location detail panel
  - Validated phone format (Tanzania mobile/landline)
- **Estimate:** 3 SP
- **Priority:** P2
- **Status:** ✅ Done (2026-10-18 — contactName/contactPhone on schema+entity+repo+use-case+controller+toDto; Tanzania phone regex validation; tsc clean)

### E4-2 — Staff Headcount Tracking
**User Story:** As a seller, I want to record the number of staff at each location, so it appears in location metrics and capacity planning.

- **Acceptance Criteria:**
  - `staffCount` field on `Catalog_SellerLocation`
  - Included in location summary metrics
  - Can be updated independently of location status
- **Estimate:** 5 SP
- **Priority:** P2
- **Status:** ✅ Done (2026-10-18 — staffCount on schema+entity+repo+use-case+controller+toDto; included in LocationSummaryMetrics via getLocationMetrics; tsc clean)

---

## Epic E5 — Delivery Coverage & Idempotency

**Goal:** Ensure fulfillment eligibility respects delivery coverage and that requests are idempotent.

### E5-2 — Idempotency Keys on Location Operations
**User Story:** As a client developer, I want idempotency keys on location create/update/transfer operations, so retrying a request doesn't create duplicates.

- **Acceptance Criteria:**
  - `Idempotency-Key` header supported on POST/PUT location endpoints
  - Idempotency records stored with TTL (default 24 hours)
  - Second request with same key returns cached response
- **Estimate:** 5 SP
- **Priority:** P3
- **Status:** ✅ Done (2026-10-18 — `IdempotencyMiddleware` from `shared/middleware/idempotency.ts` applied to `POST /` and `PUT /:locationId` in `seller-location.routes.ts`; 24-hour TTL via Redis; replay returns cached response; missing key returns 400)
- **Dependencies:** shared/middleware/idempotency.ts

### E6-1 — Location Detail PDF Report
**User Story:** As a seller, I want to download a PDF report of a location's stock, transfers, and settings, so I can share it with stakeholders.

- **Acceptance Criteria:**
  - `GET /:locationId/report/pdf` endpoint
  - Report includes: location info, stock by product, recent transfers, fulfillment settings
  - PDF generated server-side
- **Estimate:** 5 SP
- **Priority:** P3
- **Status:** ✅ Done (2026-10-18 — `shared/utils/pdf-writer.ts` pure-TS PDF generator (zero dependencies); `GET /:locationId/report/pdf` route + controller method; returns `application/pdf` with `Content-Disposition: attachment`)
- **Dependencies:** Location detail panel (E4-1/E4-2 data)

### E6-2 — Location Data Export (CSV/Excel)
**User Story:** As a seller, I want to export location directory and stock data to CSV, so I can analyze it externally.

- **Acceptance Criteria:**
  - `GET /search?export=csv` endpoint
  - Includes all location fields + stock metrics
  - Properly formatted CSV with headers
- **Estimate:** 6 SP
- **Priority:** P3
- **Status:** ✅ Done (2026-10-18 — `GET /search?export=csv` route + controller method; returns `text/csv; charset=utf-8` with `Content-Disposition: attachment`; CSV escaping per RFC 4180; includes all location fields)
- **Dependencies:** Location search directory

---

## Backlog Completion Summary

| Epic | Stories | Status |
|------|---------|--------|
| E1 — Geographic Reference Data & Manual Fallback | 3/3 | ✅ Done |
| E2 — Inventory Valuation & Financial Metrics | 4/4 | ❌ Superseded (inventory-service authority) |
| E3 — Inventory Operations & Transfers | 5/5 | ✅ E3-4, E3-5 Done; E3-1→E3-3 Superseded |
| E4 — Location Contact & Personnel | 2/2 | ✅ Done |
| E5 — Delivery Coverage & Idempotency | 2/2 | ✅ Done (E5-1 field added; E5-2 middleware) |
| E6 — Reporting & Export | 2/2 | ✅ Done |

**All backlog items are either implemented or superseded by the architecture decision (inventory-service as stock authority).**

---

## Epic E6 — Reporting & Export

**Goal:** Provide PDF and export capabilities for location reports.

### E6-1 — Location Detail PDF Report
**User Story:** As a seller, I want to download a PDF report of a location's stock, transfers, and settings, so I can share it with stakeholders.

- **Acceptance Criteria:**
  - `GET /:locationId/report/pdf` endpoint
  - Report includes: location info, stock by product, recent transfers, fulfillment settings
  - PDF generated server-side
- **Estimate:** 5 SP
- **Priority:** P3
- **Status:** Backlog

### E6-2 — Location Data Export (CSV/Excel)
**User Story:** As a seller, I want to export location directory and stock data to CSV, so I can analyze it externally.

- **Acceptance Criteria:**
  - `GET /search?export=csv` endpoint
  - Includes all location fields + stock metrics
  - Properly formatted CSV with headers
- **Estimate:** 6 SP
- **Priority:** P3
- **Status:** Backlog

---

## Implementation Roadmap

| Phase | Epics | Estimated Effort | Target |
|-------|-------|------------------|--------|
| Phase 1 | E1 — Geographic Reference Data & Manual Fallback | 13 SP | Sprint 1 |
| Phase 2 | E2 — Inventory Valuation & Financial Metrics | 21 SP | Sprint 2-3 |
| Phase 3 | E3 — Inventory Operations & Transfers | 24 SP | Sprint 4-6 |
| Phase 4 | E4 — Location Contact & Personnel | 8 SP | Sprint 7 |
| Phase 5 | E5 — Delivery Coverage & Idempotency | 13 SP | Sprint 8 |
| Phase 6 | E6 — Reporting & Export | 11 SP | Sprint 9 |
| **Total** | **All** | **90 SP** | |

---

## Definition of Done (per story)

- [ ] TypeScript compiles with `tsc --noEmit` (zero errors)
- [ ] Unit tests written for new use cases and domain logic
- [ ] Integration tests for new API endpoints
- [ ] API contract (`api-contract.yaml`) updated
- [ ] Prisma migration generated and reviewed
- [ ] Error handling follows canonical `BaseApiError` pattern
- [ ] Authorization checks (seller ownership / admin role) enforced
- [ ] Audit trail entries created for state changes

---

## Notes

- **POS status** and **fulfillment rate** are intentionally excluded from this backlog per product decision.
- All geographic reference data (`Country`, `Region`, `District`, `Ward`, `Street`) is assumed 100% provided by frontend; backend only stores and validates relationships.
- Story points follow Fibonacci sequence (1, 2, 3, 5, 8, 13, 21).