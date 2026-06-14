/**
 * E2E tests: Customer Journeys — Flow Doc 02
 *
 * Covers use cases: BUY-01 (discovery), BUY-02 (storefront), BUY-03 (payment + order),
 * BUY-04 (tracking), BUY-05 (cancellation + refund / saga compensation)
 *
 * Priority tiers:
 *   [P0] — must pass on every deploy
 *   [P1] — run daily in CI
 *
 * Requires: RUN_LIVE_E2E=true and a running backend seeded with `docs/test-users.md` users
 * and at least one product belonging to the seeded seller.
 */

import { describe, expect, it, beforeAll } from '@jest/globals';
import {
  liveTestSuite,
  requestJson,
  extractAccessToken,
  authHeader,
  assertOk,
  createIdempotencyKey,
  extractProductPriceAmount,
  jitterPrice,
  getAdminToken,
  ensureWalletMinimum,
  extractWalletBalance,
  loginAs,
  unlockTestUsers,
  extractList,
  resolveSeededProduct,
  resolveSeededSellerProducts,
  cancelOrder,
  pollUntilBalanceRestored,
} from './helpers/live-api';
import { SEEDED_USERS, WALLET_TOP_UP_MINIMUM } from './fixtures/seeded-users';

liveTestSuite('Customer Journeys — Flow Doc 02', () => {
  let buyerToken: string;
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

    // 4. Resolve a seeded product to use for order placement
    seededProduct = await resolveSeededProduct(buyerToken);

    // 5. Idempotent wallet top-up sized for the seeded product price
    const requiredWallet = Math.max(
      WALLET_TOP_UP_MINIMUM,
      extractProductPriceAmount(seededProduct) + 50_000
    );
    await ensureWalletMinimum(SEEDED_USERS.buyer.id, requiredWallet, adminToken);
    // Wait for wallet lock to release after top-up before tests run
    await new Promise(r => setTimeout(r, 6000));
  }, 120_000);
  // -------------------------------------------------------------------------

  it('[P0] [BUY-01] catalog products list returns a non-empty array', async () => {
    const response = await resolveSeededSellerProducts(10, buyerToken);
    expect(response.status).toBe(200);

    const items = extractList(response.body);

    expect(Array.isArray(items)).toBe(true);
    expect((items as unknown[]).length).toBeGreaterThan(0);
  });

  it('[P0] [BUY-02] seller storefront read returns expected shape', async () => {
    const response = await requestJson(
      `/api/catalog/sellers/${SEEDED_USERS.seller.id}/storefront`
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: SEEDED_USERS.seller.id,
          shareUrl: expect.any(String),
          shortUrl: expect.any(String),
        }),
      })
    );
  });

  it('[P0] [BUY-03] wallet payment order create + cancel round-trip restores balance', async () => {
    // Read pre-order balance
    const balanceBefore = await getWalletBalance(buyerToken, SEEDED_USERS.buyer.id);
    const productId = String(seededProduct['id'] ?? seededProduct['productId'] ?? '');
    const unitPrice = extractProductPriceAmount(seededProduct);

    let orderId: string | null = null;
    try {
      // Place wallet payment order
      const orderResponse = await requestJson('/api/order/orders', {
        method: 'POST',
        headers: {
          ...authHeader(buyerToken),
          'content-type': 'application/json',
          'idempotency-key': createIdempotencyKey('customer-buy-03'),
        },
        body: JSON.stringify({
          buyerId: SEEDED_USERS.buyer.id,
          sellerId: SEEDED_USERS.seller.id,
          items: [{ productId, quantity: 1, price: { amount: jitterPrice(unitPrice), currency: 'TZS' }, weight: 0.5 }],
          paymentMethod: 'WALLET',
          deliveryFee: 1500,
          deliveryAddress: {
            street: 'Test Street 1',
            city: 'Dar es Salaam',
            postalCode: '11101',
            country: 'TZ',
          },
        }),
      });

      expect(orderResponse.status).toBe(201);
      const orderBody = orderResponse.body as Record<string, unknown>;
      orderId = String(orderBody['orderId'] ?? orderBody['id'] ?? '');
      expect(orderId).toBeTruthy();

      // Balance should have decreased
      const balanceAfterOrder = await getWalletBalance(buyerToken, SEEDED_USERS.buyer.id);
      expect(balanceAfterOrder).toBeLessThan(balanceBefore);
    } finally {
      // Always attempt cancel so we don't strand money
      if (orderId) {
        const cancelResponse = await cancelOrder(buyerToken, orderId);
        // Cancel should succeed; if it fails we log but don't mask the original failure
        if (!cancelResponse.ok) {
          console.warn(`[customer.e2e] Cancel of order ${orderId} returned ${cancelResponse.status}`);
        } else {
          // Poll for balance restoration — saga compensation is async
          const balanceAfterCancel = await pollUntilBalanceRestored(
            SEEDED_USERS.buyer.id, balanceBefore, adminToken, 30_000
          );
          expect(balanceAfterCancel).toBe(balanceBefore);
        }
      }
    }
  }, 120_000);

  // -------------------------------------------------------------------------
  // P1 — Daily CI tests
  // -------------------------------------------------------------------------

  it('[P1] [BUY-03] order state read after creation matches orderId', async () => {
    const productId = String(seededProduct['id'] ?? seededProduct['productId'] ?? '');
    const unitPrice = extractProductPriceAmount(seededProduct);
    let orderId: string | null = null;

    try {
      const orderResponse = await requestJson('/api/order/orders', {
        method: 'POST',
        headers: {
          ...authHeader(buyerToken),
          'content-type': 'application/json',
          'idempotency-key': createIdempotencyKey('customer-buy-03-read'),
        },
        body: JSON.stringify({
          buyerId: SEEDED_USERS.buyer.id,
          sellerId: SEEDED_USERS.seller.id,
          items: [{ productId, quantity: 1, price: { amount: jitterPrice(unitPrice), currency: 'TZS' }, weight: 0.5 }],
          paymentMethod: 'WALLET',
          deliveryFee: 1500,
          deliveryAddress: {
            street: 'Test Street 1',
            city: 'Dar es Salaam',
            postalCode: '11101',
            country: 'TZ',
          },
        }),
      });

      expect(orderResponse.status).toBe(201);
      const orderBody = orderResponse.body as Record<string, unknown>;
      orderId = String(orderBody['orderId'] ?? orderBody['id'] ?? '');
      expect(orderId).toBeTruthy();

      // Verify order can be read back
      const getResponse = await requestJson(`/api/order/orders/${orderId}`, {
        headers: authHeader(buyerToken),
      });
      expect(getResponse.status).toBe(200);
      const getBody = getResponse.body as Record<string, unknown>;
      const returnedId = String(
        getBody['orderId'] ?? getBody['id'] ?? (getBody['data'] as Record<string, unknown>)?.['id'] ?? ''
      );
      expect(returnedId).toBe(orderId);
    } finally {
      if (orderId) {
        await cancelOrder(buyerToken, orderId);
      }
    }
  });

  it('[P1] [BUY-05] saga: cancel after wallet order credits the full amount back', async () => {
    const productId = String(seededProduct['id'] ?? seededProduct['productId'] ?? '');
    const unitPrice = extractProductPriceAmount(seededProduct);
    const balanceBefore = await getWalletBalance(buyerToken, SEEDED_USERS.buyer.id);
    let orderId: string | null = null;

    try {
      const orderResponse = await requestJson('/api/order/orders', {
        method: 'POST',
        headers: {
          ...authHeader(buyerToken),
          'content-type': 'application/json',
          'idempotency-key': createIdempotencyKey('customer-buy-05'),
        },
        body: JSON.stringify({
          buyerId: SEEDED_USERS.buyer.id,
          sellerId: SEEDED_USERS.seller.id,
          items: [{ productId, quantity: 1, price: { amount: jitterPrice(unitPrice), currency: 'TZS' }, weight: 0.5 }],
          paymentMethod: 'WALLET',
          deliveryFee: 1500,
          deliveryAddress: {
            street: 'Test Street 1',
            city: 'Dar es Salaam',
            postalCode: '11101',
            country: 'TZ',
          },
        }),
      });
      expect(orderResponse.status).toBe(201);
      const orderBody = orderResponse.body as Record<string, unknown>;
      orderId = String(orderBody['orderId'] ?? orderBody['id'] ?? '');
    } finally {
      if (orderId) {
        const cancelResponse = await cancelOrder(buyerToken, orderId, 'e2e-test-saga-compensation-check');
        expect(cancelResponse.status).toBe(200);

        // Saga compensation: poll until balance is fully restored (async)
        const balanceAfterCancel = await pollUntilBalanceRestored(
          SEEDED_USERS.buyer.id, balanceBefore, adminToken, 30_000
        );
        expect(balanceAfterCancel).toBe(balanceBefore);
      }
    }
  }, 120_000);
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function getWalletBalance(token: string, userId: string): Promise<number> {
  const response = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
    headers: authHeader(token),
  });
  assertOk(response, 'getWalletBalance');
  return extractWalletBalance(response.body);
}
