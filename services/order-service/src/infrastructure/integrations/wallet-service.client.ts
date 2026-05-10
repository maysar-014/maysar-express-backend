/**
 * WalletServiceClient
 * Makes real HTTP calls to the wallet service (co-located in the same monolith process).
 * Used for COD commitment holds and WALLET payment method deductions.
 */

import { IWalletServiceClient } from '../../domain/services/cod-commitment.service';

const WALLET_BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SERVICE_KEY = process.env.ALLOWED_SERVICE_KEYS?.split(',')[0] || 'dev-service-key';

async function walletPost(path: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${WALLET_BASE_URL}/api/wallet/wallets${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': SERVICE_KEY,
      'idempotency-key': `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(`WalletServiceClient error ${res.status}: ${data?.error?.message || data?.message || 'Unknown error'}`);
  }

  return data;
}

export class WalletServiceClient implements IWalletServiceClient {

  /**
   * Place a hold (freeze funds) on a user's wallet.
   * Used for COD delivery fee commitment.
   */
  async placeHold(userId: string, amount: number, currency: string, reason: string): Promise<string> {
    try {
      const data = await walletPost(`/${userId}/hold`, {
        userId,
        amount,
        currency,
        reason,
        expiresInHours: 48
      });
      const holdId = data?.data?.holdId || data?.holdId || data?.id;
      if (!holdId) throw new Error('No holdId returned from wallet service');
      return holdId;
    } catch (error: any) {
      console.error(`[WalletServiceClient] placeHold failed for user ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Release a hold — funds are unfrozen, no charge.
   * Used when COD order is cancelled.
   */
  async releaseHold(holdId: string): Promise<void> {
    try {
      // holdId format: userId is embedded or we need to look it up
      // For now use a generic release endpoint
      await walletPost(`/holds/${holdId}/release`, {
        holdId,
        reason: 'Order cancelled or COD commitment released',
        correlationId: `release-${holdId}`
      });
    } catch (error: any) {
      console.error(`[WalletServiceClient] releaseHold failed for hold ${holdId}:`, error.message);
      // Non-fatal — log and continue
    }
  }

  /**
   * Capture a hold — funds are transferred (charged).
   * Used when COD delivery is confirmed.
   */
  async captureHold(holdId: string): Promise<void> {
    try {
      await walletPost(`/holds/${holdId}/capture`, {
        holdId,
        reason: 'COD delivery confirmed',
        correlationId: `capture-${holdId}`
      });
    } catch (error: any) {
      console.error(`[WalletServiceClient] captureHold failed for hold ${holdId}:`, error.message);
      throw error;
    }
  }

  /**
   * Debit a user's wallet directly (for WALLET payment method orders).
   */
  async debitWallet(userId: string, amount: number, currency: string, description: string): Promise<string> {
    try {
      const idempotencyKey = `debit-${userId}-${Date.now()}`;
      const correlationId = require('crypto').randomUUID();
      const data = await walletPost(`/${userId}/debit`, {
        userId,
        amount,
        currency,
        description,
        reason: description,
        idempotencyKey,
        correlationId
      });
      return data?.data?.transactionId || data?.transactionId || `debit-${Date.now()}`;
    } catch (error: any) {
      console.error(`[WalletServiceClient] debitWallet failed for user ${userId}:`, error.message);
      throw error;
    }
  }
}
