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
    // NOTE: Since the seller stock verification workflow was introduced, wallet orders
    // are no longer debited at placement. The debit happens at buyer/confirm-checkout
    // (after seller verifies stock). This test now validates:
    //   1. Order is created in PENDING_SELLER_VERIFICATION status
    //   2. Balance is unchanged at placement
    //   3. Cancel from PENDING_SELLER_VERIFICATION restores balance (no debit = no refund needed)
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

      // New flow: order starts in PENDING_SELLER_VERIFICATION — no wallet debit at placement
      const status = String(orderBody['status'] ?? '');
      expect(status).toBe('PENDING_SELLER_VERIFICATION');

      // Balance must be UNCHANGED — debit deferred to buyer/confirm-checkout
      const balanceAfterOrder = await getWalletBalance(buyerToken, SEEDED_USERS.buyer.id);
      expect(balanceAfterOrder).toBe(balanceBefore);
    } finally {
      // Cancel — balance stays the same (nothing was debited)
      if (orderId) {
        const cancelResponse = await cancelOrder(buyerToken, orderId);
        if (!cancelResponse.ok) {
          console.warn(`[customer.e2e] Cancel of order ${orderId} returned ${cancelResponse.status}`);
        } else {
          const balanceAfterCancel = await getWalletBalance(buyerToken, SEEDED_USERS.buyer.id);
          expect(balanceAfterCancel).toBe(balanceBefore);
        }
      }
    }
  }, 120_000);

  // -------------------------------------------------------------------------
  // P1 — Daily CI tests
  // -------------------------------------------------------------------------

  it('[P1] [BUY-03] order state read after creation matches orderId and shows PENDING_SELLER_VERIFICATION', async () => {
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

      // New flow: order starts in PENDING_SELLER_VERIFICATION
      expect(String(orderBody['status'] ?? '')).toBe('PENDING_SELLER_VERIFICATION');

      // Verify order can be read back with the correct verification fields
      const getResponse = await requestJson(`/api/order/orders/${orderId}`, {
        headers: authHeader(buyerToken),
      });
      expect(getResponse.status).toBe(200);
      const getBody = getResponse.body as Record<string, unknown>;
      const returnedId = String(
        getBody['orderId'] ?? getBody['id'] ?? (getBody['data'] as Record<string, unknown>)?.['id'] ?? ''
      );
      expect(returnedId).toBe(orderId);

      // Verification fields must be present
      expect(getBody['verificationDeadlineAt']).toBeDefined();
      expect(getBody['nextAction']).toBe('AWAIT_VERIFICATION');
      expect(getBody['checkoutAvailable']).toBe(false);
    } finally {
      if (orderId) {
        await cancelOrder(buyerToken, orderId);
      }
    }
  });

  it('[P1] [BUY-05] saga: cancel from PENDING_SELLER_VERIFICATION does not strand money (no debit occurred)', async () => {
    // NOTE: Under the seller verification workflow, wallet debit only happens at
    // buyer/confirm-checkout (after seller verifies). Cancelling from
    // PENDING_SELLER_VERIFICATION therefore requires no wallet refund.
    // This test confirms the balance is unchanged before and after.
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

      // Status must be pending verification — no debit yet
      expect(String(orderBody['status'] ?? '')).toBe('PENDING_SELLER_VERIFICATION');
    } finally {
      if (orderId) {
        const cancelResponse = await cancelOrder(buyerToken, orderId, 'e2e-test-saga-compensation-check');
        expect(cancelResponse.status).toBe(200);

        // Balance must be exactly the same — no debit happened, so no refund is expected
        const balanceAfterCancel = await getWalletBalance(buyerToken, SEEDED_USERS.buyer.id);
        expect(balanceAfterCancel).toBe(balanceBefore);
      }
    }
  }, 60_000);
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
