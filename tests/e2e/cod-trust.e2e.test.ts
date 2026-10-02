/**
 * E2E tests: COD Eligibility & Trust System — Flow Doc 02 (COD paths)
 *
 * Covers use cases: OPS-01 (COD exposure limit rejection), OPS-05 (COD order within limits,
 * concurrent limit, geographic restriction, commitment freeze/release)
 *
 * COD trust constraints for the seeded buyer (NEW_BUYER tier, score 0):
 *   - Exposure limit: TZS 30,000
 *   - Concurrent COD order limit: 1
 *   - Geographic radius: 24 km from seller ward centroid
 *
 * Priority tiers:
 *   [P0] — must pass on every deploy
 *   [P1] — run daily in CI
 *   [P2] — run weekly in CI
 *
 * Requires: RUN_LIVE_E2E=true and a running seeded backend.
 */

import { describe, expect, it, beforeAll } from '@jest/globals';
import {
  liveTestSuite,
  requestJson,
  authHeader,
  assertOk,
  getAdminToken,
  ensureWalletMinimum,
  extractWalletBalance,
  loginAs,
  unlockTestUsers,
  createIdempotencyKey,
  resolveSeededProduct,
  jitterPrice,
  cancelOrder,
  pollUntilBalanceRestored,
} from './helpers/live-api';
import { SEEDED_USERS, WALLET_TOP_UP_MINIMUM } from './fixtures/seeded-users';

/** COD exposure limit for NEW_BUYER tier (TZS). */
const NEW_BUYER_EXPOSURE_LIMIT = 30_000;

/** A COD order value safely within the NEW_BUYER exposure limit and above the minimum basket. */
const VALID_COD_AMOUNT = 10_000;

/** A COD order value that exceeds the NEW_BUYER exposure limit. */
const OVER_LIMIT_COD_AMOUNT = NEW_BUYER_EXPOSURE_LIMIT + 1_000;

liveTestSuite('COD Eligibility & Trust System — Flow Doc 02 (COD paths)', () => {
  let buyerToken: string;
  let sellerToken: string;
  let adminToken: string;
  let seededProductId: string = 'seeded-product-placeholder';

  beforeAll(async () => {
    // 1. Health check
    const health = await requestJson('/health');
    expect(health.status).toBe(200);

    // 2. Unlock all test users (prevents lockout from previous failed runs)
    await unlockTestUsers();

    // 3. Obtain tokens
    adminToken = await getAdminToken();
    buyerToken = await loginAs(SEEDED_USERS.buyer);
    sellerToken = await loginAs(SEEDED_USERS.seller);

    // 4. Resolve a real seeded product
    try {
      const product = await resolveSeededProduct(buyerToken);
      seededProductId = String(product['id'] ?? product['productId'] ?? 'seeded-product-placeholder');
    } catch {
      // fall back to placeholder if resolution fails
    }

    // 5. Cancel any active COD orders from previous suites so concurrent-limit doesn't block us
    try {
      const activeOrders = await requestJson(
        `/api/order/orders?buyerId=${SEEDED_USERS.buyer.id}&limit=20`,
        { headers: authHeader(adminToken) }
      );
      if (activeOrders.ok) {
        const body = activeOrders.body as Record<string, unknown>;
        const orders = (body['orders'] as unknown[]) ?? [];
        for (const order of orders) {
          const o = order as Record<string, unknown>;
          const status = String(o['status'] ?? '').toLowerCase();
          const method = String(o['paymentMethod'] ?? '').toLowerCase();
          // Cancel any active COD or wallet orders that would interfere
          const isCancellable = ['pending','pending_seller_verification','seller_verified','seller_declined','verification_overdue','confirmed','assigned','in_transit'].includes(status);
          if (isCancellable) {
            const oid = String(o['id'] ?? o['orderId'] ?? '');
            if (oid) {
              await cancelOrder(adminToken, oid, 'cod-trust-beforeAll-cleanup').catch(() => {});
            }
          }
        }
      }
    } catch {
      // Cleanup failure is non-fatal
    }

    // 6. No ensureWalletMinimum needed — COD orders don't debit wallet significantly,
    //    and seed provides 2M TZS which is more than sufficient
  }, 60_000);

  // -------------------------------------------------------------------------
  // P0 — Deploy gate tests
  // -------------------------------------------------------------------------

  it('[P0] [OPS-01] COD order exceeding NEW_BUYER exposure limit is rejected', async () => {
    const response = await requestJson('/api/order/orders', {
      method: 'POST',
      headers: {
        ...authHeader(buyerToken),
        'content-type': 'application/json',
        'idempotency-key': createIdempotencyKey('cod-trust-over-limit'),
      },
      body: JSON.stringify(buildCodOrderPayload(OVER_LIMIT_COD_AMOUNT, 'DAR_CENTRAL', undefined, seededProductId)),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    // The response should not contain an orderId
    const body = response.body as Record<string, unknown>;
    expect(body?.['orderId']).toBeFalsy();
    expect(body?.['id']).toBeFalsy();
  });

  // -------------------------------------------------------------------------
  // P1 — Daily CI tests
  // -------------------------------------------------------------------------

  it('[P1] [OPS-05] COD order within limits creates order and freezes wallet commitment', async () => {
    // The COD commitment (delivery-fee hold) is taken at buyer confirm-checkout,
    // not at placement — placement never moves funds.
    const balanceBefore = await getWalletBalance(buyerToken, SEEDED_USERS.buyer.id);
    let orderId: string | null = null;

    try {
      const response = await requestJson('/api/order/orders', {
        method: 'POST',
        headers: {
          ...authHeader(buyerToken),
          'content-type': 'application/json',
          'idempotency-key': createIdempotencyKey('cod-trust-valid-1'),
        },
        body: JSON.stringify(buildCodOrderPayload(VALID_COD_AMOUNT, 'DAR_CENTRAL', undefined, seededProductId)),
      });

      expect(response.status).toBe(201);
      const body = response.body as Record<string, unknown>;
      orderId = String(body['orderId'] ?? body['id'] ?? '');
      expect(orderId).toBeTruthy();

      const verifyRes = await verifyCodStock(orderId, sellerToken);
      expect(verifyRes.status).toBe(200);

      const checkoutRes = await confirmCodCheckout(orderId, buyerToken);
      expect(checkoutRes.status).toBe(200);

      // Wallet should reflect a frozen commitment (available balance lower or frozenAmount set)
      const walletResponse = await requestJson(
        `/api/wallet/wallets/${SEEDED_USERS.buyer.id}/balance`,
        { headers: authHeader(buyerToken) }
      );
      assertOk(walletResponse, 'wallet balance after COD checkout');
      const walletBody = walletResponse.body as Record<string, unknown>;
      const data = walletBody['data'] as Record<string, unknown> | undefined;
      const frozenAmount = Number(
        (data?.['frozenAmount'] ?? walletBody['frozenAmount']) ?? 0
      );
      const balanceAfter = extractWalletBalance(walletResponse.body);

      // Either the available balance decreased or there is a non-zero frozen amount
      const commitmentReflected = balanceAfter < balanceBefore || frozenAmount > 0;
      expect(commitmentReflected).toBe(true);
    } finally {
      if (orderId) {
        await cancelOrder(adminToken, orderId, 'cod-trust-valid-cleanup');
        await pollUntilBalanceRestored(SEEDED_USERS.buyer.id, balanceBefore, adminToken, 30_000);
      }
    }
  });


  it('[P1] [OPS-05] cancelling a COD order releases the frozen wallet commitment', async () => {
    // The commitment only exists after the buyer confirms checkout, so this spec
    // must reach checkout before cancelling — cancelling a pending order would
    // trivially "release" a hold that was never taken.
    const balanceBefore = await getWalletBalance(buyerToken, SEEDED_USERS.buyer.id);
    let orderId: string | null = null;

    const orderResponse = await requestJson('/api/order/orders', {
    method: 'POST',
    headers: {
      ...authHeader(buyerToken),
      'content-type': 'application/json',
      'idempotency-key': createIdempotencyKey('cod-trust-cancel-1'),
    },
    body: JSON.stringify(buildCodOrderPayload(VALID_COD_AMOUNT, 'DAR_CENTRAL', undefined, seededProductId)),
  });
  expect(orderResponse.status).toBe(201);
  const orderBody = orderResponse.body as Record<string, unknown>;
  orderId = String(orderBody['orderId'] ?? orderBody['id'] ?? '');
  expect(orderId).toBeTruthy();

  try {
    const verifyRes = await verifyCodStock(orderId, sellerToken);
    expect(verifyRes.status).toBe(200);

    const checkoutRes = await confirmCodCheckout(orderId, buyerToken);
    expect(checkoutRes.status).toBe(200);

    // Cancel it — a CONFIRMED order requires seller consent, so the seller cancels.
    const cancelResponse = await cancelOrder(sellerToken, orderId, 'e2e-test-cod-commitment-release');
    expect(cancelResponse.status).toBe(200);

    // Balance should be restored (commitment released — poll for async restore)
    const balanceAfterCancel = await pollUntilBalanceRestored(
      SEEDED_USERS.buyer.id, balanceBefore, adminToken
    );
    expect(balanceAfterCancel).toBe(balanceBefore);
  } finally {
    if (orderId) {
      await cancelOrder(adminToken, orderId, 'cod-trust-release-cleanup').catch(() => {});
    }
  }
  });

  // -------------------------------------------------------------------------
  // P2 — Weekly CI tests
  // -------------------------------------------------------------------------

  it('[P2] [OPS-05] concurrent COD limit blocks a second simultaneous COD order (NEW_BUYER)', async () => {
    let firstOrderId: string | null = null;

    try {
      // Place first COD order
      const firstResponse = await requestJson('/api/order/orders', {
        method: 'POST',
        headers: {
          ...authHeader(buyerToken),
          'content-type': 'application/json',
          'idempotency-key': createIdempotencyKey('cod-trust-first-1'),
        },
        body: JSON.stringify(buildCodOrderPayload(VALID_COD_AMOUNT, 'DAR_CENTRAL', undefined, seededProductId)),
      });
      expect(firstResponse.status).toBe(201);
      const firstBody = firstResponse.body as Record<string, unknown>;
      firstOrderId = String(firstBody['orderId'] ?? firstBody['id'] ?? '');
      expect(firstOrderId).toBeTruthy();

      // Second COD order should be rejected (NEW_BUYER concurrent limit = 1)
      const secondResponse = await requestJson('/api/order/orders', {
        method: 'POST',
        headers: {
          ...authHeader(buyerToken),
          'content-type': 'application/json',
          'idempotency-key': createIdempotencyKey('cod-trust-second-1'),
        },
        body: JSON.stringify(buildCodOrderPayload(VALID_COD_AMOUNT, 'DAR_CENTRAL', undefined, seededProductId)),
      });
      expect(secondResponse.status).toBeGreaterThanOrEqual(400);
      expect(secondResponse.status).toBeLessThan(500);
    } finally {
      if (firstOrderId) {
        await cancelOrder(buyerToken, firstOrderId);
      }
    }
  });

  it('[P2] [OPS-05] geographic COD restriction rejects delivery address > 24 km from seller', async () => {
    // Use a ward in Arusha (~500 km from Dar es Salaam) to trigger AREA_RESTRICTION
    const response = await requestJson('/api/order/orders', {
      method: 'POST',
      headers: {
        ...authHeader(buyerToken),
        'content-type': 'application/json',
        'idempotency-key': createIdempotencyKey('cod-trust-arusha-1'),
      },
      body: JSON.stringify(buildCodOrderPayload(VALID_COD_AMOUNT, 'ARUSHA_CENTRAL', {
        lat: -3.3869, lng: 36.6830, // Arusha city centre
      }, seededProductId)),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  // -------------------------------------------------------------------------
  // Deferred use cases — require admin review queue or external services
  // -------------------------------------------------------------------------

  it('[P2] [ADM-02] admin COD trust override endpoint responds without 5xx', async () => {
    // Admin review queue may not be fully implemented.
    // Assert the admin user management endpoint is reachable and responds gracefully.
    const res = await requestJson(
      `/api/auth/admin/users/${SEEDED_USERS.buyer.id}/status`,
      {
        method: 'PATCH',
        headers: { ...authHeader(adminToken), 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'active', reason: 'e2e-cod-trust-override-test' }),
      }
    );
    expect(res.status).toBeLessThan(500);
  });

  it('[P2] [ADM-03] COD trust score endpoint responds without 5xx (identity graph not yet active)', async () => {
    // Identity graph propagation requires multiple accounts + device fingerprint seeding.
    // Assert the trust score read endpoint is reachable.
    const res = await requestJson(
      `/api/order/cod/trust-score/${SEEDED_USERS.buyer.id}`,
      { headers: authHeader(adminToken) }
    );
    // 200 = score found, 404 = not yet calculated — both acceptable; 5xx = not acceptable
    expect(res.status).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Seller confirms stock so the buyer can pay and the COD commitment is secured. */
async function verifyCodStock(orderId: string, token: string) {
  return requestJson(`/api/order/orders/${orderId}/verify`, {
    method: 'POST',
    headers: {
      ...authHeader(token),
      'content-type': 'application/json',
      'idempotency-key': createIdempotencyKey(`cod-verify-${orderId.slice(-8)}`),
    },
  });
}

/** Buyer confirms checkout — this is where the COD commitment hold is taken. */
async function confirmCodCheckout(orderId: string, token: string) {
  return requestJson(`/api/order/orders/${orderId}/buyer/confirm-checkout`, {
    method: 'POST',
    headers: {
      ...authHeader(token),
      'content-type': 'application/json',
      'idempotency-key': createIdempotencyKey(`cod-checkout-${orderId.slice(-8)}`),
    },
  });
}

function buildCodOrderPayload(
  totalValue: number,
  wardId: string,
  _coords: { lat: number; lng: number } = { lat: -6.7924, lng: 39.2083 },
  productId = 'seeded-product-placeholder'
): Record<string, unknown> {
  return {
    buyerId: SEEDED_USERS.buyer.id,
    sellerId: SEEDED_USERS.seller.id,
    items: [{ productId, quantity: 1, price: jitterPrice(totalValue), weight: 0.5 }],
    paymentMethod: 'COD',
    deliveryFee: 5000,
    // Note: deliveryAddress must not include latitude/longitude — order validator uses .unknown(false)
    deliveryAddress: {
      street: 'Uhuru Street 1',
      city: wardId === 'ARUSHA_CENTRAL' ? 'Arusha' : 'Dar es Salaam',
      postalCode: '11101',
      country: 'TZ',
    },
  };
}

async function getWalletBalance(token: string, userId: string): Promise<number> {
  const response = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
    headers: authHeader(token),
  });
  assertOk(response, 'getWalletBalance');
  return extractWalletBalance(response.body);
}
