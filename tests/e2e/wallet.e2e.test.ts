/**
 * E2E tests: Wallet Ledger Integrity — Flow Doc 08 (Platform Operations)
 *
 * Covers use cases: OPS-02 (wallet credit, debit, balance consistency, round-trip invariant)
 *
 * Priority tiers:
 *   [P1] — run daily in CI
 *
 * Requires: RUN_LIVE_E2E=true, a running backend, and admin credentials.
 * All credit/debit operations use the admin token to avoid buyer permission restrictions.
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
  unlockTestUsers,
  buildWalletMutationRequest,
  sleep,
} from './helpers/live-api';
import { SEEDED_USERS, WALLET_TOP_UP_MINIMUM } from './fixtures/seeded-users';

const BUYER_ID = SEEDED_USERS.buyer.id;

liveTestSuite('Wallet Ledger Integrity — Flow Doc 08', () => {
  let adminToken: string;

  beforeAll(async () => {
    // 1. Health check
    const health = await requestJson('/health');
    expect(health.status).toBe(200);

    // 2. Unlock all test users
    await unlockTestUsers();

    // 3. Obtain admin token
    adminToken = await getAdminToken();

    // 4. Idempotent wallet top-up so all debit tests have enough balance
    await ensureWalletMinimum(BUYER_ID, WALLET_TOP_UP_MINIMUM, adminToken);
    // Wait for wallet lock to fully release after beforeAll top-up
    await sleep(2000);
  }, 120_000);

  // -------------------------------------------------------------------------
  // P1 — Daily CI tests
  // -------------------------------------------------------------------------

  it('[P1] [OPS-02] wallet credit increases balance by the exact credited amount', async () => {
    const creditAmount = 5_000;
    const balanceBefore = await readBalance(adminToken, BUYER_ID);
    const mutation = buildWalletMutationRequest({
      amount: creditAmount,
      description: 'e2e-credit-test'
    });

    const creditResponse = await requestJson(`/api/wallet/wallets/${BUYER_ID}/credit`, {
      method: 'POST',
      headers: { ...authHeader(adminToken), ...mutation.headers },
      body: mutation.body,
    });
    assertOk(creditResponse, 'wallet credit');

    const balanceAfter = await readBalance(adminToken, BUYER_ID);
    expect(balanceAfter).toBe(balanceBefore + creditAmount);
  });

  it('[P1] [OPS-02] wallet debit decreases balance by the exact debited amount', async () => {
    // Delay to avoid Redis lock contention with the previous credit test
    await sleep(1500);
    const debitAmount = 3_000;
    // Ensure there is enough balance before debiting
    await ensureWalletMinimum(BUYER_ID, debitAmount + 10_000, adminToken);

    const balanceBefore = await readBalance(adminToken, BUYER_ID);
    const mutation = buildWalletMutationRequest({
      amount: debitAmount,
      description: 'e2e-debit-test',
      userId: BUYER_ID,
      reason: 'e2e-test'
    });

    const debitResponse = await requestJson(`/api/wallet/wallets/${BUYER_ID}/debit`, {
      method: 'POST',
      headers: { ...authHeader(adminToken), ...mutation.headers },
      body: mutation.body,
    });
    assertOk(debitResponse, 'wallet debit');

    const balanceAfter = await readBalance(adminToken, BUYER_ID);
    expect(balanceAfter).toBe(balanceBefore - debitAmount);
  });

  it('[P1] [OPS-02] wallet debit rejects amount greater than available balance (4xx, balance unchanged)', async () => {
    // Ensure a known baseline balance before the overdraft test
    await ensureWalletMinimum(BUYER_ID, WALLET_TOP_UP_MINIMUM, adminToken);
    await sleep(1000);

    const balanceBefore = await readBalance(adminToken, BUYER_ID);
    // Request exactly (balance + 1) — guaranteed above balance, well within single-tx limit
    // since balance is always < singleTransactionMax (5,000,000 TZS default).
    const overAmount = balanceBefore + 1;
    const mutation = buildWalletMutationRequest({
      amount: overAmount,
      description: 'e2e-overdraft-test',
      userId: BUYER_ID,
      reason: 'e2e-test'
    });

    const debitResponse = await requestJson(`/api/wallet/wallets/${BUYER_ID}/debit`, {
      method: 'POST',
      headers: { ...authHeader(adminToken), ...mutation.headers },
      body: mutation.body,
    });

    expect(debitResponse.status).toBeGreaterThanOrEqual(400);
    expect(debitResponse.status).toBeLessThan(500);

    // Balance must remain unchanged
    const balanceAfter = await readBalance(adminToken, BUYER_ID);
    expect(balanceAfter).toBe(balanceBefore);
  });

  it('[P1] [OPS-02] credit then debit of the same amount restores balance (round-trip invariant)', async () => {
    // Delay to avoid Redis lock contention with the previous test
    await sleep(1500);
    const roundTripAmount = 7_500;
    const balanceBefore = await readBalance(adminToken, BUYER_ID);
    const creditMutation = buildWalletMutationRequest({
      amount: roundTripAmount,
      description: 'e2e-round-trip-credit'
    });

    // Credit
    const creditResponse = await requestJson(`/api/wallet/wallets/${BUYER_ID}/credit`, {
      method: 'POST',
      headers: { ...authHeader(adminToken), ...creditMutation.headers },
      body: creditMutation.body,
    });
    assertOk(creditResponse, 'round-trip credit');

    // Wait for lock to release before the debit
    await sleep(1500);

    const debitMutation = buildWalletMutationRequest({
      amount: roundTripAmount,
      description: 'e2e-round-trip-debit',
      userId: BUYER_ID,
      reason: 'e2e-test'
    });

    // Debit same amount
    const debitResponse = await requestJson(`/api/wallet/wallets/${BUYER_ID}/debit`, {
      method: 'POST',
      headers: { ...authHeader(adminToken), ...debitMutation.headers },
      body: debitMutation.body,
    });
    assertOk(debitResponse, 'round-trip debit');

    const balanceAfter = await readBalance(adminToken, BUYER_ID);
    expect(balanceAfter).toBe(balanceBefore);
  });
});

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function readBalance(adminToken: string, userId: string): Promise<number> {
  const response = await requestJson(`/api/wallet/wallets/${userId}/balance`, {
    headers: authHeader(adminToken),
  });
  assertOk(response, 'readBalance');
  return extractWalletBalance(response.body);
}
