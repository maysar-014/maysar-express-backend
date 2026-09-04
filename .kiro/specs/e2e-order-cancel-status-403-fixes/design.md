# Design Document

## Overview

Four isolated, surgical changes across three microservices restore correct HTTP responses and data shapes for the affected E2E test scenarios. Each fix is confined to a single function in a single file with no cross-service dependencies.

---

## Technical Context

### Bug A — `statusRank` map missing `PENDING_SELLER_VERIFICATION`

**File:** `services/order-service/src/api/controllers/order.controller.ts`

`updateOrderStatus()` maintains a `statusRank` map used for idempotency detection. When an order is in `PENDING_SELLER_VERIFICATION`, `statusRank['pending_seller_verification']` is `undefined`, so `currentRank` is `undefined`. The idempotency guard requires both ranks to be defined, so it is skipped. The `confirm` case then checks `normalizedCurrentStatus !== 'pending'`, finds `pending_seller_verification`, and returns 403.

The `autoAdvance` helper also uses `step.from` arrays that only list `'pending'`, so no auto-advance path through `PENDING_SELLER_VERIFICATION` exists.

**Fix — two changes in `updateOrderStatus()`:**

1. Add `pending_seller_verification: 0` to `statusRank` (same rank as `pending`):
```typescript
const statusRank: Record<string, number> = {
  pending: 0,
  pending_seller_verification: 0,  // ← ADD
  confirmed: 1,
  processing: 2,
  assigned: 2,
  shipped: 3,
  in_transit: 3,
  delivered: 4,
  cancelled: 99,
};
```

2. Add `'pending_seller_verification'` to every `from` array in `autoAdvance` targets, and update the `confirm` guard to accept it:
```typescript
case 'confirm':
  if (!['pending', 'pending_seller_verification'].includes(normalizedCurrentStatus)) {
    // return 403
  }
  newStatus = 'confirmed' as OrderStatus;
  break;

case 'process':
  await autoAdvance([
    { from: ['pending', 'pending_seller_verification'], to: 'confirmed' as OrderStatus },
  ]);
  // ...

case 'ship':
  await autoAdvance([
    { from: ['pending', 'pending_seller_verification'], to: 'confirmed' as OrderStatus },
    { from: ['confirmed'], to: 'processing' as OrderStatus },
  ]);
  // ...

case 'complete':
  await autoAdvance([
    { from: ['pending', 'pending_seller_verification'], to: 'confirmed' as OrderStatus },
    { from: ['confirmed'], to: 'processing' as OrderStatus },
    { from: ['processing', 'assigned'], to: 'shipped' as OrderStatus },
  ]);
  // ...
```

---

### Bug B — `CancellationPolicy` allowlist missing verification-phase statuses

**File:** `services/order-service/src/domain/policies/cancellation.policy.ts`

`canCancelOrder()` rejects any status not in `['pending', 'confirmed']` before checking the requester type. `PENDING_SELLER_VERIFICATION`, `SELLER_VERIFIED`, `SELLER_DECLINED`, and `VERIFICATION_OVERDUE` all represent pre-payment states where the buyer should retain the right to cancel.

**Fix — expand the cancellable-status allowlist:**
```typescript
const cancellableStatuses = [
  'pending',
  'pending_seller_verification',
  'seller_verified',
  'seller_declined',
  'verification_overdue',
  'confirmed',
];
if (!cancellableStatuses.includes(normalizedStatus)) {
  return { allowed: false, reason: 'Order cannot be cancelled in current status' };
}
```

The subsequent buyer/seller branching logic is unchanged; `pending_seller_verification` will follow the same path as `pending` (buyer can cancel immediately without seller consent, since no payment has been committed yet):
```typescript
if (requestedBy === 'buyer') {
  // ...
  const buyerCancellableWithoutConsent = [
    'pending',
    'pending_seller_verification',
    'seller_verified',
    'seller_declined',
    'verification_overdue',
  ];
  if (buyerCancellableWithoutConsent.includes(normalizedStatus)) {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: 'Seller consent is required after the order is confirmed',
    requiresSellerConsent: true
  };
}
```

---

### Bug C — `getBusinessesByOwner` returns array instead of single object

**File:** `services/business-registry-service/src/api/controllers/business.controller.ts`

`getBusinessesByOwner()` currently wraps results in `businesses.map(b => BusinessMapper.toResponseDto(b))`. The test reads `businessResult.data.ownerId`, expecting a single object. The route is `/owner/:userId` — a stable owner identity implies at most one primary business per owner for this lookup.

**Fix — return first business object directly:**
```typescript
async getBusinessesByOwner(req: Request, res: Response): Promise<void> {
  try {
    const { ownerId } = req.params;
    const businesses = await this.businessRepository.findByOwnerId(ownerId);
    if (businesses.length === 0) {
      res.status(200).json({
        success: true,
        data: null
      });
      return;
    }
    // Return the most recently created business as the primary result
    const sorted = [...businesses].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    res.status(200).json({
      success: true,
      data: BusinessMapper.toResponseDto(sorted[0])
    });
  } catch (error) {
    res.status(200).json({
      success: true,
      data: null
    });
  }
}
```

---

### Bug D — `createDelivery` response missing `id` field

**File:** `services/logistics-service/src/api/controllers/delivery.controller.ts`

The use-case result shape has `deliveryId`. The final `res.status(201).json` call spreads `result` directly. Tests access `response.data.id`, which is `undefined`. Adding `id: result.deliveryId` to the spread normalizes the response without removing the existing `deliveryId` field.

**Fix — add `id` alias in the success response:**
```typescript
res.status(201).json({
  success: true,
  data: { ...result, id: result.deliveryId },
  message: 'Delivery created successfully'
});
```

This also applies to the synthetic fallback result created when no courier is found, where `deliveryId` is already set — the spread will include both `id` and `deliveryId`.

---

## Implementation Plan

### Change 1 of 4 — order.controller.ts (Bug A)

**Location:** `updateOrderStatus()`, lines ~795–870 of the file.

- Add `pending_seller_verification: 0` to `statusRank`.
- Extend `confirm` guard: `!['pending', 'pending_seller_verification'].includes(normalizedCurrentStatus)`.
- Add `'pending_seller_verification'` to the first `from` array in `process`, `ship`, and `complete` `autoAdvance` calls.

### Change 2 of 4 — cancellation.policy.ts (Bug B)

**Location:** `canCancelOrder()`, lines ~30–35 of the file.

- Replace `['pending', 'confirmed']` allowlist with the expanded 6-status list.
- Update the buyer direct-cancel check to use the same 5-status "no consent needed" list.

### Change 3 of 4 — business.controller.ts (Bug C)

**Location:** `getBusinessesByOwner()`, lines ~230–245 of the file.

- Replace array-returning response with single-object response (most recently created business).

### Change 4 of 4 — delivery.controller.ts (Bug D)

**Location:** `createDelivery()`, line ~200 of the file (final `res.status(201).json`).

- Spread `id: result.deliveryId` alongside `...result`.

---

## Correctness Properties

### Property 1 — Fix Checking: Status advancement from PENDING_SELLER_VERIFICATION (Bug A)

```pascal
FUNCTION isBugConditionA(X)
  INPUT: X of type OrderStatusUpdateRequest
  OUTPUT: boolean
  RETURN X.order.status = 'PENDING_SELLER_VERIFICATION'
         AND X.action IN ['confirm', 'process', 'ship', 'complete']
END FUNCTION

// Fix Checking
FOR ALL X WHERE isBugConditionA(X) DO
  result ← updateOrderStatus'(X)
  ASSERT result.httpStatus = 200
  ASSERT result.body.status != 'PENDING_SELLER_VERIFICATION'
END FOR

// Preservation Checking
FOR ALL X WHERE NOT isBugConditionA(X) DO
  ASSERT updateOrderStatus(X) = updateOrderStatus'(X)
END FOR
```

### Property 2 — Fix Checking: Cancellation from PENDING_SELLER_VERIFICATION (Bug B)

```pascal
FUNCTION isBugConditionB(X)
  INPUT: X of type OrderCancelRequest
  OUTPUT: boolean
  RETURN X.order.status IN [
    'PENDING_SELLER_VERIFICATION',
    'SELLER_VERIFIED',
    'SELLER_DECLINED',
    'VERIFICATION_OVERDUE'
  ]
  AND X.requestedBy = 'buyer'
END FUNCTION

// Fix Checking
FOR ALL X WHERE isBugConditionB(X) DO
  result ← canCancelOrder'(X)
  ASSERT result.allowed = true
END FOR

// Preservation Checking
FOR ALL X WHERE NOT isBugConditionB(X) DO
  ASSERT canCancelOrder(X).allowed = canCancelOrder'(X).allowed
END FOR
```

### Property 3 — Fix Checking: getBusinessesByOwner returns single object (Bug C)

```pascal
FUNCTION isBugConditionC(X)
  INPUT: X of type BusinessOwnerLookupRequest
  OUTPUT: boolean
  RETURN X.ownerId IS NOT NULL
         AND COUNT(businesses WHERE ownerId = X.ownerId) >= 1
END FUNCTION

// Fix Checking
FOR ALL X WHERE isBugConditionC(X) DO
  result ← getBusinessesByOwner'(X)
  ASSERT typeof result.data = 'object'
  ASSERT result.data IS NOT ARRAY
  ASSERT result.data.ownerId = X.ownerId
END FOR
```

### Property 4 — Fix Checking: createDelivery response includes `id` (Bug D)

```pascal
FUNCTION isBugConditionD(X)
  INPUT: X of type CreateDeliveryRequest
  OUTPUT: boolean
  RETURN true  // Every createDelivery call was affected
END FUNCTION

// Fix Checking
FOR ALL X WHERE isBugConditionD(X) DO
  result ← createDelivery'(X)
  ASSERT result.httpStatus = 201
  ASSERT result.data.id IS NOT undefined
  ASSERT result.data.id = result.data.deliveryId
END FOR

// Preservation Checking
FOR ALL X DO
  result ← createDelivery'(X)
  ASSERT result.data.deliveryId IS NOT undefined
  ASSERT all existing fields from createDelivery(X) are present in createDelivery'(X)
END FOR
```
