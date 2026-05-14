/**
 * WalletServiceClient
 * Makes real HTTP calls to the wallet service (co-located in the same monolith process).
 * Generates a short-lived JWT for the target user to satisfy wallet auth middleware.
 */

import { IWalletServiceClient } from '../../domain/services/cod-commitment.service';

const WALLET_BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const JWT_SECRET = process.env.JWT_SECRET || '';

function generateUserToken(userId: string): string {
  const crypto = require('crypto');
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    userId,
    email: 'order-service@internal.maysar.co.tz',
    roles: ['buyer'],
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

async function walletPost(userId: string, path: string, body: Record<string, unknown>): Promise<any> {
  const token = generateUserToken(userId);
  const res = await fetch(`${WALLET_BASE_URL}/api/wallet/wallets${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'idempotency-key': `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`WalletServiceClient error ${res.status}: ${data?.error?.message || data?.message || JSON.stringify(data)}`);
  }

  return data;
}

export class WalletServiceClient implements IWalletServiceClient {

  async placeHold(userId: string, amount: number, currency: string, reason: string): Promise<string> {
    try {
      const idempotencyKey = `hold-${userId}-${Date.now()}`;
      const data = await walletPost(userId, `/${userId}/hold`, {
        userId,
        amount,
        currency,
        reason,
        expiresInSeconds: 48 * 3600, // 48 hours in seconds
        idempotencyKey,
        correlationId: require('crypto').randomUUID(),
      });
      const holdId = data?.holdId || data?.data?.holdId || data?.id;
      if (!holdId) throw new Error('No holdId returned from wallet service');
      return holdId;
    } catch (error: any) {
      console.error(`[WalletServiceClient] placeHold failed for user ${userId}:`, error.message);
      throw error;
    }
  }

  async releaseHold(holdId: string): Promise<void> {
    try {
      // Release hold — userId not needed for release, use a system token
      const token = generateUserToken('system');
      await fetch(`${WALLET_BASE_URL}/api/wallet/wallets/holds/${holdId}/release`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'idempotency-key': `release-${holdId}` },
        body: JSON.stringify({ holdId, reason: 'Order cancelled', correlationId: require('crypto').randomUUID() })
      });
    } catch (error: any) {
      console.error(`[WalletServiceClient] releaseHold failed for hold ${holdId}:`, error.message);
    }
  }

  async captureHold(holdId: string): Promise<void> {
    try {
      const token = generateUserToken('system');
      const res = await fetch(`${WALLET_BASE_URL}/api/wallet/wallets/holds/${holdId}/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'idempotency-key': `capture-${holdId}` },
        body: JSON.stringify({ holdId, reason: 'COD delivery confirmed', correlationId: require('crypto').randomUUID() })
      });
      if (!res.ok) throw new Error(`captureHold HTTP ${res.status}`);
    } catch (error: any) {
      console.error(`[WalletServiceClient] captureHold failed for hold ${holdId}:`, error.message);
      throw error;
    }
  }

  async debitWallet(userId: string, amount: number, currency: string, description: string): Promise<string> {
    try {
      const idempotencyKey = `debit-${userId}-${Date.now()}`;
      const correlationId = require('crypto').randomUUID();
      const data = await walletPost(userId, `/${userId}/debit`, {
        userId, amount, currency, description,
        reason: description,
        idempotencyKey,
        correlationId
      });

      // The wallet service returns HTTP 200 with { success: false, message: '...' }
      // for business-rule failures (insufficient funds, limit exceeded, velocity block).
      // We must treat these as hard errors — a false success here means the ledger
      // was never touched and the order must not be created.
      if (data?.success === false) {
        const reason = data?.message || data?.error || 'Wallet debit rejected by wallet service';
        console.error(`[WalletServiceClient] debitWallet rejected for user ${userId}: ${reason}`);
        throw new Error(reason);
      }

      const transactionId = data?.transactionId || data?.data?.transactionId;
      if (!transactionId) {
        // No transactionId means the debit did not actually complete — fail hard.
        throw new Error('Wallet debit returned no transactionId — debit may not have completed');
      }

      return transactionId;
    } catch (error: any) {
      console.error(`[WalletServiceClient] debitWallet failed for user ${userId}:`, error.message);
      throw error;
    }
  }
}
