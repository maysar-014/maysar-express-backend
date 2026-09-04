# Tasks

## Task List

- [x] 1. Fix Bug A — Add `pending_seller_verification` to `statusRank` and state machine in `order.controller.ts`
  - [x] 1.1 Add `pending_seller_verification: 0` entry to the `statusRank` map inside `updateOrderStatus()`
  - [x] 1.2 Update the `confirm` case guard to accept both `'pending'` and `'pending_seller_verification'` as valid from-states
  - [x] 1.3 Add `'pending_seller_verification'` to the first `from` array in each `autoAdvance` call inside `process`, `ship`, and `complete` cases

- [x] 2. Fix Bug B — Expand `CancellationPolicy` allowlist to include verification-phase statuses
  - [x] 2.1 Replace `['pending', 'confirmed']` status gate with the 6-status list that includes `pending_seller_verification`, `seller_verified`, `seller_declined`, `verification_overdue`
  - [x] 2.2 Update the buyer branch to allow direct cancellation (no seller consent) for the 5 pre-payment statuses: `pending`, `pending_seller_verification`, `seller_verified`, `seller_declined`, `verification_overdue`

- [ ] 3. Fix Bug C — Return single business object from `getBusinessesByOwner()` in `business.controller.ts`
  - [x] 3.1 Sort the returned businesses by `createdAt` descending and respond with `data: BusinessMapper.toResponseDto(sorted[0])` instead of an array
  - [x] 3.2 Handle the empty-result case by returning `data: null` (or empty object) rather than an empty array

- [x] 4. Fix Bug D — Add `id` field alias to `createDelivery` response in `delivery.controller.ts`
  - [x] 4.1 Change the success response from `data: result` to `data: { ...result, id: result.deliveryId }` so that `data.id` is always defined and equals `data.deliveryId`

- [ ] 5. Verify all changes with diagnostics and existing tests
  - [x] 5.1 Run TypeScript diagnostics on all four changed files to confirm no type errors
  - [ ] 5.2 Confirm existing unit tests for order cancellation and status logic still pass
