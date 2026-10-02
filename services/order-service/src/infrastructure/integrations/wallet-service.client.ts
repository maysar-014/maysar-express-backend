/**
 * WalletServiceClient
 * Makes real HTTP calls to the wallet service (co-located in the same monolith process).
 * Generates a short-lived JWT for the target user to satisfy wallet auth middleware.
 */

import { IWalletServiceClient } from "../../domain/services/cod-commitment.service";

const WALLET_BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const JWT_SECRET = process.env.JWT_SECRET || "";

function generateUserToken(userId: string): string {
  const crypto = require("crypto");
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      email: "order-service@internal.maysar.co.tz",
      roles: ["buyer"],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
    }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

async function walletPost(
  userId: string,
  path: string,
  body: Record<string, unknown>,
): Promise<any> {
  const token = generateUserToken(userId);
  const maxAttempts = 5;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`${WALLET_BASE_URL}/api/wallet/wallets${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "idempotency-key": `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      },
      body: JSON.stringify(body),
    });

    // Response.json() is Promise<unknown> under @types/node (lib es2020, no DOM),
    // so annotate as any to allow optional-chained extraction of all response shapes.
    const data: any = await res.json().catch(() => ({}));

    // Retry on 409 wallet lock contention (transient — lock TTL is ~5s)
    if (res.status === 409 && attempt < maxAttempts - 1) {
      const bodyStr = JSON.stringify(data);
      if (bodyStr.includes("acquire lock")) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
    }

    if (!res.ok) {
      throw new Error(
        `WalletServiceClient error ${res.status}: ${data?.error?.message || data?.message || JSON.stringify(data)}`,
      );
    }

    return data;
  }

  throw new Error(
    "WalletServiceClient: exhausted retries on wallet lock contention",
  );
}

export class WalletServiceClient implements IWalletServiceClient {
  async placeHold(
    userId: string,
    amount: number,
    currency: string,
    reason: string,
    referenceId?: string,
  ): Promise<string> {
    try {
      const idempotencyKey = `hold-${userId}-${Date.now()}`;
      const data = await walletPost(userId, `/${userId}/hold`, {
        userId,
        amount,
        currency,
        reason,
        // The order id is stored as a structured reference on the hold. Without
        // it, a hold that failed to release could only be identified by parsing
        // the human-readable reason — and the wallet's reconciliation job (the
        // safety net for stranded customer funds) has to be able to trust that
        // lookup.
        ...(referenceId ? { referenceId, referenceType: 'ORDER' } : {}),
        expiresInSeconds: 48 * 3600, // 48 hours in seconds
        idempotencyKey,
        correlationId: require("crypto").randomUUID(),
      });
      const holdId = data?.holdId || data?.data?.holdId || data?.id;
      if (!holdId) throw new Error("No holdId returned from wallet service");
      return holdId;
    } catch (error: any) {
      console.error(
        `[WalletServiceClient] placeHold failed for user ${userId}:`,
        error.message,
      );
      throw error;
    }
  }

  async releaseHold(holdId: string, userId: string, reason?: string): Promise<void> {
    try {
      // The wallet exposes holds under their owner:
      //   POST /:userId/hold/:holdId/release
      // This used to post to /holds/:holdId/release with a "system" token. Both
      // were wrong: the route did not exist under that shape, and
      // authorizeWalletAccess() rejects a "system" identity — so every release
      // silently failed and a cancelled COD order left the buyer's funds frozen
      // forever (the controller only logged a warning).
      const token = generateUserToken(userId);
      const res = await fetch(
        `${WALLET_BASE_URL}/api/wallet/wallets/${userId}/hold/${holdId}/release`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "idempotency-key": `release-${holdId}`,
          },
          body: JSON.stringify({
            userId,
            holdId,
            reason: reason ?? `COD commitment released for hold ${holdId}`,
            correlationId: require("crypto").randomUUID(),
            idempotencyKey: `release-${holdId}`,
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Failed to release wallet hold ${holdId}: HTTP ${res.status} ${text.slice(0, 200)}`
        );
      }
    } catch (error: any) {
      // Re-thrown rather than swallowed: the caller (OrderController) decides how
      // a failed release is handled and logs it there. Swallowing it here is what
      // let a permanently frozen hold go unnoticed.
      throw new Error(
        `[WalletServiceClient] releaseHold failed for hold ${holdId}: ${error.message}`
      );
    }
  }

  async captureHold(holdId: string, userId: string, reason?: string): Promise<void> {
    try {
      // Same defects as releaseHold: the real route is
      // POST /:userId/hold/:holdId/capture, and authorizeWalletAccess() rejects
      // the "system" identity. Capturing is what actually takes the money on
      // confirmed delivery, so a silent failure here means the platform never
      // collects the COD delivery fee.
      const token = generateUserToken(userId);
      const res = await fetch(
        `${WALLET_BASE_URL}/api/wallet/wallets/${userId}/hold/${holdId}/capture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "idempotency-key": `capture-${holdId}`,
          },
          body: JSON.stringify({
            userId,
            holdId,
            reason: reason ?? "COD delivery confirmed",
            correlationId: require("crypto").randomUUID(),
            idempotencyKey: `capture-${holdId}`,
          }),
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `captureHold HTTP ${res.status} ${text.slice(0, 200)}`
        );
      }
    } catch (error: any) {
      console.error(
        `[WalletServiceClient] captureHold failed for hold ${holdId}:`,
        error.message,
      );
      throw error;
    }
  }

  async debitWallet(
    userId: string,
    amount: number,
    currency: string,
    description: string,
    referenceId?: string,
  ): Promise<string> {
    try {
      const idempotencyKey = `debit-${userId}-${Date.now()}`;
      const correlationId = require("crypto").randomUUID();
      const data = await walletPost(userId, `/${userId}/debit`, {
        userId,
        amount,
        currency,
        description,
        reason: description,
        // The debit endpoint already accepts referenceId/referenceType; without
        // them the stored transaction keeps referenceId = NULL and order
        // cancellation cannot find the debit to refund.
        ...(referenceId ? { referenceId, referenceType: 'ORDER' } : {}),
        idempotencyKey,
        correlationId,
      });

      // The wallet service returns HTTP 200 with { success: false, message: '...' }
      // for business-rule failures (insufficient funds, limit exceeded, velocity block).
      // We must treat these as hard errors — a false success here means the ledger
      // was never touched and the order must not be created.
      if (data?.success === false) {
        const reason =
          data?.message ||
          data?.error ||
          "Wallet debit rejected by wallet service";
        console.error(
          `[WalletServiceClient] debitWallet rejected for user ${userId}: ${reason}`,
        );
        throw new Error(reason);
      }

      const transactionId = data?.transactionId || data?.data?.transactionId;
      if (!transactionId) {
        // No transactionId means the debit did not actually complete — fail hard.
        throw new Error(
          "Wallet debit returned no transactionId — debit may not have completed",
        );
      }

      return transactionId;
    } catch (error: any) {
      console.error(
        `[WalletServiceClient] debitWallet failed for user ${userId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Credit the wallet owner's account (saga compensation / refund on order cancellation).
   * Authenticates as the wallet owner (userId) to satisfy authorizeWalletAccess — the same
   * pattern used by debitWallet via walletPost. CreditWalletUseCase applies no per-user
   * velocity limits, so owner-token authentication is both correct and safe here.
   */
  async creditWallet(
    userId: string,
    amount: number,
    currency: string,
    description: string,
    referenceId?: string,
  ): Promise<string> {
    try {
      // Mint the wallet owner's token — authorizeWalletAccess requires owner == :userId in path.
      const token = generateUserToken(userId);
      // Use a stable key derived from the order ID so retries are idempotent and cannot double-credit.
      const idempotencyKey = referenceId
        ? `credit-cancel-${referenceId}`
        : `credit-cancel-${userId}-${Date.now()}`;
      const correlationId = require("crypto").randomUUID();

      const res = await fetch(
        `${WALLET_BASE_URL}/api/wallet/wallets/${userId}/credit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "idempotency-key": idempotencyKey,
            "x-correlation-id": correlationId,
          },
          body: JSON.stringify({
            userId,
            amount,
            currency,
            description,
            referenceType: "order_cancellation",
            referenceId: referenceId || userId,
            idempotencyKey,
            correlationId,
          }),
        },
      );

      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          `creditWallet HTTP ${res.status}: ${data?.message || JSON.stringify(data)}`,
        );
      }

      return data?.transactionId || data?.data?.transactionId || idempotencyKey;
    } catch (error: any) {
      console.error(
        `[WalletServiceClient] creditWallet failed for user ${userId}:`,
        error.message,
      );
      throw error;
    }
  }
}
