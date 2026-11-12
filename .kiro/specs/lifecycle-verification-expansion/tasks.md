# Implementation Plan: Lifecycle Verification Script Expansion

## Overview

Expand `scripts/verification/run-lifecycle-checks.mjs` from 10 lifecycles (LC-01–LC-10) to 31 lifecycles (LC-01–LC-31), adding 21 new async lifecycle functions and wiring them into `main()`. The implementation is purely additive JavaScript in a single file — no build step, no new dependencies.

## Tasks

- [x] 1. Extend shared state declarations and createdEntities registry
  - Add `requests: []` and `productionPlans: []` arrays to the existing `createdEntities` object literal
  - Add all new `ctx.entities` fields as comments to the declaration block so the shape is clear to readers: `requestId`, `requestQuoteId`, `assessmentToken`, `requestOrderId`, `deliveryId`, `productionPlanId`, `notificationId`, `enablerId`, `trainingModuleId`, `commissionId`
  - Update the block comment at the top of the file to list LC-11 through LC-31 in the same format as existing entries
  - _Requirements: 13.1, 13.7_

- [x] 2. Implement Request Service lifecycles (LC-11, LC-12, LC-13)
  - [x] 2.1 Implement `lcRequestBuyer()` — LC-11
    - Call `POST /api/request/requests` [buyer] with title, items array, delivery address → expect 200 or 201; store `requestId` in `ctx.entities.requestId`; push to `createdEntities.requests`
    - Call `GET /api/request/requests/:requestId` [buyer] → expect 200
    - Call `GET /api/request/requests` [buyer] → expect 200
    - Call `POST /api/request/requests/:requestId/messages` [buyer] → expect 200 or 201
    - Call `GET /api/request/requests/:requestId/messages` [buyer] → expect 200
    - Call `POST /api/request/requests/:requestId/cancel` [buyer] → expect 200; handles graceful skip if requestId is missing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 14.1, 14.2_

  - [x] 2.2 Implement `lcRequestProvider()` — LC-12
    - Skip gate at top: if `ctx.entities.requestId` is null, log skip and return
    - Call `GET /api/request/provider/requests` [admin] → expect 200
    - Call `POST /api/request/provider/requests/:requestId/assign` [admin] → expect 200 or 201
    - Call `POST /api/request/provider/requests/:requestId/assess` [admin] with `{ "decision": "FULFILLABLE" }` → expect 200 or 201
    - Call `POST /api/request/provider/requests/:requestId/quotes` [admin] with valid `sellingPriceTzs`, `procurementCostTzs`, `logisticsCostTzs`, `validUntil`, `items` → expect 200 or 201; store `requestQuoteId`
    - Call `POST /api/request/provider/quotes/:quoteId/publish` [admin] → expect 200, 201, or 422; store `assessmentToken` from 200/201 response if returned
    - Call `POST /api/request/provider/quotes/:quoteId/assessment-link` [admin] → expect 200 or 201; store raw token in `ctx.entities.assessmentToken`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 14.1, 14.2_

  - [x] 2.3 Implement `lcRequestConvert()` — LC-13
    - Skip gate at top: if `ctx.entities.assessmentToken` is null, log skip and return
    - Call `GET /api/request/requests/assess/:token` (no Bearer token) → expect 200
    - Call `POST /api/request/requests/assess/:token/convert` (no Bearer token) → expect 200 or 201; extract and log `orderId` → `ctx.entities.requestOrderId`
    - Call `POST /api/request/requests/assess/:token/convert` a second time → expect a response where `created` is `false` (idempotency check)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Implement Logistics depth lifecycles (LC-14, LC-15)
  - [x] 3.1 Implement `lcLogisticsDepth()` — LC-14
    - Call `POST /api/logistics/v1/fulfillment-options` [buyer] with items array containing sellerId, weight, destination → expect 200, 400, or 422; log counts of `options[]`, `exclusions[]`, `fairnessExcluded[]` (empty options is not a failure)
    - Call `GET /api/logistics/api/v1/deliveries` or equivalent [buyer] using `ctx.entities.orderId` → expect 200 or 404; extract first `deliveryId` → `ctx.entities.deliveryId`
    - Call `GET /api/logistics/api/v1/deliveries/:deliveryId` [buyer] if deliveryId present → expect 200 or 404; log delivery status
    - Skip gate for delivery tracking: if no orderId, log skip for tracking steps
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4_

  - [x] 3.2 Implement `lcCourierMilestones()` — LC-15
    - Call `GET /api/logistics/api/courier/deliveries` [courier] → expect 200 or 404
    - If a delivery in pending state exists and deliveryId is available, call `PATCH /api/logistics/api/v1/deliveries/:deliveryId/status` [courier] with `{ "status": "picked_up" }` → expect 200, 400, or 409
    - Call `PATCH` again with `{ "status": "in_transit" }` → expect 200, 400, or 409
    - Call `PATCH` with `{ "status": "delivered" }` (skipping intermediate states from pending — invalid transition test) → expect 409
    - Skip gates throughout if no assignable delivery exists
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4. Implement Production Plan lifecycle (LC-16)
  - [x] 4.1 Implement `lcProductionPlan()` — LC-16
    - Call `GET /api/production/plans` [admin] → expect 200
    - Call `POST /api/production/plans` [admin] with `productId` (from `ctx.entities.productId`), `plannedQuantity`, `targetCompletionDate` → expect 200, 201, or 422; store planId in `ctx.entities.productionPlanId`; push to `createdEntities.productionPlans`
    - Skip gate: if no productId, log skip for create/schedule/start steps
    - If planId present, call `POST /api/production/plans/:planId/schedule` [admin] with future `scheduledStartDate` → expect 200 or 422
    - If SCHEDULED, call `POST /api/production/plans/:planId/start` [admin] → expect 200 or 422
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 5. Implement deeper Auth and Order Fulfillment lifecycles (LC-17, LC-18)
  - [x] 5.1 Implement `lcAuthDepth()` — LC-17
    - Obtain a refresh token (login buyer with full response) and call `POST /api/auth/refresh` [buyer] with it → expect 200
    - Call `POST /api/auth/password/reset/initiate` with buyer's email → expect 200
    - Call `GET /api/auth/2fa/status` [seller] → expect 200 or 404
    - Re-login buyer after the reset initiate call to restore session
    - Call `POST /api/auth/2fa/backup-codes/regenerate` [admin] → expect 200 or 400 (400 acceptable when 2FA not enabled)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ] 5.2 Implement `lcOrderFulfillmentDepth()` — LC-18
    - Call `GET /api/order/orders` [admin] → expect 200; log total count
    - Call `GET /api/order/orders/:orderId` [seller] if orderId present → log current order status
    - Call `POST /api/order/orders/:orderId/verify` [seller] if order in PENDING_SELLER_VERIFICATION → expect 200, 201, 400, or 404
    - Log current state of most recent order when no order is in fulfillable state (no failure thrown)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6. Implement Inventory depth lifecycle (LC-19)
  - [x] 6.1 Implement `lcInventoryDepth()` — LC-19
    - Call `GET /api/inventory/warehouses` [seller] → expect 200
    - Call `GET /api/inventory/stock/:variantId` [seller] if variantId present → expect 200 or 404
    - Call `POST /api/inventory/stock/adjust` [seller] with valid adjustment payload → expect 200, 201, 400, or 422
    - Call `POST /api/inventory/reservations` [seller] if variantId and orderId present → expect 200, 201, 400, or 422
    - If reservation was created, call `DELETE /api/inventory/reservations/:orderId` → expect 200, 204, or 404
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 7. Implement deeper Analytics and RBAC lifecycles (LC-20, LC-21)
  - [x] 7.1 Implement `lcAnalyticsDepth()` — LC-20
    - Call `GET /api/analytics/sellers/:sellerId/sla/breaches` [seller] → expect 200 or 404
    - Call `GET /api/analytics/seller-profitability/retention` [seller] → expect 200 or 404
    - Call `GET /api/analytics/seller-profitability/revenue-health` [seller] → expect 200 or 404
    - Call `GET /api/analytics/admin/dashboard/red-flags` [admin] → expect 200 or 404
    - Call `GET /api/analytics/admin/dashboard/founder-operating-system` [admin] → expect 200 or 404
    - Call `PATCH /api/analytics/action-items/:actionId/resolve` [seller] for first available actionId from LC-09 dashboard → expect 200 or 404; skip if no actionId
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ] 7.2 Implement `lcRbacBoundary()` — LC-21
    - Call `POST /api/payout/payouts` [buyer] → expect 401 or 403; log "RBAC enforced correctly"
    - Call `GET /api/request/provider/requests` [buyer] → expect 401 or 403; log "RBAC enforced correctly"
    - Call `GET /api/analytics/platform/kpis` [courier] → expect 401 or 403; log "RBAC enforced correctly"
    - Call `POST /api/auth/admin/users/:id/suspend` [seller] with any userId → expect 401 or 403; log "RBAC enforced correctly"
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 8. Checkpoint — wire LC-11 through LC-21 into main(), and add dispute depth to existing LC-07
  - Add dispute steps to the existing `lcSupport()` function (LC-07): after the existing `GET /api/support/disputes` call, extract the first disputeId from the response, then call `GET /api/support/disputes/:id` [admin] → expect 200 or 404; call `POST /api/support/disputes/:id/resolve` [admin] → expect 200, 201, or 400; skip both if no disputeId
  - Extend the `try` block in `main()` to call all 11 new functions in sequence: `lcRequestBuyer`, `lcRequestProvider`, `lcRequestConvert`, `lcLogisticsDepth`, `lcCourierMilestones`, `lcProductionPlan`, `lcAuthDepth`, `lcOrderFulfillmentDepth`, `lcInventoryDepth`, `lcAnalyticsDepth`, `lcRbacBoundary` — each on its own line, matching the style of the existing calls
  - Ensure all functions are called inside the existing `try/finally` block (not outside it)
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 13.1, 13.3, 13.5, 13.6_

- [ ] 9. Implement Commission, Payment, and Notification lifecycles (LC-22, LC-23, LC-24)
  - [x] 9.1 Implement `lcCommission()` — LC-22
    - Call `GET /api/commission/sellers/:sellerId` [seller] → expect 200
    - Call `GET /api/commission/sellers/:sellerId/summary` [seller] → expect 200
    - Call `POST /api/commission/calculate` [admin] with `{ orderId, sellerId }` → expect 200, 201, or 422; store `commissionId` in `ctx.entities.commissionId`
    - Call `PUT /api/commission/:id/approve` [admin] if commissionId present → expect 200 or 400
    - Call `GET /api/commission/:id` [seller] if commissionId present → expect 200 or 404
    - Call `GET /api/commission/health` [seller] → expect 200
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5_

  - [x] 9.2 Implement `lcPayment()` — LC-23
    - Call `GET /api/payment/payment-methods` [buyer] → expect 200
    - Skip gate: if no `ctx.entities.orderId`, log skip for steps 2–4 and continue
    - Call `GET /api/payment/payments/order/:orderId` [buyer] → expect 200 or 404; extract paymentId
    - Call `GET /api/payment/payments/:paymentId` [buyer] if paymentId present → expect 200 or 404
    - Call `GET /api/payment/payments/:paymentId/status` [buyer] if paymentId present → expect 200 or 404
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 9.3 Implement `lcNotification()` — LC-24
    - Call `GET /api/notification/notifications` [buyer] → expect 200; extract first notificationId → `ctx.entities.notificationId`
    - Call `GET /api/notification/notifications/count` [buyer] → expect 200; log unread count
    - Call `PATCH /api/notification/notifications/:id/read` [buyer] if notificationId present → expect 200; log skip if absent
    - Call `GET /api/notification/notifications?page=1&limit=20&isRead=false` [buyer] → expect 200
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [ ] 10. Implement User Management and Training lifecycles (LC-25, LC-26)
  - [x] 10.1 Implement `lcUserManagement()` — LC-25
    - Call `GET /api/auth/admin/users` [admin] → expect 200; log total user count
    - Call `GET /api/user/:userId` [buyer] with buyer's own userId → expect 200
    - Call `PATCH /api/user/:userId` [buyer] with `{ "preferences": {} }` → expect 200 or 400
    - Call `GET /api/user/lookup` [admin] → expect 200
    - Call `GET /api/user/search` [admin] → expect 200
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 10.2 Implement `lcTraining()` — LC-26
    - Call `GET /api/training/api/v1/modules` [courier] → expect 200; extract first moduleId → `ctx.entities.trainingModuleId`
    - Skip gate: if no moduleId after step 1, log skip for remaining steps and return
    - Call `POST /api/training/api/v1/modules/:moduleId/start` [courier] → expect 200, 201, or 400; extract assessmentId from response
    - Call `POST /api/training/api/v1/assessments/:assessmentId/submit` [courier] if assessmentId present → expect 200, 201, or 400
    - Call `GET /api/training/certification` [courier] → expect 200 or 404
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 11. Implement Enabler, Business Registry Admin, and Catalog Admin lifecycles (LC-27, LC-28, LC-29)
  - [x] 11.1 Implement `lcEnabler()` — LC-27
    - Call `GET /api/enabler/enablers` [admin] → expect 200; extract first enablerId → `ctx.entities.enablerId`; log count
    - Skip gate: if no enablerId, log skip for steps 2–6 and return
    - Call `GET /api/enabler/enablers/:enablerId` [admin] → expect 200
    - Call `POST /api/enabler/enablers/:enablerId/listings` [admin] with `{ sellerId, enablerEnabled: true, enablerCommissionRate: 0.05, price }` (skip this sub-step if no productId) → expect 200, 201, or 400
    - Call `GET /api/enabler/enablers/:enablerId/capabilities` [admin] → expect 200 or 404
    - Call `GET /api/enabler/enablers/:enablerId/earnings` [admin] → expect 200 or 404
    - Call `POST /api/enabler/enablers/:enablerId/enforcement` [admin] with `{ action: "WARN", reason: "lifecycle-test" }` → expect 200, 201, or 400
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 24.1_

  - [x] 11.2 Implement `lcBusinessRegistryAdmin()` — LC-28
    - Call `GET /api/business-registry/businesses/search` [admin] → expect 200
    - Skip gate for steps 2–4: if no `ctx.entities.businessId`, log skip and continue (step 1 always runs)
    - Call `GET /api/business-registry/businesses/:businessId/compliance-records` [admin] → expect 200 or 404
    - Call `GET /api/business-registry/businesses/:businessId/documents` [admin] → expect 200 or 404
    - Call `POST /api/business-registry/businesses/:businessId/verify` [admin] → expect 200, 201, or 400
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

  - [x] 11.3 Implement `lcCatalogAdmin()` — LC-29
    - Call `GET /api/catalog/v1/pricing/analytics` [admin] → expect 200 or 404
    - Call `GET /api/catalog/match/pending` [admin] → expect 200
    - Call `GET /api/catalog/v1/admin/buy-box/history/:productId` [admin] if productId present → expect 200 or 404; log skip if absent
    - Call `GET /api/catalog/v1/admin/buy-box/anomaly-flags` [admin] → expect 200 or 404
    - Call `GET /api/catalog/v1/categories` [buyer] → expect 200
    - Call `GET /api/catalog/v1/search/products?q=test` [buyer] → expect 200
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6_

- [ ] 12. Implement Maps/COD OTP and Enabler Commission Attribution lifecycles (LC-30, LC-31)
  - [x] 12.1 Implement `lcMapsAndCodOtp()` — LC-30
    - Call `POST /api/maps/geocoding/geocode` [courier] with `{ "address": "Uhuru Street 1, Dar es Salaam, Tanzania" }` → expect 200, 400, or 422
    - Call `POST /api/maps/routing/calculate` [courier] with origin/destination coords → expect 200, 400, or 422
    - Skip gate for steps 3–4: if no `ctx.entities.deliveryId`, log skip and continue (steps 1–2 always run)
    - Call `POST /api/logistics/v1/cod/:deliveryId/otp` [courier] → expect 200, 201, or 400; extract OTP from response
    - Call `POST /api/logistics/v1/cod/:deliveryId/verify` [courier] with extracted OTP → expect 200, 201, or 400; skip if no OTP from step 3
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5_

  - [x] 12.2 Implement `lcEnablerCommissionAttribution()` — LC-31
    - Skip gate at top: if no `ctx.entities.enablerId`, log skip for all steps and return
    - Call `PUT /api/commission/:id/approve` [admin] if `ctx.entities.commissionId` present → expect 200 or 400
    - Call `GET /api/enabler/enablers/:enablerId/orders/:orderId/commission` [admin] if orderId present → expect 200 or 404; log `enablerCommission` and `commissionRate` from response
    - _Requirements: 24.2, 24.3, 24.4, 24.5_

- [x] 13. Wire LC-22 through LC-31 into main() and final validation
  - Extend the `try` block in `main()` to call all 10 remaining new functions in sequence: `lcCommission`, `lcPayment`, `lcNotification`, `lcUserManagement`, `lcTraining`, `lcEnabler`, `lcBusinessRegistryAdmin`, `lcCatalogAdmin`, `lcMapsAndCodOtp`, `lcEnablerCommissionAttribution`
  - Ensure all 31 lifecycle function calls are inside the same `try/finally` block
  - Verify the top-of-file block comment lists all LC-01 through LC-31 entries
  - Verify `cleanup()` handles `createdEntities.requests` (cancel each via `POST /api/request/requests/:id/cancel` [admin]) alongside existing ticket and cart cleanup
  - Confirm `process.exit(failed > 0 ? 1 : 0)` is unchanged
  - Ensure all tests pass, ask the user if questions arise.
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The script has no build step — changes take effect immediately when the file is saved
- Each new lifecycle function must follow the exact same structure as existing ones: `header()` call first, then `step()` calls, skip gates using `⏭️` icon and `{ ok: null }` push
- All new `ctx.entities` writes should happen immediately after extracting an ID from an API response (before any step that consumes it)
- 422 responses on create/transition steps are expected when test data does not satisfy business rules — always include them in the `expectedStatuses` array
- The `commissionId` from LC-22 is consumed by LC-31; `enablerId` from LC-27 is consumed by LC-31 — order matters
