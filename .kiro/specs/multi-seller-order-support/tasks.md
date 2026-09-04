# Implementation Plan: Multi-Seller Order Support

## Overview

Implements Approach A (split-at-checkout). All changes are **additive** — `Order_Order` is unchanged. A new `Order_MasterOrder` + `Order_MasterOrderItem` table groups N seller orders created atomically from one checkout. Existing seller-order business logic (verification, COD, chat, settlement, logistics) is untouched.

---

## Tasks

- [x] 1. Prisma schema — new master order tables
  - Append `Order_MasterOrder` model to `prisma/schema.prisma`:
    - `id String @id @db.VarChar(64)` — MSR-MO-{YYYYMMDD}-{6alphanum} format
    - `buyerId String @db.VarChar(64)`
    - `totalAmount Decimal @db.Decimal(14, 2)`
    - `currency String @default("TZS") @db.VarChar(8)`
    - `paymentMethod String @db.VarChar(32)`
    - `createdAt DateTime @default(now())`
    - `updatedAt DateTime @updatedAt`
    - `sellerOrders Order_MasterOrderItem[]`
    - `@@index([buyerId])`, `@@index([createdAt])`
    - `@@map("order_master_orders")`
  - Append `Order_MasterOrderItem` join model:
    - `masterOrderId String @db.VarChar(64)`
    - `sellerOrderId String @db.VarChar(64)` (unique — one seller order belongs to at most one master order)
    - Relations to `Order_MasterOrder` and `Order_Order`
    - `@@id([masterOrderId, sellerOrderId])`
    - `@@index([sellerOrderId])`
    - `@@map("order_master_order_items")`
  - Add back-reference to `Order_Order`: `masterOrderItems Order_MasterOrderItem[]`
  - Add `masterOrderId String? @db.VarChar(64)` to `Order_Payment` (nullable, non-breaking)
  - Add `sellerQuotes Json?` to `Checkout_CheckoutSession` (stores `{ [sellerId]: { quoteId } }`)
  - Run `npx prisma generate`
  - _Requirements: 1.1, 1.2, 1.3, 7.2, 7.7_

- [x] 2. Migration SQL for master order tables
  - Create `prisma/migrations/20260823000000_add_multi_seller_order_support/migration.sql`:
    - `CREATE TABLE order_master_orders (...)` with all fields from task 1
    - `CREATE TABLE order_master_order_items (...)` with composite PK and unique `sellerOrderId`
    - `ALTER TABLE order_payments ADD COLUMN IF NOT EXISTS "masterOrderId" VARCHAR(64)`
    - `ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS "sellerQuotes" JSONB`
    - No data migration needed — legacy orders are served as Virtual Master Orders at read time
  - _Requirements: 9.1, 9.5_

- [x] 3. Master order ID generator
  - Add `makeMasterOrderId(): string` to `shared/ids/id.ts`
  - Format: `MSR-MO-{YYYYMMDD}-{6 uppercase alphanumeric random chars}`
  - Example: `MSR-MO-20260823-A3K7PQ`
  - Property: two calls within the same UTC date may share the date prefix but must have distinct suffixes
  - _Requirements: 1.2_

- [x] 4. MasterOrderRepository interface + PrismaMasterOrderRepository
  - Create `services/order-service/src/domain/repositories/master-order.repository.ts`:
    - `create(masterOrder: MasterOrderData): Promise<void>`
    - `findById(id: string): Promise<MasterOrderWithOrders | null>`
    - `findByBuyerId(buyerId: string, page: number, pageSize: number): Promise<{ items: MasterOrderSummary[]; total: number }>`
  - Create `services/order-service/src/infrastructure/repositories/prisma-master-order.repository.ts`:
    - `create`: uses `globalThis.prisma.order_MasterOrder.create` with nested `sellerOrders.create`
    - `findById`: includes `sellerOrders.sellerOrder.items` via nested includes
    - `findByBuyerId`: paginated, ordered by `createdAt DESC`
  - _Requirements: 1.1, 5.1, 5.5, 5.6_

- [x] 5. Master order status derivation utility
  - Create `services/order-service/src/domain/engines/master-order-status.engine.ts`
  - Implement `deriveMasterOrderStatus(sellerOrderStatuses: string[]): string` as a pure function:
    - ALL `DELIVERED` or `COMPLETED` → `COMPLETED`
    - ALL `cancelled` → `CANCELLED`
    - ANY `cancelled` → `PARTIALLY_CANCELLED`
    - ANY `SHIPPED` or `IN_TRANSIT` → `IN_TRANSIT`
    - ANY `SELLER_CONFIRMED` or `SELLER_VERIFIED` → `CONFIRMED`
    - ALL `PENDING` or `PENDING_SELLER_VERIFICATION` → `PENDING`
    - Otherwise → `PROCESSING`
  - _Requirements: 4.1, 4.2_

- [x] 6. MultiSellerCheckoutService
  - Create `services/checkout-service/src/application/use-cases/multi-seller-checkout.use-case.ts`
  - Implement `MultiSellerCheckoutUseCase.execute(sessionId, paymentMethod, sellerQuotes)`:
    1. Load session, validate not expired, check minimum basket value
    2. For each `productId` in session items, look up `sellerId` from `Product` via `globalThis.prisma`
    3. Group items into `Map<sellerId, items[]>`
    4. Validate all per-seller quotes via `QuoteValidationService.validate(quoteId)` — fail fast on first invalid
    5. Begin `prisma.$transaction`:
       a. For each seller group: call `placeOrderUseCase.execute({ buyerId, sellerId, items, paymentMethod, deliveryAddress, quoteId })`
       b. Sum all seller order totals for `masterTotalAmount`
       c. Create `Order_MasterOrder` via `masterOrderRepository.create(...)` linking all seller order IDs
    6. On transaction success: call `quoteValidationService.markConsumed(quoteId)` for each quote
    7. Emit `master_order.created` event
    8. Return `{ masterOrderId, sellerOrders: [{ sellerId, orderId }] }`
  - Error handling:
    - Transaction rollback on any `PlaceOrderUseCase` failure → return `CHECKOUT_ROLLBACK_FAILURE` with details
    - Missing quote for seller → `MISSING_DELIVERY_QUOTE` with `sellerId`
    - Expired quote → `QUOTE_EXPIRED` with `sellerId`
  - _Requirements: 2.1–2.7, 3.1–3.7, 7.1–7.7, 8.1–8.5_

- [x] 7. CheckoutController — extend confirmCheckout for multi-seller
  - Modify `services/checkout-service/src/api/controllers/checkout.controller.ts` `confirmCheckout` method:
    - Extract `sellerQuotes` from request body: `{ [sellerId: string]: { quoteId: string } }`
    - Backward compat: if `sellerQuotes` is absent but legacy `quoteId` is present, auto-construct single-seller `sellerQuotes` using the first product's `sellerId`
    - When `sellerQuotes` has entries for multiple sellers (or the session has items from multiple sellers), route to `MultiSellerCheckoutUseCase`
    - When single-seller (existing flow), retain existing `PlaceOrderUseCase` direct call (no regression)
    - Wire `MultiSellerCheckoutUseCase` into the controller via `global.__placeOrderUseCase` reference or constructor injection
  - _Requirements: 2.3, 2.5, 8.1_

- [x] 8. Master order buyer API — GET /api/orders/master
  - Create `services/order-service/src/api/controllers/master-order.controller.ts`:
    - `listMasterOrders(req, res)`: calls `masterOrderRepository.findByBuyerId(buyerId, page, pageSize)`, returns paginated list with `deriveMasterOrderStatus` applied per item, adds `isVirtual: false`
    - `getMasterOrder(req, res)`:
      - If `masterOrderId` starts with `VIRTUAL-`: resolve to the single `Order_Order` by ID, return wrapped as Virtual Master Order (`isVirtual: true`)
      - Otherwise: load from `masterOrderRepository.findById`, validate `buyerId` matches, compute derived status, return full response with nested seller orders
      - HTTP 403 if buyer mismatch, 404 if not found
    - Virtual Master Order construction: for any `Order_Order` with no `masterOrderItems`, wrap as `{ masterOrderId: "VIRTUAL-" + orderId, status: derived(order.status), sellerOrders: [order], isVirtual: true }`
  - Create route: `services/order-service/src/api/routes/master-order.routes.ts`
    - `GET /master` → `requireAuth` → `listMasterOrders`
    - `GET /master/:masterOrderId` → `requireAuth` → `getMasterOrder`
  - Mount in `services/order-service/index.ts` at `/api/orders`
  - _Requirements: 5.1–5.6, 9.1–9.5_

- [x] 9. Virtual master order support for legacy orders
  - In `getMasterOrder`: when `masterOrderId` matches pattern `VIRTUAL-{orderId}`:
    - Look up `Order_Order` by `orderId`
    - Verify `buyerId` matches authenticated buyer
    - Compute `deriveMasterOrderStatus([order.status])`
    - Return: `{ masterOrderId: "VIRTUAL-...", status, totalAmount: order.totalAmount, sellerOrders: [order], isVirtual: true }`
  - In `listMasterOrders`: after fetching real master orders, also fetch the buyer's legacy `Order_Order` records (those with no `masterOrderItems` entry) and append them as Virtual Master Orders at the end of the page
  - _Requirements: 9.1–9.5_

- [x] 10. Seller API — verify isolation still holds
  - Audit all seller-facing order endpoints in `services/order-service/src/api/`:
    - Confirm `WHERE sellerId = authenticatedSellerId` is present in every `Order_Order` query
    - Confirm master order endpoints return HTTP 403 for seller-authenticated callers
    - Confirm no `masterOrderId` or sibling order data leaks into seller responses
  - Add explicit middleware guard: if JWT role is `seller`, block any request to `/api/orders/master/*` with HTTP 403
  - _Requirements: 6.1–6.5, 11.1–11.6_

- [x] 11. Analytics event emission
  - In `MultiSellerCheckoutUseCase.execute`, after transaction commit:
    - Emit `master_order.created` event via `eventBus.publish` with: `masterOrderId`, `buyerId`, `sellerCount`, `totalAmount`, `currency`, `paymentMethod`, `createdAt`
  - In `PlaceOrderUseCase.execute` (existing), add `masterOrderId` to the existing `OrderCreatedEvent` payload as an optional field — `undefined` for orders created outside multi-seller checkout
  - _Requirements: 10.1–10.6_

- [x] 12. Per-seller quote requirement on checkout session
  - Modify `services/checkout-service/src/infrastructure/repositories/prisma-checkout.repository.ts`:
    - Ensure `sellerQuotes` JSON column is read/written on session load and save
  - Modify `CheckoutController.initiateCheckout` to accept and persist `sellerQuotes` on the session when provided
  - Add validation: if session has items from sellers for which no `sellerQuotes` entry exists at confirmation time, return `MISSING_DELIVERY_QUOTE`
  - _Requirements: 3.1–3.7_

- [x] 13. Wire MultiSellerCheckoutUseCase into checkout-service module
  - In `services/checkout-service/index.ts`:
    - Instantiate `MultiSellerCheckoutUseCase` with `placeOrderUseCase`, `masterOrderRepository`, `quoteValidationService`, `eventBus`
    - Expose it to `CheckoutController` via constructor
  - Ensure the `MasterOrderRepository` implementation in checkout-service uses `globalThis.prisma` (same pattern as existing repositories)
  - _Requirements: 2.3, 2.4_

- [x] 14. Database security: mandatory seller filter
  - Review `PrismaOrderRepository.findBySellerId` and all direct Prisma queries in order-service controllers
  - Ensure every query that originates from a seller-authenticated request includes `WHERE "sellerId" = $authenticatedSellerId` as a non-overridable clause
  - Add an integration test that attempts to read Seller B's order using Seller A's JWT and asserts HTTP 403
  - _Requirements: 11.1–11.6_

- [x] 15. Migration execution and seed update
  - Run `npx prisma migrate dev --name add_multi_seller_order_support` to apply migration
  - Verify `order_master_orders` and `order_master_order_items` tables exist
  - No seed data changes required — master orders are created by checkout, not seeded
  - _Requirements: 1.1_

---

## Notes

- Tasks 1–3 are schema-layer foundations and must complete before any application code is written.
- Task 6 (`MultiSellerCheckoutUseCase`) is the core unit — all other tasks either feed into it or depend on it.
- Task 7 wraps the new use case into the existing controller with backward compatibility — the existing single-seller checkout path must not regress.
- Tasks 8–9 add buyer-facing read APIs; these are independent of the checkout write path and can be parallelized after task 4 is done.
- Task 10 audits seller isolation — it is a verification task, not new feature code.
- The `PlaceOrderUseCase` signature is **never changed** in this implementation. Multi-seller orchestration lives entirely in `MultiSellerCheckoutUseCase`.
