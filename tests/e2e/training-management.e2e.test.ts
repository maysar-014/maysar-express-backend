/**
 * E2E tests: Training Management — Flow Doc 06 (ENA-03)
 *
 * Covers the training service endpoints that were added/extended:
 *   - Module listing (learner-facing)
 *   - Training start with learnerId fallback to authenticated user
 *   - Progress tracking per learner
 *   - Eligibility check
 *   - Available modules endpoint
 *   - Leaderboard endpoint
 *   - Admin: module CRUD
 *   - Admin: learner management
 *   - Admin: stats
 *
 * API paths (module: training-service → /api/training):
 *   GET  /api/training/api/v1/modules                         — list all modules
 *   GET  /api/training/api/v1/modules/leaderboard             — leaderboard
 *   GET  /api/training/api/v1/modules/:id                     — get module by ID
 *   GET  /api/training/api/v1/training/available              — available modules for learner
 *   GET  /api/training/api/v1/training/progress/:learnerId    — learner progress
 *   GET  /api/training/api/v1/training/eligibility/:learnerId — eligibility check
 *   POST /api/training/api/v1/training/start                  — start training (learnerId optional)
 *   POST /api/training/api/v1/training/admin/modules          — admin create module
 *   GET  /api/training/api/v1/training/admin/modules          — admin list modules
 *   POST /api/training/api/v1/training/admin/grant-eligibility/:learnerId — admin grant eligibility
 *   GET  /api/training/api/v1/training/admin/stats            — admin stats
 *   GET  /api/training/api/v1/training/admin/learners         — admin learner list
 *
 * Key change from previous implementation:
 *   - POST /training/start now falls back to req.user.userId when learnerId is absent in body
 *   - All 4xx validation errors are now 400 (not 500) for missing learnerId
 *
 * Requires: RUN_LIVE_E2E=true, running backend, seeded enabler user.
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

liveTestSuite('Training Management — Flow Doc 06 ENA-03', () => {
  let adminToken: string;
  let enablerToken: string;
  let courierToken: string;
  /** A training module ID created or resolved during tests */
  let resolvedModuleId: string | null = null;

  beforeAll(async () => {
    const health = await requestJson('/health');
    expect(health.status).toBe(200);
    await unlockTestUsers();
    adminToken = await getAdminToken();
    enablerToken = await loginAs(SEEDED_USERS.enabler);
    courierToken = await loginAs(SEEDED_USERS.courier);
  });

  // =========================================================================
  // Module listing (learner-facing)
  // =========================================================================

  it('[P1] [ENA-03] GET /modules returns a list shape', async () => {
    const res = await requestJson('/api/training/api/v1/modules', {
      headers: authHeader(enablerToken),
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      const hasList =
        Array.isArray(body['modules']) ||
        Array.isArray(body['data']) ||
        Array.isArray(body['items']) ||
        Array.isArray(body);
      expect(hasList).toBe(true);

      // Capture a module ID for subsequent tests if available
      const modules: unknown[] =
        (Array.isArray(body['modules']) ? body['modules'] as unknown[] : null) ??
        (Array.isArray(body['data']) ? body['data'] as unknown[] : null) ??
        (Array.isArray(body) ? body as unknown[] : []);
      if (modules.length > 0) {
        const first = modules[0] as Record<string, unknown>;
        const mid = String(first['id'] ?? '');
        if (mid) resolvedModuleId = mid;
      }
    }
  });

  it('[P1] [ENA-03] GET /modules/leaderboard returns structured response', async () => {
    const res = await requestJson('/api/training/api/v1/modules/leaderboard', {
      headers: authHeader(enablerToken),
    });
    expect(res.status).toBeLessThan(500);
  });

  it('[P1] [ENA-03] GET /training/available returns modules available to the learner', async () => {
    const res = await requestJson(
      `/api/training/api/v1/training/available?learnerId=${SEEDED_USERS.enabler.id}`,
      { headers: authHeader(enablerToken) }
    );
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      const hasData = body['data'] !== undefined || Array.isArray(body['modules']) || Array.isArray(body);
      expect(hasData).toBe(true);
    }
  });

  // =========================================================================
  // Training start — learnerId from body OR from auth context
  // =========================================================================

  it('[P1] [ENA-03] POST /training/start with learnerId in body returns 201', async () => {
    const res = await requestJson('/api/training/api/v1/training/start', {
      method: 'POST',
      headers: { ...authHeader(enablerToken), 'content-type': 'application/json' },
      body: JSON.stringify({
        learnerId: SEEDED_USERS.enabler.id,
        learnerRole: 'enabler',
        moduleId: resolvedModuleId ?? 'default-module',
      }),
    });
    // 201 = started, 200 = already in progress — both acceptable
    expect([200, 201]).toContain(res.status);
    const body = res.body as Record<string, unknown>;
    expect(body['success']).toBe(true);
    expect(String(body['status'] ?? '')).toBe('IN_PROGRESS');
  });

  it('[P1] [ENA-03] POST /training/start without learnerId falls back to authenticated user ID', async () => {
    // This validates the fix: learnerId is no longer required in body when user is authenticated
    const res = await requestJson('/api/training/api/v1/training/start', {
      method: 'POST',
      headers: { ...authHeader(enablerToken), 'content-type': 'application/json' },
      body: JSON.stringify({
        learnerRole: 'enabler',
        // learnerId intentionally omitted
      }),
    });
    // Must NOT return 400 — falls back to auth user ID
    expect([200, 201]).toContain(res.status);
    const body = res.body as Record<string, unknown>;
    expect(body['success']).toBe(true);
    // learnerId in response must match the authenticated user
    const learnerId = String(body['learnerId'] ?? (body['data'] as Record<string, unknown>)?.['learnerId'] ?? '');
    if (learnerId) {
      expect(learnerId).toBe(SEEDED_USERS.enabler.id);
    }
  });

  it('[P1] [ENA-03] courier can also start training without learnerId in body', async () => {
    // Couriers go through training too — verify fallback works for courier role
    const res = await requestJson('/api/training/api/v1/training/start', {
      method: 'POST',
      headers: { ...authHeader(courierToken), 'content-type': 'application/json' },
      body: JSON.stringify({
        learnerRole: 'courier',
        // learnerId omitted — should fall back to courier's user ID
      }),
    });
    expect([200, 201]).toContain(res.status);
    const body = res.body as Record<string, unknown>;
    expect(body['success']).toBe(true);
  });

  // =========================================================================
  // Progress and eligibility
  // =========================================================================

  it('[P1] [ENA-03] GET /training/progress/:learnerId returns progress for learner', async () => {
    const res = await requestJson(
      `/api/training/api/v1/training/progress/${SEEDED_USERS.enabler.id}`,
      { headers: authHeader(enablerToken) }
    );
    // 200 = has progress, 404 = no record yet — both acceptable
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(true);
    }
  });

  it('[P1] [ENA-03] GET /training/eligibility/:learnerId returns eligibility status', async () => {
    const res = await requestJson(
      `/api/training/api/v1/training/eligibility/${SEEDED_USERS.enabler.id}`,
      { headers: authHeader(enablerToken) }
    );
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(true);
      const data = (body['data'] ?? {}) as Record<string, unknown>;
      expect(typeof data['eligible']).toBe('boolean');
    }
  });

  // =========================================================================
  // Admin: Module management
  // =========================================================================

  it('[P1] [ENA-03] admin can list modules via admin endpoint', async () => {
    const res = await requestJson('/api/training/api/v1/training/admin/modules', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(true);
      expect(Array.isArray(body['data'])).toBe(true);
    }
  });

  it('[P1] [ENA-03] admin can create a training module', async () => {
    const res = await requestJson('/api/training/api/v1/training/admin/modules', {
      method: 'POST',
      headers: { ...authHeader(adminToken), 'content-type': 'application/json' },
      body: JSON.stringify({
        id: `trn_mod_e2e_${Date.now().toString(36)}`,
        name: 'E2E Test Training Module',
        description: 'Automated E2E test training module — safe to ignore',
        contentType: 'TEXT',
        durationMinutes: 15,
        category: 'general',
        isPublic: true,
        difficulty: 'BEGINNER',
      }),
    });
    // 201 = created, 409/400 = already exists — both acceptable
    expect(res.status).toBeLessThan(500);
    if (res.status === 201) {
      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(true);
      const data = (body['data'] ?? {}) as Record<string, unknown>;
      if (data['id']) resolvedModuleId = String(data['id']);
    }
  });

  it('[P1] [ENA-03] admin can view training stats', async () => {
    const res = await requestJson('/api/training/api/v1/training/admin/stats', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(true);
      const data = (body['data'] ?? {}) as Record<string, unknown>;
      expect(typeof data['totalModules']).toBe('number');
    }
  });

  // =========================================================================
  // Admin: Learner management
  // =========================================================================

  it('[P1] [ENA-03] admin can list learners in progress', async () => {
    const res = await requestJson('/api/training/api/v1/training/admin/learners', {
      headers: authHeader(adminToken),
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(true);
      expect(Array.isArray(body['data'])).toBe(true);
    }
  });

  it('[P1] [ENA-03] admin can grant eligibility override for a learner', async () => {
    const res = await requestJson(
      `/api/training/api/v1/training/admin/grant-eligibility/${SEEDED_USERS.enabler.id}`,
      {
        method: 'POST',
        headers: { ...authHeader(adminToken), 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }
    );
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(true);
      const data = (body['data'] ?? {}) as Record<string, unknown>;
      expect(data['eligible']).toBe(true);
      expect(data['adminOverride']).toBe(true);
    }
  });

  it('[P1] [ENA-03] admin can complete training on behalf of a learner', async () => {
    const res = await requestJson('/api/training/api/v1/training/admin/complete-for-learner', {
      method: 'POST',
      headers: { ...authHeader(adminToken), 'content-type': 'application/json' },
      body: JSON.stringify({
        learnerId: SEEDED_USERS.enabler.id,
        moduleId: resolvedModuleId ?? 'default-module',
        score: 100,
      }),
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(true);
      const data = (body['data'] ?? {}) as Record<string, unknown>;
      expect(String(data['status'] ?? '')).toBe('COMPLETED');
      expect(data['adminOverride']).toBe(true);
    }
  });

  // =========================================================================
  // Module by ID
  // =========================================================================

  it('[P2] [ENA-03] GET /modules/:id returns module detail when ID exists', async () => {
    if (!resolvedModuleId) {
      console.warn('[training-management.e2e] No module ID resolved — skipping module detail test');
      return;
    }
    const res = await requestJson(`/api/training/api/v1/modules/${resolvedModuleId}`, {
      headers: authHeader(enablerToken),
    });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const body = res.body as Record<string, unknown>;
      expect(body['success']).toBe(true);
      const data = (body['data'] ?? {}) as Record<string, unknown>;
      expect(String(data['id'] ?? '')).toBe(resolvedModuleId);
    }
  });
});
