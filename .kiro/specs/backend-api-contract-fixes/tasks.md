# Implementation Tasks — Backend API Contract Fixes

## Task List

- [x] 1. B1 — Checkout confirm: include `orderId` in response
  - [x] 1.1 Inject `checkoutOrderRepository` into `CheckoutController` constructor and ensure it is wired in the service factory / `main.ts`
  - [x] 1.2 In `CheckoutController.confirmCheckout`, after `saveSession`, upsert the checkout order record via `checkoutOrderRepository.findByCheckoutSessionId` / `createFromSession` and capture `orderId`
  - [x] 1.3 Merge `orderId` into the confirm response: `data: { ...CheckoutMapper.checkoutSessionToDTO(session), orderId }`
  - [x] 1.4 Update the idempotency cache to store the enriched response (with `orderId`) so repeated calls return the same value
  - [x] 1.5 Update `CheckoutMapper.checkoutSessionToDTO` to accept and pass through an optional `orderId` field (or keep the merge in the controller — either approach)
  - [x] 1.6 Write / update unit tests for `confirmCheckout` asserting `response.data.orderId` is present and non-null on success

- [x] 2. B2 — KYC: idempotent approve + consistent status field
  - [x] 2.1 In `AdminVerifyKycUseCase.execute`, add an idempotency guard before the `throw`: if `action === 'approve'` and `current.kycStatus === KycStatus.VERIFIED`, return `{ success: true, status: KycStatus.VERIFIED, level: current.kycLevel }` immediately
  - [x] 2.2 In `KycController.getStatus`, change the `status` alias to use `result.kycStatus ?? 'none'` so the field is never `undefined`
  - [x] 2.3 Write / update unit tests for `AdminVerifyKycUseCase` asserting that approve on an already-verified KYC returns 200 instead of throwing
  - [x] 2.4 Write / update unit tests for `KycController.getStatus` asserting `data.status` is always a defined string

- [x] 3. B3 — Catalog: backward-compatible `name` → `productName` alias
  - [x] 3.1 In `ProductController.createProduct`, add a pre-validation normalization: `if (!req.body.productName && req.body.name) req.body.productName = req.body.name`
  - [x] 3.2 Write / update unit tests asserting that a payload with `name` (no `productName`) passes validation and creates the product successfully

- [x] 4. B4 — Auth: remove implicit buyer-role injection from JWT
  - [x] 4.1 In `AuthenticateUserUseCase.resolveUserRoles`, remove the clause that prepends `'buyer'` to non-buyer, non-system accounts in the `normalizedRoles` branch
  - [x] 4.2 In `AuthenticateUserUseCase.resolveUserRoles`, remove the fallback clause `return ['buyer', fallbackRole]` — replace with `return [fallbackRole].filter(Boolean)`
  - [x] 4.3 Write / update unit tests asserting that a seller/courier/enabler/supplier account receives only its primary role in the JWT, not `['buyer', primaryRole]`
  - [x] 4.4 Write / update unit tests asserting that a buyer account still receives `['buyer']` and a system account still receives `['admin', 'system']`
