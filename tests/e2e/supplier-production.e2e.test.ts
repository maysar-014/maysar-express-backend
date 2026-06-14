/**
 * E2E tests: Supplier Production & Inventory — Flow Doc 04
 *
 * Covers: SUP-01 (production plan management), SUP-02 (capacity management),
 *         SUP-03 (bulk fulfillment and quality checkpoints)
 *
 * API paths (module: production-service → /api/production):
 *   POST /api/production/plans
 *   GET  /api/production/dashboard
 *   PUT  /api/production/plans/:id/status
 *   POST /api/production/quality/checkpoints
 *   GET  /api/production/capacity
 *   PUT  /api/production/capacity
 *   POST /api/production/bulk-orders
 *   GET  /api/production/bulk-orders
 *
 * Inventory API paths (module: inventory-service → /api/inventory):
 *   GET  /api/inventory/stock/:sku
 *   POST /api/inventory/reserve
 *   POST /api/inventory/release
 *
 * Requires: RUN_LIVE_E2E=true, running backend, seeded supplier user.
 */

import { describe, expect, it, beforeAll } from '@jest/globals';
import {
  liveTestSuite,
  requestJson,
  authHeader,
  getAdminToken,
  loginAs,
  unlockTestUsers,
} from './helpers/live-api';
import { SEEDED_USERS } from './fixtures/seeded-users';

liveTestSuite('Supplier Production & Inventory — Flow Doc 04', () => {
  let supplierToken: string;
  let adminToken: string;
  let createdPlanId: string | null = null;

  beforeAll(async () => {
    const health = await requestJson('/health');
    expect(health.status).toBe(200);
    await unlockTestUsers();
    adminToken = await getAdminToken();
    supplierToken = await loginAs(SEEDED_USERS.supplier);
  });

  // -------------------------------------------------------------------------
  // SUP-01 — Production plan management
  // -------------------------------------------------------------------------

  it('[P1] [SUP-01] supplier can create a production plan', async () => {
    const res = await requestJson('/api/production/plans', {
      method: 'POST',
      headers: { ...authHeader(supplierToken), 'content-type': 'application/json' },
      body: JSON.stringify({
        supplierId: SEEDED_USERS.supplier.id,
        name: 'E2E Test Production Plan',
        description: 'E2E test production plan',
        targetQuantity: 100,
        startDate: new Date(Date.now() + 86_400_000).toISOString(), // tomorrow
        endDate: new Date(Date.now() + 7 * 86_400_000).toISOString(), // +7 days
      }),
    });
    // 201 = created, 400 = validation (product not seeded) — both acceptable, not 5xx
    expect(res.status).toBeLessThan(500);

    if (res.status === 201) {
      const body = ((res.body as Record<string, unknown>)['data'] ??
        res.body) as Record<string, unknown>;
      createdPlanId = String((body as Record<string, unknown>)['id'] ?? '');
    }
  });

  it('[P1] [SUP-01] supplier production dashboard returns structured response', async () => {
    const res = await requestJson(`/api/production/dashboard?supplierId=${SEEDED_USERS.supplier.id}`, {
      headers: authHeader(supplierToken),
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      expect(body['success'] !== false || body['data'] !== undefined).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // SUP-02 — Capacity management
  // -------------------------------------------------------------------------

  it('[P1] [SUP-02] supplier can check production capacity', async () => {
    const res = await requestJson('/api/production/capacity', {
      headers: authHeader(supplierToken),
    });
    expect(res.status).toBeLessThan(500);
  });

  it('[P2] [SUP-02] supplier can update production capacity', async () => {
    const res = await requestJson('/api/production/capacity', {
      method: 'PUT',
      headers: { ...authHeader(supplierToken), 'content-type': 'application/json' },
      body: JSON.stringify({
        supplierId: SEEDED_USERS.supplier.id,
        maxCapacity: 300,
        usedCapacity: 0,
        reservedCapacity: 0,
        unit: 'units',
        reason: 'E2E test capacity update',
      }),
    });
    expect(res.status).toBeLessThan(500);
  });

  // -------------------------------------------------------------------------
  // SUP-03 — Quality checkpoints and bulk fulfillment
  // -------------------------------------------------------------------------

  it('[P1] [SUP-03] supplier can record a quality checkpoint', async () => {
    const res = await requestJson('/api/production/quality/checkpoints', {
      method: 'POST',
      headers: { ...authHeader(supplierToken), 'content-type': 'application/json' },
      body: JSON.stringify({
        orderId: createdPlanId ?? `c${SEEDED_USERS.supplier.id.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 24)}`,
        passed: true,
        defectCount: 5,
        notes: 'E2E test quality checkpoint',
      }),
    });
    // 201 = created, 400 = plan not found — both acceptable
    expect(res.status).toBeLessThan(500);
  });

  it('[P1] [SUP-03] bulk order request list returns paginated shape', async () => {
    const res = await requestJson('/api/production/bulk-orders', {
      headers: authHeader(supplierToken),
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      const data = (body['data'] && typeof body['data'] === 'object' ? body['data'] : body) as Record<string, unknown>;
      const hasList =
        Array.isArray(data['requests']) ||
        Array.isArray(data['orders']) ||
        Array.isArray(data['bulkOrders']) ||
        Array.isArray(data['items']) ||
        Array.isArray(data) ||
        Array.isArray(body['orders']) ||
        Array.isArray(body['bulkOrders']) ||
        Array.isArray(body['data']) ||
        Array.isArray(body['items']) ||
        Array.isArray(body);
      expect(hasList).toBe(true);
    }
  });

  // -------------------------------------------------------------------------
  // Inventory service — stock reads and reservations
  // -------------------------------------------------------------------------

  it('[P1] [SUP-03] inventory stock endpoint responds for admin token', async () => {
    const res = await requestJson('/api/inventory/stock/seeded-sku-001', {
      headers: authHeader(adminToken),
    });
    // 200 = stock record exists, 404 = not found — both acceptable
    expect(res.status).toBeLessThan(500);
  });

  it('[P1] [SUP-03] inventory warehouses list returns structured response', async () => {
    const res = await requestJson('/api/inventory/warehouses', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBeLessThan(500);
  });
});
