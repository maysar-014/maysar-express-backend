# Design Document — Backend API Contract Fixes

## Overview

Four targeted backend fixes across the checkout, KYC, catalog, and auth services. No database schema changes are required. All fixes are additive or logic-only changes with no breaking impact on existing callers.

---

## B1 — Checkout confirm must return `orderId`

### Root Cause

`CheckoutController.confirmCheckout` publishes an `OrderCreated` event and immediately returns
`CheckoutMapper.checkoutSessionToDTO(session)`. This DTO does not include `orderId`. The
checkout-service already has a `PrismaCheckoutOrderRepository` with `createFromSession` /
`findByCheckoutSessionId` and a `checkout_Order` table — it creates an internal checkout order
record when the `OrderCreated` event fires, but that happens asynchronously. At the time the HTTP
response is sent, the record does not yet exist.

### Fix

Make the checkout order record creation **synchronous** inside `confirmCheckout` — before the
response is sent — and return its `id` as `orderId`.

#### Files to change

**`services/checkout-service/src/api/controllers/checkout.controller.ts`**

The `confirmCheckout` method currently:
1. Saves session with `status: 'payment_pending'`
2. Publishes `OrderCreated` event (fire-and-forget)
3. Returns `CheckoutMapper.checkoutSessionToDTO(session)` — no `orderId`

Change to:
1. Save session with `status: 'payment_pending'`
2. **Upsert a checkout order record** via `checkoutOrderRepository.findByCheckoutSessionId` /
   `createFromSession` (already injected as optional `this.checkoutOrderRepository`)
3. Publish `OrderCreated` event (keep for downstream saga compatibility)
4. Return the DTO **plus** `orderId: checkoutOrder.id`

```ts
// In confirmCheckout, after saveSession:
let orderId: string | undefined;
if (this.checkoutOrderRepository) {
  let checkoutOrder = await this.checkoutOrderRepository.findByCheckoutSessionId(sessionId);
  if (!checkoutOrder) {
    checkoutOrder = await this.checkoutOrderRepository.createFromSession(session);
  }
  orderId = checkoutOrder.id;
}

const response = {
  success: true,
  data: { ...CheckoutMapper.checkoutSessionToDTO(session), orderId },
  timestamp: new Date()
};
```

**`services/checkout-service/src/application/mappers/checkout.mapper.ts`**

Update `checkoutSessionToDTO` to include an optional `orderId` field so callers that pass it
through the mapper can do so cleanly. The field is `| undefined` — no breaking change:

```ts
static checkoutSessionToDTO(session: any): any {
  return {
    ...existingFields,
    orderId: session.orderId ?? undefined  // populated when caller sets it
  };
}
```

Alternatively, keep the DTO merge in the controller (simpler, fewer changes).

**Constructor wiring**: The `CheckoutController` already accepts `checkoutOrderRepository` as an
optional fourth constructor argument. Ensure it is injected in `main.ts` / the service factory.

#### Correctness properties

- `POST /api/checkout/:id/confirm` response body MUST include a non-null `orderId` string when
  the session exists and the basket is valid.
- A second confirm on the same session (idempotent path) MUST return the same `orderId`.
- Error responses (404, 422) MUST NOT include `orderId`.

---

## B2 — KYC: consistent status endpoint + idempotent approve

### Root Cause (two-part)

**Part A — inconsistent `GET /api/kyc/status` shape**

`GetKycStatusUseCase.execute` returns `{ kycStatus, kycLevel, ... }` with no top-level `status`
field. `KycController.getStatus` already applies a partial fix:

```ts
res.status(200).json({ success: true, data: { ...result, status: result.kycStatus } });
```

This alias is present. However if the seed helper reads `response.data.status` (or
`response.status`) the result depends on the exact response unwrapping. The key issue is the alias
is already there — seed.ts must be reading the wrong path. **Verify** the seed reads `data.status`
not top-level `status`. No controller change needed for Part A if the alias is confirmed working;
add a defensive guard so `status` is always a non-undefined string (fall back to `'none'`).

```ts
// KycController.getStatus — reinforce the status alias
res.status(200).json({
  success: true,
  data: {
    ...result,
    status: result.kycStatus ?? 'none'   // explicit fallback — never undefined
  }
});
```

**Part B — `PATCH /api/kyc/admin/:userId` rejects approve on already-verified KYC**

`AdminVerifyKycUseCase.execute` throws `'User KYC must be pending'` when
`current.kycStatus !== KycStatus.PENDING`.

Add an **idempotency guard** for the `approve` action: if the KYC is already `VERIFIED`, return
the current status immediately instead of throwing.

#### Files to change

**`services/kyc-service/src/api/controllers/kyc.controller.ts`**

Reinforce `status` field:

```ts
res.status(200).json({
  success: true,
  data: { ...result, status: result.kycStatus ?? 'none' }
});
```

**`services/kyc-service/src/application/use-cases/admin-verify-kyc.use-case.ts`**

Change the strict pending guard to allow idempotent approve:

```ts
// Before (current):
if (current.kycStatus !== KycStatus.PENDING) {
  throw new Error('User KYC must be pending');
}

// After:
if (current.kycStatus !== KycStatus.PENDING) {
  // Idempotent approve: already verified — return current state without side effects
  if (input.action === 'approve' && current.kycStatus === KycStatus.VERIFIED) {
    return { success: true, status: KycStatus.VERIFIED, level: current.kycLevel };
  }
  throw new Error('User KYC must be pending');
}
```

This preserves the state machine for all other transitions (e.g. rejecting a verified KYC still
throws) while allowing re-approval to be safe and idempotent.

#### Correctness properties

- `GET /api/kyc/status` response body MUST include `data.status` as a non-undefined string from
  the set `{none, pending, under_review, verified, rejected}`.
- `PATCH /api/kyc/admin/:userId` with `action: 'approve'` on a `verified` KYC MUST return HTTP 200
  with `{ success: true, status: 'verified', level: N }`.
- `PATCH /api/kyc/admin/:userId` with `action: 'approve'` on a `rejected` KYC MUST still return
  HTTP 400.
- `PATCH /api/kyc/admin/:userId` with `action: 'reject'` on a `verified` KYC MUST still return
  HTTP 400 (state machine preserved).

---

## B3 — Catalog: `name` → `productName` backward-compatible alias

### Root Cause

`ProductController.validateStructuredCreateProductRequest` checks `!body.productName` and pushes
`'Product name is required'` when the caller sends `name` instead of `productName`. The legacy
`mapToCreateProductDto` private method maps `body.name` — but it is never called from
`createProduct` (which uses the structured DTO path directly via `const dto: StructuredCreateProductDto = req.body`).

### Fix

Before validation runs, normalize `body.name → body.productName` if `productName` is absent.
This is the minimal, non-breaking change.

#### Files to change

**`services/catalog-service/src/api/controllers/product.controller.ts`**

In `createProduct`, add a pre-validation normalization step:

```ts
async createProduct(req: Request, res: Response): Promise<void> {
  // Backward-compatible alias: name → productName
  if (!req.body.productName && req.body.name) {
    req.body.productName = req.body.name;
  }

  const validation = this.validateStructuredCreateProductRequest(req.body);
  // ... rest unchanged
}
```

This is the only change needed. The validator then sees `productName` populated. The DTO
assignment `const dto: StructuredCreateProductDto = req.body` picks up the normalized field.

#### Correctness properties

- `POST /api/catalog/v1/products` with `name` (no `productName`) and all other required fields
  MUST return HTTP 201 with `{ productId: '...' }`.
- `POST /api/catalog/v1/products` with `productName` explicitly set MUST continue to work as
  before (no double-write, no regression).
- `POST /api/catalog/v1/products` missing both `name` and `productName` MUST still return
  HTTP 422 `VALIDATION_ERROR`.

---

## B4 — JWT must not inject `BUYER` role into non-buyer accounts

### Root Cause

`AuthenticateUserUseCase.resolveUserRoles` explicitly prepends `'buyer'` to every non-buyer,
non-system account:

```ts
// Every non-buyer, non-system account also gets the base 'buyer' role
if (!roles.includes('buyer') && fallbackRole !== 'system' && !roles.includes('system') && !roles.includes('admin')) {
  roles = ['buyer', ...roles];
}
```

And in the fallback path:

```ts
// Non-buyer roles carry buyer as base role
if (fallbackRole && fallbackRole !== 'buyer') {
  return ['buyer', fallbackRole];
}
```

This means a seller account gets `['buyer', 'seller']`, causing the frontend middleware to detect
`selectablePortalRoles.length > 1` and redirect to `/en/select-role`.

### Fix

Remove the logic that injects `'buyer'` into non-buyer accounts. Each account carries only its
assigned role(s). The comment "Every non-buyer, non-system account also gets the base 'buyer' role"
reflects an intentional design decision that is now causing a regression — remove it.

#### Files to change

**`services/auth-service/src/application/use-cases/authenticate-user.use-case.ts`**

`resolveUserRoles` method — remove the buyer-injection clauses:

```ts
private resolveUserRoles(user: AuthUser): string[] {
  const metadataRoles = user.metadata?.roles;
  const candidateRoles = Array.isArray(metadataRoles)
    ? metadataRoles
    : typeof metadataRoles === 'string'
      ? metadataRoles.split(',')
      : [];
  const normalizedRoles = candidateRoles
    .map((role) => String(role).trim().toLowerCase())
    .filter(Boolean);

  const fallbackRole = String(user.role || '').trim().toLowerCase();

  if (normalizedRoles.length > 0) {
    let roles = normalizedRoles;
    // system users always get admin
    if (fallbackRole === 'system' && !normalizedRoles.includes('admin')) {
      roles = Array.from(new Set(['admin', 'system', ...normalizedRoles]));
    } else {
      roles = Array.from(new Set(normalizedRoles));
    }
    // REMOVED: buyer injection — each account carries only its assigned roles
    return roles;
  }

  // Fallback: derive from user.role
  if (fallbackRole === 'system') {
    return ['admin', 'system'];
  }

  // REMOVED: buyer injection in fallback path
  return [fallbackRole].filter(Boolean);
}
```

#### Business rule clarification

If the platform genuinely needs a seller to also be able to buy (dual role), that should be
explicitly configured per account, not applied globally to all non-buyer accounts. This fix makes
role assignment reflect what was actually configured, not an implicit default.

#### Correctness properties

- A seller account JWT MUST contain `roles: ['seller']` (or whatever roles are explicitly
  assigned), NOT `['buyer', 'seller']`.
- A buyer account JWT MUST still contain `roles: ['buyer']`.
- A system account JWT MUST still contain `roles: ['admin', 'system']`.
- An account with explicitly configured roles `['buyer', 'seller']` (dual-role) MUST still
  receive both roles — this fix only removes the *implicit* buyer injection, not explicit ones.

---

## Summary of Changes

| Bug | Service | File(s) | Change type |
|-----|---------|---------|-------------|
| B1  | checkout-service | `api/controllers/checkout.controller.ts` | Logic: upsert checkout order, include `orderId` in confirm response |
| B1  | checkout-service | `application/mappers/checkout.mapper.ts` | Optional: add `orderId` field to DTO |
| B2  | kyc-service | `api/controllers/kyc.controller.ts` | Defensive: `status` fallback to `'none'` |
| B2  | kyc-service | `application/use-cases/admin-verify-kyc.use-case.ts` | Logic: idempotent approve on `verified` KYC |
| B3  | catalog-service | `api/controllers/product.controller.ts` | Logic: `name → productName` alias before validation |
| B4  | auth-service | `application/use-cases/authenticate-user.use-case.ts` | Logic: remove implicit buyer-role injection |

No database migrations required. No API removals. All changes are strictly additive or corrective.
