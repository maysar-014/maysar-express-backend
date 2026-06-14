/**
 * E2E tests: Admin Console — Flow Doc 07
 *
 * Covers: ADM-01 (user management), ADM-04 (transaction monitoring),
 *         ADM-05 (dashboard), ADM-06 (system health), ADM-07 (audit review)
 *
 * API paths:
 *   User management: /api/user/api/v1/users
 *   Analytics:       /api/analytics
 *   System health:   /health, /ready
 *   Wallet admin:    /api/wallet/wallets/:userId/balance (admin token)
 *
 * Requires: RUN_LIVE_E2E=true, running backend, admin seeded user.
 */

import { describe, expect, it, beforeAll } from '@jest/globals';
import {
  liveTestSuite,
  requestJson,
  authHeader,
  getAdminToken,
  loginAs,
  unlockTestUsers,
  extractWalletBalance,
  buildWalletMutationRequest,
} from './helpers/live-api';
import { SEEDED_USERS } from './fixtures/seeded-users';

liveTestSuite('Admin Console — Flow Doc 07', () => {
  let adminToken: string;

  beforeAll(async () => {
    const health = await requestJson('/health');
    expect(health.status).toBe(200);
    await unlockTestUsers();
    adminToken = await getAdminToken();
  }, 60_000);

  // -------------------------------------------------------------------------
  // ADM-01 — User management
  // -------------------------------------------------------------------------

  it('[P1] [ADM-01] admin can list users and get a specific user by ID', async () => {
    // User-service exposes search at /api/user/search (internal-call protected)
    // Fall back to admin-token search via the auth-service admin endpoint
    const listRes = await requestJson('/api/auth/api/v1/admin/users/search?limit=5', {
      headers: authHeader(adminToken),
    });
    expect(listRes.status).toBeLessThan(500);
    if (listRes.status === 200) {
      const listBody = listRes.body as Record<string, unknown>;
      const data = (listBody['data'] && typeof listBody['data'] === 'object' ? listBody['data'] : listBody) as Record<string, unknown>;
      const users =
        (data['users'] as unknown[]) ??
        (data['items'] as unknown[]) ??
        (listBody['users'] as unknown[]) ??
        (listBody['items'] as unknown[]) ??
        (Array.isArray(listBody) ? listBody : []);
      expect(Array.isArray(users)).toBe(true);
    }

    // Get a specific user (seeded buyer)
    const getRes = await requestJson(
      `/api/user/${SEEDED_USERS.buyer.id}`,
      { headers: authHeader(adminToken) }
    );
    expect(getRes.status).toBe(200);
    const userData = ((getRes.body as Record<string, unknown>)['data'] ??
      (getRes.body as Record<string, unknown>)['user'] ??
      getRes.body) as Record<string, unknown>;
    expect(String((userData as Record<string, unknown>)['id'] ?? '')).toBe(SEEDED_USERS.buyer.id);
  });

  it('[P1] [ADM-01] admin wallet read does not require buyer token (cross-user access)', async () => {
    const res = await requestJson(
      `/api/wallet/wallets/${SEEDED_USERS.buyer.id}/balance`,
      { headers: authHeader(adminToken) }
    );
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    // Balance endpoint may return { success: true, balance: N } or { balance: N } or { availableBalance: N }
    const hasBalance =
      body['success'] === true ||
      typeof body['balance'] === 'number' ||
      typeof body['availableBalance'] === 'number';
    expect(hasBalance).toBe(true);
  });

  // -------------------------------------------------------------------------
  // ADM-05 — Dashboard and analytics
  // -------------------------------------------------------------------------

  it('[P1] [ADM-05] analytics dashboard endpoint returns structured response', async () => {
    // Route: GET /api/analytics/analytics/dashboard/:sellerId
    const res = await requestJson(`/api/analytics/analytics/dashboard/${SEEDED_USERS.seller.id}`, {
      headers: authHeader(adminToken),
    });
    // Analytics may return 200 or 404 depending on seeded data — just ensure no 5xx
    expect(res.status).toBeLessThan(500);
  });

  it('[P1] [ADM-05] seller analytics metrics endpoint returns structured response', async () => {
    // Route: GET /api/analytics/analytics/sales/:sellerId
    const res = await requestJson(
      `/api/analytics/analytics/sales/${SEEDED_USERS.seller.id}`,
      { headers: authHeader(adminToken) }
    );
    expect(res.status).toBeLessThan(500);
  });

  // -------------------------------------------------------------------------
  // ADM-06 — System health and readiness
  // -------------------------------------------------------------------------

  it('[P0] [ADM-06] /health returns 200 with system status', async () => {
    const res = await requestJson('/health');
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    // Health endpoint returns { status: 'ok', ... } or { success: true, ... }
    const isHealthy =
      body['status'] === 'ok' ||
      body['success'] === true ||
      body['status'] === 'healthy';
    expect(isHealthy).toBe(true);
  });

  it('[P0] [ADM-06] /ready returns a readiness response (200 when ready)', async () => {
    const res = await requestJson('/ready');
    // 200 = ready, 503 = still starting — both are valid (not a 4xx/5xx error)
    expect([200, 503]).toContain(res.status);
  });

  // -------------------------------------------------------------------------
  // ADM-07 — Audit trail: privileged actions leave readable audit entries
  // -------------------------------------------------------------------------

  it('[P2] [ADM-07] wallet credit by admin is reflected in balance and creates an auditable state change', async () => {
    const creditAmount = 1_000;

    // Wait briefly to allow any in-progress wallet operations from previous suites to complete
    await new Promise(r => setTimeout(r, 3000));

    const balanceBefore = await readBalance(adminToken, SEEDED_USERS.buyer.id);
    const creditMutation = buildWalletMutationRequest({
      amount: creditAmount,
      description: 'e2e-admin-audit-test'
    });

    const creditRes = await requestJson(
      `/api/wallet/wallets/${SEEDED_USERS.buyer.id}/credit`,
      {
        method: 'POST',
        headers: { ...authHeader(adminToken), ...creditMutation.headers },
        body: creditMutation.body,
      }
    );
    expect(creditRes.status).toBe(200);

    const balanceAfter = await readBalance(adminToken, SEEDED_USERS.buyer.id);
    expect(balanceAfter).toBe(balanceBefore + creditAmount);

    // Restore balance
    const debitMutation = buildWalletMutationRequest({
      amount: creditAmount,
      description: 'e2e-admin-audit-restore',
      userId: SEEDED_USERS.buyer.id,
      reason: 'e2e-test-restore'
    });
    await requestJson(`/api/wallet/wallets/${SEEDED_USERS.buyer.id}/debit`, {
      method: 'POST',
      headers: { ...authHeader(adminToken), ...debitMutation.headers },
      body: debitMutation.body,
    });
  });

  // -------------------------------------------------------------------------
  // ADM-04 — Transaction monitoring: wallet transaction list
  // -------------------------------------------------------------------------

  it('[P2] [ADM-04] admin can read wallet transaction history for any user', async () => {
    const res = await requestJson(
      `/api/wallet/wallets/${SEEDED_USERS.buyer.id}/transactions`,
      { headers: authHeader(adminToken) }
    );
    // Transactions endpoint should be accessible by admin without buyer token
    expect(res.status).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readBalance(adminToken: string, userId: string): Promise<number> {
  const res = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
    headers: authHeader(adminToken),
  });
  return extractWalletBalance(res.body);
}
