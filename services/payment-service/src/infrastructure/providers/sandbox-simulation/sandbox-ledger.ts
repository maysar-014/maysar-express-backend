/**
 * Sandbox transaction ledger.
 *
 * The source of truth for simulated sandbox transactions. Every sandbox
 * payment initiated through the SandboxSimulatorAdapter is recorded here and
 * progresses through the SAME status lifecycle a real provider transaction
 * would (PENDING → PROCESSING → terminal). Status verification (webhook
 * resolution, polling) reads from this ledger — never from imagination.
 *
 * Invariants:
 *  - Terminal states are immutable: a late/duplicate callback can never
 *    move a finished transaction backwards or double-complete it.
 *  - References are prefixed with `sbx_` so the webhook router can always
 *    distinguish sandbox traffic from real provider traffic.
 */

export type SandboxTransactionStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

import type { SandboxOutcome } from "./sandbox-behavior";

const TERMINAL_STATUSES: ReadonlySet<SandboxTransactionStatus> = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export interface SandboxTransaction {
  providerReference: string;
  providerTransactionId: string;
  methodCode: string;
  channel: string;
  amount: number;
  currency: string;
  status: SandboxTransactionStatus;
  /** Deterministic outcome resolved at initiation time. */
  outcome?: SandboxOutcome;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  /** How many callbacks/webhooks have been delivered for this transaction. */
  webhookDeliveries: number;
}

export function isSandboxReference(providerReference: string): boolean {
  return (
    typeof providerReference === "string" &&
    providerReference.startsWith("sbx_")
  );
}

export class SandboxLedger {
  private readonly transactions = new Map<string, SandboxTransaction>();

  create(input: {
    providerReference: string;
    providerTransactionId: string;
    methodCode: string;
    channel: string;
    amount: number;
    currency: string;
    outcome?: SandboxOutcome;
  }): SandboxTransaction {
    if (this.transactions.has(input.providerReference)) {
      throw new Error(
        `Duplicate sandbox transaction reference: ${input.providerReference}`,
      );
    }
    const now = new Date();
    const tx: SandboxTransaction = {
      ...input,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
      webhookDeliveries: 0,
    };
    this.transactions.set(input.providerReference, tx);
    return { ...tx };
  }

  get(providerReference: string): SandboxTransaction | null {
    const tx = this.transactions.get(providerReference);
    return tx ? { ...tx } : null;
  }

  /** Marks the transaction as accepted/processing (initiated with provider). */
  markProcessing(providerReference: string): SandboxTransaction {
    return this.transition(providerReference, "PROCESSING");
  }

  /**
   * Applies a terminal status. Idempotent: once terminal, the transaction is
   * frozen — repeated calls can never re-process or change the outcome.
   * Delivery bookkeeping is intentionally NOT here; the adapter records every
   * inbound callback (recordWebhookDelivery) so a single delivery counts once.
   */
  applyTerminal(
    providerReference: string,
    status: "COMPLETED" | "FAILED" | "CANCELLED",
    failureReason?: string,
  ): SandboxTransaction {
    const tx = this.transactions.get(providerReference);
    if (!tx) {
      throw new Error(`Unknown sandbox transaction: ${providerReference}`);
    }
    if (TERMINAL_STATUSES.has(tx.status)) {
      // Duplicate callback — keep the original outcome, no state change.
      return { ...tx };
    }
    return this.transition(providerReference, status, failureReason);
  }

  /** Records an inbound webhook delivery (duplicate protection bookkeeping). */
  recordWebhookDelivery(providerReference: string): void {
    const tx = this.transactions.get(providerReference);
    if (tx) {
      tx.webhookDeliveries += 1;
    }
  }

  private transition(
    providerReference: string,
    status: SandboxTransactionStatus,
    failureReason?: string,
  ): SandboxTransaction {
    const tx = this.transactions.get(providerReference);
    if (!tx) {
      throw new Error(`Unknown sandbox transaction: ${providerReference}`);
    }
    if (TERMINAL_STATUSES.has(tx.status)) {
      return { ...tx };
    }
    if (status === "PENDING") {
      return { ...tx };
    }
    tx.status = status;
    tx.updatedAt = new Date();
    if (failureReason) {
      tx.failureReason = failureReason;
    }
    if (TERMINAL_STATUSES.has(status)) {
      tx.completedAt = tx.updatedAt;
    }
    return { ...tx };
  }
}
