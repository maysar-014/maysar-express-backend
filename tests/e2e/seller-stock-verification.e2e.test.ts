/**
 * E2E tests: Seller Stock Verification Workflow
 *
 * Validates the end-to-end seller stock verification flow introduced in the
 * seller-stock-verification feature. Every order now starts in
 * PENDING_SELLER_VERIFICATION status; payment is deferred until after the seller
 * confirms and the buyer explicitly confirms checkout.
 *
 * Flow:
 *   1. Buyer places order  → status: PENDING_SELLER_VERIFICATION
 *   2. Seller confirms     → status: SELLER_VERIFIED
 *   3. Buyer confirms checkout (wallet debit / COD commitment here)
 *                          → status: CONFIRMED
 *   4. Admin can override, approve overdue, cancel, or place under review
 *   5. GET /orders/:id returns verificationDeadlineAt + nextAction hint
 *
 * API paths (all under /api/order):
 *   POST /orders                              — place order
 *   GET  /orders/:id                          — read order with verification fields
 *   POST /orders/:id/verify                   — seller confirms stock
 *   POST /orders/:id/decline                  — seller declines
 *   POST /orders/:id/buyer/confirm-checkout   — buyer completes deferred payment
 *   POST /orders/:id/cancel                   — buyer/admin cancel
 *   POST /orders/:id/admin/approve            — admin approves overdue order
 *   POST /orders/:id/admin/cancel             — admin cancels with reason
 *   POST /orders/:id/admin/review             — admin places under review
 *   POST /orders/:id/admin/override           — admin force-sets any status
 *   GET  /orders/admin/pending-verification   — admin dashboard: pending list
 *   GET  /orders/admin/overdue                — admin dashboard: overdue list
 *   GET  /orders/:id/history                  — admin: full audit trail
 *
 * Requires: RUN_LIVE_E2E=true, running backend (with migration applied), seeded users.
 */

import { describe, expect, it, beforeAll } from '@jest/globals';
import {
  liveTestSuite,
  requestJson,
  authHeader,
  getAdminToken,
  ensureWalletMinimum,
  extractWalletBalance,
  loginAs,
  unlockTestUsers,
  resolveSeededProduct,
  extractProductPriceAmount,
  jitterPrice,
  createIdempotencyKey,
  assertOk,
} from './helpers/live-api';
import { SEEDED_USERS, WALLET_TOP_UP_MINIMUM } from './fixtures/seeded-users';

liveTestSuite('Seller Stock Verification — Feature spec', () => {
  let buyerToken: string;
  let sellerToken: string;
  let adminToken: string;
  let seededProduct: Record<string, unknown>;

  beforeAll(async () => {
    const health = await requestJson('/health');
    expect(health.status).toBe(200);
    await unlockTestUsers();

    adminToken = await getAdminToken();
    buyerToken = await loginAs(SEEDED_USERS.buyer);
    sellerToken = await loginAs(SEEDED_USERS.seller);

    seededProduct = await resolveSeededProduct(buyerToken);

    const requiredWallet = Math.max(
      WALLET_TOP_UP_MINIMUM,
      extractProductPriceAmount(seededProduct) + 50_000
    );
    await ensureWalletMinimum(SEEDED_USERS.buyer.id, requiredWallet, adminToken);
    await new Promise(r => setTimeout(r, 3000));
  }, 120_000);

  // =========================================================================
  // REQ-1 — Order placement creates PENDING_SELLER_VERIFICATION state
  // =========================================================================

  it('[P0] [ORD-VER-01] order placement returns PENDING_SELLER_VERIFICATION status', async () => {
    let orderId: string | null = null;
    try {
      const res = await placeOrder(buyerToken, seededProduct, 'WALLET');
      expect(res.status).toBe(201);
      const body = res.body as Record<string, unknown>;
      orderId = extractId(body);
      expect(orderId).toBeTruthy();

      const status = String(body['status'] ?? '');
      expect(status).toBe('PENDING_SELLER_VERIFICATION');

      // verificationDeadlineAt must be a future ISO date
      const deadline = String(body['verificationDeadlineAt'] ?? '');
      expect(deadline).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(new Date(deadline).getTime()).toBeGreaterThan(Date.now());

      // nextAction must indicate waiting
      expect(String(body['nextAction'] ?? '')).toBe('AWAIT_VERIFICATION');
    } finally {
      if (orderId) await cancelOrder(adminToken, orderId, 'e2e-cleanup-ver-01');
    }
  });

  it('[P0] [ORD-VER-02] no wallet debit occurs at order placement', async () => {
    const balanceBefore = await getWalletBalance(adminToken, SEEDED_USERS.buyer.id);
    let orderId: string | null = null;

    try {
      const res = await placeOrder(buyerToken, seededProduct, 'WALLET');
      expect(res.status).toBe(201);
      orderId = extractId(res.body as Record<string, unknown>);

      // Balance must be unchanged — wallet debit is deferred to buyer/confirm-checkout
      const balanceAfter = await getWalletBalance(adminToken, SEEDED_USERS.buyer.id);
      expect(balanceAfter).toBe(balanceBefore);
    } finally {
      if (orderId) await cancelOrder(adminToken, orderId, 'e2e-cleanup-ver-02');
    }
  });

  // =========================================================================
  // REQ-3, REQ-4 — Seller stock confirmation
  // =========================================================================

  it('[P0] [ORD-VER-03] seller can confirm stock and order transitions to SELLER_VERIFIED', async () => {
    let orderId: string | null = null;
    try {
      const orderRes = await placeOrder(buyerToken, seededProduct, 'WALLET');
      expect(orderRes.status).toBe(201);
      orderId = extractId(orderRes.body as Record<string, unknown>);

      // Seller confirms stock
      const verifyRes = await requestJson(`/api/order/orders/${orderId}/verify`, {
        method: 'POST',
        headers: { ...authHeader(sellerToken), 'content-type': 'application/json' },
      });
      expect(verifyRes.status).toBe(200);

      // Order status must be SELLER_VERIFIED
      const orderRes2 = await requestJson(`/api/order/orders/${orderId}`, {
        headers: authHeader(buyerToken),
      });
      expect(orderRes2.status).toBe(200);
      const status = String((orderRes2.body as Record<string, unknown>)['status'] ?? '');
      expect(status.toUpperCase()).toBe('SELLER_VERIFIED');

      // Buyer gets nextAction = PROCEED_TO_CHECKOUT
      const nextAction = String((orderRes2.body as Record<string, unknown>)['nextAction'] ?? '');
      expect(nextAction).toBe('PROCEED_TO_CHECKOUT');

      // checkoutAvailable must be true
      expect((orderRes2.body as Record<string, unknown>)['checkoutAvailable']).toBe(true);
    } finally {
      if (orderId) await cancelOrder(adminToken, orderId, 'e2e-cleanup-ver-03');
    }
  });

  it('[P0] [ORD-VER-04] buyer checkout after seller verification debits wallet and sets CONFIRMED', async () => {
    const balanceBefore = await getWalletBalance(adminToken, SEEDED_USERS.buyer.id);
    let orderId: string | null = null;

    try {
      // 1. Place order
      const orderRes = await placeOrder(buyerToken, seededProduct, 'WALLET');
      expect(orderRes.status).toBe(201);
      orderId = extractId(orderRes.body as Record<string, unknown>);

      // 2. Seller verifies
      const verifyRes = await requestJson(`/api/order/orders/${orderId}/verify`, {
        method: 'POST',
        headers: { ...authHeader(sellerToken), 'content-type': 'application/json' },
      });
      expect(verifyRes.status).toBe(200);

      // 3. Buyer confirms checkout (wallet debit happens here)
      const checkoutRes = await requestJson(`/api/order/orders/${orderId}/buyer/confirm-checkout`, {
        method: 'POST',
        headers: { ...authHeader(buyerToken), 'content-type': 'application/json' },
      });
      expect(checkoutRes.status).toBe(200);

      // 4. Balance must now be reduced
      const balanceAfter = await getWalletBalance(adminToken, SEEDED_USERS.buyer.id);
      expect(balanceAfter).toBeLessThan(balanceBefore);

      // 5. Order status must be CONFIRMED
      const orderRes2 = await requestJson(`/api/order/orders/${orderId}`, {
        headers: authHeader(buyerToken),
      });
      const status = String((orderRes2.body as Record<string, unknown>)['status'] ?? '');
      expect(status.toUpperCase()).toBe('CONFIRMED');
    } finally {
      if (orderId) {
        // Refund via admin cancel — wallet should be restored
        await cancelOrder(adminToken, orderId, 'e2e-cleanup-ver-04');
      }
    }
  }, 60_000);

  // =========================================================================
  // REQ-3.5 — Seller decline
  // =========================================================================

  it('[P1] [ORD-VER-05] seller can decline stock and order transitions to SELLER_DECLINED', async () => {
    let orderId: string | null = null;
    try {
      const orderRes = await placeOrder(buyerToken, seededProduct, 'WALLET');
      expect(orderRes.status).toBe(201);
      orderId = extractId(orderRes.body as Record<string, unknown>);

      const declineRes = await requestJson(`/api/order/orders/${orderId}/decline`, {
        method: 'POST',
        headers: { ...authHeader(sellerToken), 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'Item out of stock — e2e test' }),
      });
      expect(declineRes.status).toBe(200);

      // Status must be SELLER_DECLINED
      const orderRes2 = await requestJson(`/api/order/orders/${orderId}`, {
        headers: authHeader(buyerToken),
      });
      const status = String((orderRes2.body as Record<string, unknown>)['status'] ?? '');
      expect(status.toUpperCase()).toBe('SELLER_DECLINED');

      orderId = null; // already terminal — no need to cancel
    } finally {
      if (orderId) await cancelOrder(adminToken, orderId, 'e2e-cleanup-ver-05');
    }
  });

  // =========================================================================
  // REQ-9 — Buyer blocked from checkout on VERIFICATION_OVERDUE / wrong state
  // =========================================================================

  it('[P1] [ORD-VER-06] buyer cannot confirm checkout while order is still PENDING_SELLER_VERIFICATION', async () => {
    let orderId: string | null = null;
    try {
      const orderRes = await placeOrder(buyerToken, seededProduct, 'WALLET');
      expect(orderRes.status).toBe(201);
      orderId = extractId(orderRes.body as Record<string, unknown>);

      // Attempt checkout without seller verification first
      const checkoutRes = await requestJson(`/api/order/orders/${orderId}/buyer/confirm-checkout`, {
        method: 'POST',
        headers: { ...authHeader(buyerToken), 'content-type': 'application/json' },
      });
      // Must be rejected (422)
      expect(checkoutRes.status).toBe(422);
      const errorCode = String((checkoutRes.body as Record<string, unknown>)['error'] ?? '');
      expect(errorCode).toBe('INVALID_STATUS_TRANSITION');
    } finally {
      if (orderId) await cancelOrder(adminToken, orderId, 'e2e-cleanup-ver-06');
    }
  });

  // =========================================================================
  // REQ-10 — Admin order management
  // =========================================================================

  it('[P1] [ORD-VER-07] admin can override order to any status with mandatory reason', async () => {
    let orderId: string | null = null;
    try {
      const orderRes = await placeOrder(buyerToken, seededProduct, 'WALLET');
      expect(orderRes.status).toBe(201);
      orderId = extractId(orderRes.body as Record<string, unknown>);

      // Admin force-approves (override to SELLER_VERIFIED)
      const overrideRes = await requestJson(`/api/order/orders/${orderId}/admin/override`, {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'content-type': 'application/json' },
        body: JSON.stringify({
          targetStatus: 'SELLER_VERIFIED',
          reason: 'Admin bypassing verification for e2e test',
        }),
      });
      expect(overrideRes.status).toBe(200);

      const orderRes2 = await requestJson(`/api/order/orders/${orderId}`, {
        headers: authHeader(adminToken),
      });
      const status = String((orderRes2.body as Record<string, unknown>)['status'] ?? '');
      expect(status.toUpperCase()).toBe('SELLER_VERIFIED');
    } finally {
      if (orderId) await cancelOrder(adminToken, orderId, 'e2e-cleanup-ver-07');
    }
  });

  it('[P1] [ORD-VER-08] admin override rejects empty reason', async () => {
    let orderId: string | null = null;
    try {
      const orderRes = await placeOrder(buyerToken, seededProduct, 'WALLET');
      expect(orderRes.status).toBe(201);
      orderId = extractId(orderRes.body as Record<string, unknown>);

      const overrideRes = await requestJson(`/api/order/orders/${orderId}/admin/override`, {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'content-type': 'application/json' },
        body: JSON.stringify({ targetStatus: 'SELLER_VERIFIED', reason: '' }),
      });
      expect(overrideRes.status).toBe(422);
    } finally {
      if (orderId) await cancelOrder(adminToken, orderId, 'e2e-cleanup-ver-08');
    }
  });

  // =========================================================================
  // REQ-12 — Admin monitoring dashboard data
  // =========================================================================

  it('[P1] [ORD-VER-09] admin pending-verification endpoint returns structured list', async () => {
    const res = await requestJson('/api/order/orders/admin/pending-verification', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect((body['data'] as Record<string, unknown>)['orders']).toBeDefined();
    expect(typeof (body['data'] as Record<string, unknown>)['total']).toBe('number');
  });

  it('[P1] [ORD-VER-10] admin overdue endpoint returns structured list', async () => {
    const res = await requestJson('/api/order/orders/admin/overdue', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect((body['data'] as Record<string, unknown>)['orders']).toBeDefined();
  });

  it('[P1] [ORD-VER-11] GET /orders/:id/history returns immutable audit log', async () => {
    let orderId: string | null = null;
    try {
      const orderRes = await placeOrder(buyerToken, seededProduct, 'WALLET');
      expect(orderRes.status).toBe(201);
      orderId = extractId(orderRes.body as Record<string, unknown>);

      const historyRes = await requestJson(`/api/order/orders/${orderId}/history`, {
        headers: authHeader(adminToken),
      });
      expect(historyRes.status).toBe(200);
      const body = historyRes.body as Record<string, unknown>;
      const entries = (body['data'] as Record<string, unknown>)['entries'] as unknown[];
      expect(Array.isArray(entries)).toBe(true);
      // At least the initial status transition entry must exist
      expect(entries.length).toBeGreaterThan(0);
    } finally {
      if (orderId) await cancelOrder(adminToken, orderId, 'e2e-cleanup-ver-11');
    }
  });

  // =========================================================================
  // REQ-15 — Buyer real-time status visibility
  // =========================================================================

  it('[P1] [ORD-VER-12] GET /orders/:id returns verificationDeadlineRemainingSeconds when pending', async () => {
    let orderId: string | null = null;
    try {
      const orderRes = await placeOrder(buyerToken, seededProduct, 'WALLET');
      expect(orderRes.status).toBe(201);
      orderId = extractId(orderRes.body as Record<string, unknown>);

      const readRes = await requestJson(`/api/order/orders/${orderId}`, {
        headers: authHeader(buyerToken),
      });
      expect(readRes.status).toBe(200);
      const body = readRes.body as Record<string, unknown>;

      // Must include time-remaining hint
      const remaining = body['verificationDeadlineRemainingSeconds'];
      expect(typeof remaining).toBe('number');
      expect(remaining as number).toBeGreaterThan(0);
      expect(body['checkoutAvailable']).toBe(false);
      expect(body['nextAction']).toBe('AWAIT_VERIFICATION');
    } finally {
      if (orderId) await cancelOrder(adminToken, orderId, 'e2e-cleanup-ver-12');
    }
  });
});

// ===========================================================================
// Helpers
// ===========================================================================

function extractId(body: Record<string, unknown>): string {
  return String(body['orderId'] ?? body['id'] ?? '');
}

async function placeOrder(
  buyerToken: string,
  product: Record<string, unknown>,
  paymentMethod: 'WALLET' | 'COD',
) {
  const productId = String(product['id'] ?? product['productId'] ?? '');
  const unitPrice = extractProductPriceAmount(product);
  return requestJson('/api/order/orders', {
    method: 'POST',
    headers: {
      ...authHeader(buyerToken),
      'content-type': 'application/json',
      'idempotency-key': createIdempotencyKey(`ssv-${paymentMethod.toLowerCase()}`),
    },
    body: JSON.stringify({
      buyerId: SEEDED_USERS.buyer.id,
      sellerId: SEEDED_USERS.seller.id,
      items: [{ productId, quantity: 1, price: { amount: jitterPrice(unitPrice), currency: 'TZS' }, weight: 0.5 }],
      paymentMethod,
      deliveryFee: paymentMethod === 'COD' ? 5000 : 1500,
      deliveryAddress: {
        street: 'Test Street 1',
        city: 'Dar es Salaam',
        postalCode: '11101',
        country: 'Tanzania',
      },
    }),
  });
}

async function cancelOrder(token: string, orderId: string, reason?: string): Promise<void> {
  await requestJson(`/api/order/orders/${orderId}/cancel`, {
    method: 'POST',
    headers: {
      ...authHeader(token),
      'content-type': 'application/json',
      'idempotency-key': createIdempotencyKey(`cancel-ssv-${orderId.slice(-8)}`),
    },
    body: JSON.stringify({ reason: reason ?? 'e2e-cleanup' }),
  });
}

async function getWalletBalance(token: string, userId: string): Promise<number> {
  const res = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
    headers: authHeader(token),
  });
  assertOk(res, 'getWalletBalance');
  return extractWalletBalance(res.body);
}
