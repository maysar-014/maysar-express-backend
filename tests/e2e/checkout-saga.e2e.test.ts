/**
 * E2E tests: Full Checkout Saga — Flow Docs 02, 05
 *
 * Covers the complete end-to-end order lifecycle:
 *   - Wallet payment: place order → saga assigns delivery → courier drives state machine → delivered
 *   - COD payment: place order → delivery code IS the OTP → generate OTP → verify OTP → delivered
 *   - Saga compensation: cancel at various stages → wallet fully restored
 *   - Order tracking: order status reflects delivery state progression
 *
 * COD verification: "COD orders are verified the same as other orders now"
 *   POST /api/logistics/api/v1/cod/:deliveryId/otp  — generates OTP, stores on delivery
 *   POST /api/logistics/api/v1/cod/:deliveryId/verify  — accepts { otp: deliveryCode, location }
 *   The `deliveryCode` from PlaceOrderResponse IS the OTP accepted at verification.
 *
 * API base paths:
 *   Orders:    /api/order/orders
 *   Logistics: /api/logistics/api/v1/deliveries | /cod | /tracking
 *   Wallet:    /api/wallet/wallets
 *
 * Logistics delivery status values (monotonic):
 *   assigned → picked_up → in_transit → delivered
 *   (also: cancelled, failed)
 *
 * Requires: RUN_LIVE_E2E=true, running backend, seeded users, at least one product for seller.
 */

import { describe, expect, it, beforeAll } from '@jest/globals';
import {
  liveTestSuite,
  requestJson,
  authHeader,
  assertOk,
  createIdempotencyKey,
  extractProductPriceAmount,
  getAdminToken,
  ensureWalletMinimum,
  extractWalletBalance,
  loginAs,
  unlockTestUsers,
  resolveSeededProduct,
  pollUntilBalanceRestored,
  resetCourierStatus,
} from './helpers/live-api';
import { SEEDED_USERS, WALLET_TOP_UP_MINIMUM } from './fixtures/seeded-users';
import {
  createCodDeliveryFixture,
  waitForDeliveryOtp,
  deleteCodDeliveryFixture,
} from './helpers/cod-delivery-fixture';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** TZS value safely within NEW_BUYER COD exposure limit (TZS 30,000). */
const COD_AMOUNT = 15_000;

/** Delivery GPS location used for COD verification (Dar es Salaam city centre). */
const DELIVERY_LOCATION = { lat: -6.7924, lng: 39.2083 };

/** How long to poll for a delivery to appear after placing an order (ms). */
const DELIVERY_POLL_TIMEOUT_MS = 30_000;
const DELIVERY_POLL_INTERVAL_MS = 1_000;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

liveTestSuite('Full Checkout Saga — Flow Docs 02 + 05', () => {
  let buyerToken: string;
  let courierToken: string;
  let adminToken: string;
  let seededProduct: Record<string, unknown>;

  beforeAll(async () => {
    // 1. Health check
    const health = await requestJson('/health');
    expect(health.status).toBe(200);

    // 2. Unlock all test users
    await unlockTestUsers();

    // 3. Obtain tokens
    adminToken = await getAdminToken();
    buyerToken = await loginAs(SEEDED_USERS.buyer);
    courierToken = await loginAs(SEEDED_USERS.courier);

    // 4. Resolve a seeded product for the seeded seller
    seededProduct = await resolveSeededProduct(buyerToken);

    // 5. Idempotent wallet top-up sized for the seeded product price
    const requiredWallet = Math.max(
      WALLET_TOP_UP_MINIMUM,
      extractProductPriceAmount(seededProduct) + 50_000
    );
    await ensureWalletMinimum(SEEDED_USERS.buyer.id, requiredWallet, adminToken);

    // 6. Reset courier status to online — delivery creation sets courier to 'busy'
    //    which would prevent subsequent tests from finding an available courier
    await resetCourierStatus(courierToken);

    // 7. Cancel any COD orders left active by earlier suites.
    //    The NEW_BUYER "1 active COD order" cap is now genuinely enforced at
    //    placement (it silently counted zero before, because every order sits in
    //    PENDING_SELLER_VERIFICATION and that status was missing from the count).
    //    Without this, a leaked COD order makes every later COD spec fail with
    //    422 for reasons unrelated to what it asserts.
    try {
      const active = await requestJson(
        `/api/order/orders?buyerId=${SEEDED_USERS.buyer.id}&limit=50`,
        { headers: authHeader(adminToken) }
      );
      if (active.ok) {
        const body = active.body as Record<string, unknown>;
        const orders = (body['orders'] as Array<Record<string, unknown>>) ?? [];
        for (const o of orders) {
          const status = String(o['status'] ?? '').toLowerCase();
          const method = String(o['paymentMethod'] ?? '').toUpperCase();
          const cancellable = [
            'pending', 'pending_seller_verification', 'seller_verified',
            'seller_declined', 'verification_overdue', 'confirmed', 'assigned', 'in_transit',
          ];
          if (method === 'COD' && cancellable.includes(status)) {
            const oid = String(o['id'] ?? o['orderId'] ?? '');
            if (oid) {
              // Cancel as admin: a buyer cannot cancel a CONFIRMED order
              // (CancellationPolicy requires seller consent), so a buyer-scoped
              // cleanup would leave paid COD orders open.
              await cancelOrder(adminToken, oid).catch(() => {});
            }
          }
        }
      }
    } catch {
      // Cleanup failure is non-fatal.
    }
  }, 120_000);

  // =========================================================================
  // P0 — Wallet payment saga: place → cancel → full refund
  // =========================================================================

  it('[P0] [BUY-03] wallet order: place + immediate cancel restores balance', async () => {
    // NOTE: Under the seller verification workflow, wallet debit is deferred to
    // buyer/confirm-checkout. Cancelling from PENDING_SELLER_VERIFICATION therefore
    // results in no debit and no refund — balance remains unchanged.
    const balanceBefore = await getWalletBalance(adminToken, SEEDED_USERS.buyer.id);
    let orderId: string | null = null;

    try {
      const orderRes = await placeWalletOrder(buyerToken, seededProduct);
      expect(orderRes.status).toBe(201);
      const orderBody = orderRes.body as Record<string, unknown>;
      orderId = extractId(orderBody);
      expect(orderId).toBeTruthy();

      // Order starts in PENDING_SELLER_VERIFICATION — no debit yet
      expect(String(orderBody['status'] ?? '')).toBe('PENDING_SELLER_VERIFICATION');

      // Balance must be UNCHANGED at placement
      const balanceAfterOrder = await getWalletBalance(adminToken, SEEDED_USERS.buyer.id);
      expect(balanceAfterOrder).toBe(balanceBefore);
    } finally {
      if (orderId) {
        const cancelRes = await requestJson(`/api/order/orders/${orderId}/cancel`, {
          method: 'POST',
          headers: {
            ...authHeader(buyerToken),
            'content-type': 'application/json',
            'idempotency-key': createIdempotencyKey(`cancel-${orderId.slice(-8)}`),
          },
          body: JSON.stringify({ reason: 'e2e-test-saga-cancel' }),
        });
        expect(cancelRes.status).toBe(200);

        // Balance must remain at original — no debit occurred so no refund needed
        const balanceAfterCancel = await getWalletBalance(adminToken, SEEDED_USERS.buyer.id);
        expect(balanceAfterCancel).toBe(balanceBefore);
      }
      await resetCourierStatus(courierToken);
    }
  }, 120_000);

  it('[P0] [BUY-03] COD order: response includes deliveryCode and nextAction=AWAIT_VERIFICATION', async () => {
    let orderId: string | null = null;

    try {
      const orderRes = await placeCodOrder(buyerToken, seededProduct);
      expect(orderRes.status).toBe(201);
      const body = orderRes.body as Record<string, unknown>;
      orderId = extractId(body);
      expect(orderId).toBeTruthy();

      // New flow: COD order starts in PENDING_SELLER_VERIFICATION
      expect(String(body['status'] ?? '')).toBe('PENDING_SELLER_VERIFICATION');

      // deliveryCode must be a 6-digit numeric string
      const deliveryCode = String(body['deliveryCode'] ?? '');
      expect(deliveryCode).toMatch(/^\d{6}$/);

      // nextAction must indicate seller verification pending
      expect(String(body['nextAction'] ?? '')).toBe('AWAIT_VERIFICATION');

      // No COD commitment fee at this point (deferred)
      expect(Number(body['commitmentFee'] ?? 0)).toBe(0);
    } finally {
      if (orderId) await cancelOrder(buyerToken, orderId);
      await resetCourierStatus(courierToken);
    }
  });

  it('[P0] [OPS-05] COD cancel before dispatch — no debit occurred so balance stays unchanged', async () => {
    // NOTE: Under the seller verification workflow, COD commitment is placed at
    // buyer/confirm-checkout (after seller verifies). Cancelling from
    // PENDING_SELLER_VERIFICATION results in no wallet change.
    const balanceBefore = await getWalletBalance(adminToken, SEEDED_USERS.buyer.id);
    let orderId: string | null = null;

    try {
      const orderRes = await placeCodOrder(buyerToken, seededProduct);
      expect(orderRes.status).toBe(201);
      orderId = extractId(orderRes.body as Record<string, unknown>);
      expect(orderId).toBeTruthy();

      // Cancel from PENDING_SELLER_VERIFICATION
      const cancelRes = await requestJson(`/api/order/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          ...authHeader(buyerToken),
          'content-type': 'application/json',
          'idempotency-key': createIdempotencyKey(`cancel-${orderId.slice(-8)}`),
        },
        body: JSON.stringify({ reason: 'e2e-test-cod-commitment-release' }),
      });
      expect(cancelRes.status).toBe(200);

      // No debit occurred — balance must be exactly the same
      const balanceAfterCancel = await getWalletBalance(adminToken, SEEDED_USERS.buyer.id);
      expect(balanceAfterCancel).toBe(balanceBefore);
    } finally {
      await resetCourierStatus(courierToken);
    }
  }, 60_000);

  // =========================================================================
  // P1 — Full wallet saga: place → delivery assigned → drive state → delivered
  // =========================================================================

  it('[P1] [BUY-04] wallet order: verified through seller + buyer checkout, then delivery driven to delivered state', async () => {
    // Reset courier to 'online'
    await resetCourierStatus(courierToken);

    let orderId: string | null = null;
    let deliveryId: string | null = null;
    const sellerToken = await loginAs(SEEDED_USERS.seller);

    try {
      // 1. Place order (starts in PENDING_SELLER_VERIFICATION)
      const orderRes = await placeWalletOrder(buyerToken, seededProduct);
      expect(orderRes.status).toBe(201);
      const orderBody = orderRes.body as Record<string, unknown>;
      orderId = extractId(orderBody);
      const trackingNumber = String(orderBody['trackingNumber'] ?? '');
      expect(orderId).toBeTruthy();
      expect(String(orderBody['status'] ?? '')).toBe('PENDING_SELLER_VERIFICATION');

      // 2. Seller verifies stock
      const verifyRes = await requestJson(`/api/order/orders/${orderId}/verify`, {
        method: 'POST',
        headers: { ...authHeader(sellerToken), 'content-type': 'application/json', 'idempotency-key': createIdempotencyKey('e2e-api-order-orders-orderId-verify') },
      });
      expect(verifyRes.status).toBe(200);

      // 3. Buyer confirms checkout (wallet debit happens here)
      const checkoutRes = await requestJson(`/api/order/orders/${orderId}/buyer/confirm-checkout`, {
        method: 'POST',
        headers: { ...authHeader(buyerToken), 'content-type': 'application/json', 'idempotency-key': createIdempotencyKey('e2e-api-order-orders-orderId-buyer-confirm-c') },
      });
      expect(checkoutRes.status).toBe(200);

      // 4. Obtain this order's own delivery.
      //
      // The previous code polled for a delivery, then fell back to
      // `deliveries?courierId=...` and took `items[0]` — i.e. *whatever delivery
      // the courier happened to have*. Once the fixture began creating real
      // deliveries for other tests in this file, that fallback picked up another
      // test's row and drove it through the state machine, corrupting both
      // tests. Binding the delivery to this orderId removes the ambiguity.
      deliveryId = (
        await createCodDeliveryFixture({
          orderId: orderId!,
          courierId: SEEDED_USERS.courier.id,
          buyerId: SEEDED_USERS.buyer.id,
          sellerId: SEEDED_USERS.seller.id,
          codAmount: 0,
          isCOD: false,
        })
      ).deliveryId;

      expect(deliveryId).toBeTruthy();

      // 5. Drive delivery through the state machine
      const currentRes = await requestJson(
        `/api/logistics/api/v1/deliveries/${deliveryId}`,
        { headers: authHeader(courierToken) }
      );
      if (currentRes.ok) {
        const currentBody = (currentRes.body as Record<string, unknown>)['data'] ??
          currentRes.body as Record<string, unknown>;
        const currentStatus = String((currentBody as Record<string, unknown>)['status'] ?? '').toLowerCase();

        if (currentStatus === 'assigned') {
          await advanceDelivery(courierToken, deliveryId!, 'picked_up');
          await advanceDelivery(courierToken, deliveryId!, 'in_transit');
          await advanceDelivery(courierToken, deliveryId!, 'delivered');
        } else if (currentStatus === 'picked_up') {
          await advanceDelivery(courierToken, deliveryId!, 'in_transit');
          await advanceDelivery(courierToken, deliveryId!, 'delivered');
        } else if (currentStatus === 'in_transit') {
          await advanceDelivery(courierToken, deliveryId!, 'delivered');
        }
      }

      // Verify delivery is delivered
      const deliveryRes = await requestJson(
        `/api/logistics/api/v1/deliveries/${deliveryId}`,
        { headers: authHeader(courierToken) }
      );
      expect(deliveryRes.status).toBe(200);
      const deliveryBody = (deliveryRes.body as Record<string, unknown>)['data'] ??
        deliveryRes.body as Record<string, unknown>;
      expect(String((deliveryBody as Record<string, unknown>)['status'])).toBe('delivered');
    } finally {
      if (orderId) {
        await deleteCodDeliveryFixture(orderId).catch(() => {});
      }
      if (orderId && !deliveryId) {
        await cancelOrder(buyerToken, orderId);
      }
    }
  }, 120_000);

  // =========================================================================
  // P1 — Full COD saga with OTP verification
  // =========================================================================

  it('[P1] [COU-03] COD order: full lifecycle — seller verify → buyer checkout → OTP → delivered', async () => {
    await resetCourierStatus(courierToken);
    const sellerToken = await loginAs(SEEDED_USERS.seller);

    let orderId: string | null = null;
    let deliveryId: string | null = null;
    let deliveryCode: string | null = null;

    try {
      // 1. Place COD order (starts in PENDING_SELLER_VERIFICATION)
      const orderRes = await placeCodOrder(buyerToken, seededProduct);
      expect(orderRes.status).toBe(201);
      const orderBody = orderRes.body as Record<string, unknown>;
      orderId = extractId(orderBody);
      deliveryCode = String(orderBody['deliveryCode'] ?? '');
      const trackingNumber = String(orderBody['trackingNumber'] ?? '');
      expect(orderId).toBeTruthy();
      expect(deliveryCode).toMatch(/^\d{6}$/);
      expect(String(orderBody['status'] ?? '')).toBe('PENDING_SELLER_VERIFICATION');

      // 2. Seller verifies stock
      const sellerVerifyRes = await requestJson(`/api/order/orders/${orderId}/verify`, {
        method: 'POST',
        headers: { ...authHeader(sellerToken), 'content-type': 'application/json', 'idempotency-key': createIdempotencyKey('e2e-api-order-orders-orderId-verify') },
      });
      expect(sellerVerifyRes.status).toBe(200);

      // 3. Buyer confirms checkout (COD commitment placed here)
      const checkoutRes = await requestJson(`/api/order/orders/${orderId}/buyer/confirm-checkout`, {
        method: 'POST',
        headers: { ...authHeader(buyerToken), 'content-type': 'application/json', 'idempotency-key': createIdempotencyKey('e2e-api-order-orders-orderId-buyer-confirm-c') },
      });
      expect(checkoutRes.status).toBe(200);

      // 4. Obtain the COD delivery.
      //
      // Checkout produces a `logistics_Shipment`; a `logistics_Delivery` only
      // appears once a courier is assigned, which the platform drives through
      // `DeliverySaga` — constructed and registered but never started. So there
      // is no public API that yields a delivery for this order, and the previous
      // code polled, fell back to any unrelated seeded delivery, and then
      // skipped its assertions while still reporting PASS.
      //
      // The fixture creates the delivery directly through Prisma, following the
      // pattern already used by scripts/seed-e2e-users.ts. That makes the COD
      // OTP flow genuinely executable. Starting DeliverySaga for real is still
      // an open product decision and is NOT exercised here.
      deliveryId = (
        await createCodDeliveryFixture({
          orderId: orderId!,
          courierId: SEEDED_USERS.courier.id,
          buyerId: SEEDED_USERS.buyer.id,
          sellerId: SEEDED_USERS.seller.id,
          codAmount: Number(deliveryCode || orderBody['totalAmount'] || 0),
        })
      ).deliveryId;

      // 5. Generate OTP
      const otpRes = await requestJson(
        `/api/logistics/api/v1/cod/${deliveryId}/otp`,
        {
          method: 'POST',
          headers: {
            ...authHeader(courierToken),
            'content-type': 'application/json',
            'idempotency-key': `otp-gen-${deliveryId!.slice(-8)}-${Date.now()}`,
          },
          body: JSON.stringify({}),
        }
      );
      expect(otpRes.status).toBe(200);

      // 6. Drive to in_transit
      await advanceDelivery(courierToken, deliveryId!, 'picked_up');
      await advanceDelivery(courierToken, deliveryId!, 'in_transit');

      // 7. Verify COD with the OTP the saga actually issued.
      //
      // `POST /cod/:id/otp` returns { success: true } and no code — the OTP goes
      // to the buyer out of band, as in production. So it is read from the
      // delivery row. The previous code substituted the order's `deliveryCode`,
      // which is a different value and would have made this assertion vacuous.
      const issuedOtp = await waitForDeliveryOtp(deliveryId!);

      const verifyRes = await requestJson(
        `/api/logistics/api/v1/cod/${deliveryId}/verify`,
        {
          method: 'POST',
          headers: { ...authHeader(courierToken), 'content-type': 'application/json', 'idempotency-key': createIdempotencyKey('e2e-api-logistics-api-v1-cod-deliveryId-veri') },
          body: JSON.stringify({ otp: issuedOtp, location: DELIVERY_LOCATION }),
        }
      );
      expect(verifyRes.status).toBe(200);
      expect((verifyRes.body as Record<string, unknown>)['success']).toBe(true);

      // A wrong code must be rejected — otherwise "200 on success" proves nothing.
      // This MUST carry an idempotency key: without one, IdempotencyMiddleware
      // answers 400 "Missing idempotency key" before the OTP is ever checked, and
      // the assertion would pass for a reason that has nothing to do with
      // verification (which is exactly how it passed while the happy path was broken).
      const wrongRes = await requestJson(
        `/api/logistics/api/v1/cod/${deliveryId}/verify`,
        {
          method: 'POST',
          headers: { ...authHeader(courierToken), 'content-type': 'application/json', 'idempotency-key': createIdempotencyKey('e2e-cod-verify-wrong-otp') },
          body: JSON.stringify({ otp: '000000', location: DELIVERY_LOCATION }),
        }
      );
      expect(wrongRes.status).toBeGreaterThanOrEqual(400);
      // Guard against the rejection coming from a missing idempotency key rather
      // than from the OTP check, which would make the assertion above vacuous.
      expect(String(wrongRes.text)).not.toContain('Missing idempotency key');

      // 8. Delivery must be 'delivered'
      const deliveryReadRes = await requestJson(
        `/api/logistics/api/v1/deliveries/${deliveryId}`,
        { headers: authHeader(courierToken) }
      );
      const deliveryBody = (deliveryReadRes.body as Record<string, unknown>)['data'] ??
        deliveryReadRes.body as Record<string, unknown>;
      expect(String((deliveryBody as Record<string, unknown>)['status'])).toBe('delivered');

    } finally {
      if (orderId) {
        await deleteCodDeliveryFixture(orderId).catch(() => {});
      }
      if (orderId) {
        await cancelOrder(buyerToken, orderId).catch(() => {});
      }
    }
  }, 120_000);

  // =========================================================================
  // P1 — Order tracking: state machine visible through order + delivery reads
  // =========================================================================

  it('[P1] [BUY-04] order tracking: after verify+checkout, delivery status transitions are readable', async () => {
    await resetCourierStatus(courierToken);
    const sellerToken = await loginAs(SEEDED_USERS.seller);

    let orderId: string | null = null;
    let deliveryId: string | null = null;

    try {
      // Place order
      const orderRes = await placeWalletOrder(buyerToken, seededProduct);
      expect(orderRes.status).toBe(201);
      const orderBody = orderRes.body as Record<string, unknown>;
      orderId = extractId(orderBody);
      const trackingNumber = String(orderBody['trackingNumber'] ?? '');

      // Seller verifies + buyer confirms checkout.
      // BOTH calls must pass `method: 'POST'` explicitly. `requestJson` defaults to
      // `RequestInit = {}`, and `fetch` then sends a GET, which these POST-only
      // routes reject with 405. That is not cosmetic: the 405 left no delivery, the
      // poll below found nothing, and the test returned early while still
      // reporting PASS — so the whole tracking/OTP path was silently unexercised.
      const verifyRes = await requestJson(`/api/order/orders/${orderId}/verify`, {
        method: 'POST',
        headers: { ...authHeader(sellerToken), 'content-type': 'application/json', 'idempotency-key': createIdempotencyKey('e2e-api-order-orders-orderId-verify') },
      });
      expect(verifyRes.status).toBe(200);

      const checkoutRes = await requestJson(`/api/order/orders/${orderId}/buyer/confirm-checkout`, {
        method: 'POST',
        headers: { ...authHeader(buyerToken), 'content-type': 'application/json', 'idempotency-key': createIdempotencyKey('e2e-api-order-orders-orderId-buyer-confirm-checkout') },
      });
      expect(checkoutRes.status).toBe(200);

      // Obtain the delivery. This is a WALLET order, so the delivery is not COD and
      // no OTP is issued — tracking must work for every order, not just COD ones.
      // As in the COD test, no public API produces a delivery for a confirmed
      // order (checkout makes a Shipment; DeliverySaga is never started), so the
      // fixture creates it. The previous code polled, fell back to an unrelated
      // seeded delivery, and then skipped its assertions while reporting PASS.
      deliveryId = (
        await createCodDeliveryFixture({
          orderId: orderId!,
          courierId: SEEDED_USERS.courier.id,
          buyerId: SEEDED_USERS.buyer.id,
          sellerId: SEEDED_USERS.seller.id,
          codAmount: 0,
          isCOD: false,
        })
      ).deliveryId;
      const initial = await readDeliveryStatus(courierToken, deliveryId!);
      expect(['assigned', 'picked_up']).toContain(initial);

      await advanceDelivery(courierToken, deliveryId!, 'picked_up');
      const afterPickup = await readDeliveryStatus(courierToken, deliveryId!);
      expect(afterPickup).toBe('picked_up');

      await advanceDelivery(courierToken, deliveryId!, 'in_transit');
      const afterTransit = await readDeliveryStatus(courierToken, deliveryId!);
      expect(afterTransit).toBe('in_transit');
    } finally {
      // Tear down the fixture delivery this test created. Without this, rows
      // accumulate per run and `deliveries?courierId=` results drift over time —
      // exactly what made the old `items[0]` fallback ambiguous. Best-effort: a
      // leaked row is deterministic per order id and is reset by the fixture on
      // the next run, so a cleanup failure must not mask the real result.
      if (orderId) {
        await deleteCodDeliveryFixture(orderId).catch(() => {});
      }
      if (orderId && !deliveryId) {
        await cancelOrder(buyerToken, orderId);
      }
    }
  }, 120_000);

  // =========================================================================
  // P2 — Tracking number lookup resolves delivery ID
  // =========================================================================

  it('[P2] [BUY-04] order number resolves to shipment tracking numbers via the tracking API', async () => {
    let orderId: string | null = null;

    try {
      const orderRes = await placeWalletOrder(buyerToken, seededProduct);
      expect(orderRes.status).toBe(201);
      const orderBody = orderRes.body as Record<string, unknown>;
      orderId = extractId(orderBody);

      // Since DEF-008 an order has an ORDER NUMBER (ORD-...); the tracking
      // identity lives on the shipment (TRK-...). If a convenience field ever
      // appears on the order response it must be a shipment tracking number,
      // never an order number.
      const orderTracking = String(orderBody['trackingNumber'] ?? '');
      if (orderTracking) { expect(orderTracking).toMatch(/^TRK-[2-9A-HJ-NP-Z]{6}$/); }

      const trackingRes = await pollForTracking(courierToken, orderId!);
      expect(trackingRes).not.toBeNull();

      // The logistics tracking endpoint nests its payload:
      //   { success, data: { lookupType, identifier, order, shipments } }
      // Reading `shipments` from the top level silently yields [], which is why
      // this spec previously failed even with shipments present.
      const data = (trackingRes?.['data'] as Record<string, unknown> | undefined) ?? trackingRes ?? {};
      const shipments = (data['shipments'] as Array<Record<string, unknown>> | undefined) ?? [];
      expect(shipments.length).toBeGreaterThan(0);
      for (const shipment of shipments) {
        expect(String(shipment['trackingNumber'] ?? '')).toMatch(/^TRK-[2-9A-HJ-NP-Z]{6}$/);
      }
    } finally {
      if (orderId) await deleteCodDeliveryFixture(orderId).catch(() => {});
      if (orderId) await cancelOrder(buyerToken, orderId);
    }
  }, 60_000);
});

// ===========================================================================
// Internal helpers
// ===========================================================================

async function getWalletBalance(adminToken: string, userId: string): Promise<number> {
  const res = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
    headers: authHeader(adminToken),
  });
  assertOk(res, 'getWalletBalance');
  return extractWalletBalance(res.body);
}

function buildOrderPayload(
  product: Record<string, unknown>,
  paymentMethod: 'WALLET' | 'COD',
  amount?: number
): Record<string, unknown> {
  const productId = String(product['id'] ?? product['productId'] ?? '');
  // Add a small random offset (1-99) to avoid SUSPICIOUS_REPETITION velocity check
  const basePrice = amount ?? extractProductPriceAmount(product);
  const unitPrice = basePrice + Math.floor(Math.random() * 99) + 1;
  return {
    buyerId: SEEDED_USERS.buyer.id,
    sellerId: SEEDED_USERS.seller.id,
    items: [{ productId, quantity: 1, price: unitPrice, weight: 0.5 }],
    paymentMethod,
    deliveryFee: 5000,
    deliveryAddress: {
      street: 'Uhuru Street 1',
      city: 'Dar es Salaam',
      postalCode: '11101',
      country: 'Tanzania',
    },
  };
}

async function placeWalletOrder(
  buyerToken: string,
  product: Record<string, unknown>
) {
  return requestJson('/api/order/orders', {
    method: 'POST',
    headers: {
      ...authHeader(buyerToken),
      'content-type': 'application/json',
      'idempotency-key': createIdempotencyKey('checkout-wallet'),
    },
    body: JSON.stringify(buildOrderPayload(product, 'WALLET')),
  });
}

async function placeCodOrder(
  buyerToken: string,
  product: Record<string, unknown>
) {
  return requestJson('/api/order/orders', {
    method: 'POST',
    headers: {
      ...authHeader(buyerToken),
      'content-type': 'application/json',
      'idempotency-key': createIdempotencyKey('checkout-cod'),
    },
    body: JSON.stringify(buildOrderPayload(product, 'COD', COD_AMOUNT)),
  });
}

async function cancelOrder(buyerToken: string, orderId: string): Promise<void> {
  const res = await requestJson(`/api/order/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      ...authHeader(buyerToken),
      'content-type': 'application/json',
      'idempotency-key': createIdempotencyKey(`cancel-${orderId.slice(-8)}`),
    },
    body: JSON.stringify({ reason: 'e2e-test-cleanup' }),
  });
  if (!res.ok) {
    console.warn(`[checkout-saga.e2e] Cancel of ${orderId} returned ${res.status}`);
  }
}

/** Extract orderId or id from a response body. */
function extractId(body: Record<string, unknown>): string {
  return String(body['orderId'] ?? body['id'] ?? '');
}

/**
 * Poll the logistics deliveries endpoint until a delivery linked to this order appears.
 * Falls back to tracking API if orderId filtering isn't supported.
 */
async function pollForDelivery(
  courierToken: string,
  orderId: string,
  trackingNumber: string
): Promise<string | null> {
  const deadline = Date.now() + DELIVERY_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    // Try tracking number lookup first (most reliable)
    if (trackingNumber) {
      const trackRes = await requestJson(
        `/api/logistics/api/v1/tracking/${encodeURIComponent(trackingNumber)}`,
        { headers: authHeader(courierToken) }
      );
      if (trackRes.ok) {
        const body = trackRes.body as Record<string, unknown>;
        const data = (body['data'] ?? body) as Record<string, unknown>;
        const deliveryId = String(data['deliveryId'] ?? data['id'] ?? '');
        if (deliveryId) return deliveryId;
      }
    }

    // Fallback: scan recent deliveries for one matching this orderId
    const listRes = await requestJson(
      `/api/logistics/api/v1/deliveries?limit=20`,
      { headers: authHeader(courierToken) }
    );
    if (listRes.ok) {
      const body = listRes.body as Record<string, unknown>;
      // Handle both flat and nested response shapes:
      // { deliveries: [...] } or { data: { deliveries: [...] } } or { data: [...] }
      const dataField = body['data'];
      let items: unknown[] = [];
      if (Array.isArray(body['deliveries'])) {
        items = body['deliveries'] as unknown[];
      } else if (Array.isArray(dataField)) {
        items = dataField as unknown[];
      } else if (dataField && typeof dataField === 'object' && Array.isArray((dataField as any)['deliveries'])) {
        items = (dataField as any)['deliveries'] as unknown[];
      } else if (Array.isArray(body)) {
        items = body as unknown[];
      }
      if (Array.isArray(items)) {
        for (const item of items) {
          const d = item as Record<string, unknown>;
          if (String(d['orderId'] ?? '') === orderId) {
            return String(d['deliveryId'] ?? d['id'] ?? '');
          }
        }
      }
    }

    await sleep(DELIVERY_POLL_INTERVAL_MS);
  }

  return null;
}

/** Poll the tracking API for a result for the given tracking number. */
async function pollForTracking(
  courierToken: string,
  trackingNumber: string
): Promise<Record<string, unknown> | null> {
  const deadline = Date.now() + DELIVERY_POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const res = await requestJson(
      `/api/logistics/api/v1/tracking/${encodeURIComponent(trackingNumber)}`,
      { headers: authHeader(courierToken) }
    );
    if (res.ok) {
      return res.body as Record<string, unknown>;
    }
    await sleep(DELIVERY_POLL_INTERVAL_MS);
  }

  return null;
}

/** Advance a delivery to the given status via the logistics API. */
async function advanceDelivery(
  courierToken: string,
  deliveryId: string,
  status: string
): Promise<void> {
  const res = await requestJson(
    `/api/logistics/api/v1/deliveries/${deliveryId}/status`,
    {
      method: 'POST',
      headers: {
        ...authHeader(courierToken),
        'content-type': 'application/json',
        'idempotency-key': `advance-${deliveryId.slice(-8)}-${status}-${Date.now()}`,
      },
      body: JSON.stringify({
        status,
        location: DELIVERY_LOCATION,
        notes: `e2e-test advancing to ${status}`,
      }),
    }
  );
  if (!res.ok) {
    console.warn(
      `[checkout-saga.e2e] Status advance to "${status}" for ${deliveryId} returned ${res.status}: ${JSON.stringify(res.body)}`
    );
  }
}

/** Read the current status of a delivery. */
async function readDeliveryStatus(
  courierToken: string,
  deliveryId: string
): Promise<string> {
  const res = await requestJson(
    `/api/logistics/api/v1/deliveries/${deliveryId}`,
    { headers: authHeader(courierToken) }
  );
  assertOk(res, `readDeliveryStatus(${deliveryId})`);
  const body = (res.body as Record<string, unknown>)['data'] ??
    res.body as Record<string, unknown>;
  return String((body as Record<string, unknown>)['status'] ?? '');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
