/**
 * Cost-model repository contracts (Phase 3 §3.2–3.4).
 *
 * CostAdjustment and LedgerEntry are CREATE-ONLY: implementations must never
 * expose update/delete. Settlement reads them; it never re-derives amounts
 * from current config (backlog rules 7 and 4).
 */

import { CostAdjustment, ResponsibleParty } from '../entities/cost-adjustment.entity';
import { LedgerEntry, LedgerEntryType } from '../entities/ledger-entry.entity';
import { FulfillmentCommitment } from '../entities/fulfillment-commitment.entity';

export interface CostAdjustmentRepository {
  /** Creates the immutable adjustment. No update/delete exists. */
  save(adjustment: CostAdjustment): Promise<void>;
  findByDeliveryJobId(deliveryJobId: string): Promise<CostAdjustment[]>;
  findByDeliveryJobIdAndParty(deliveryJobId: string, party: ResponsibleParty): Promise<CostAdjustment[]>;
}

export interface LedgerEntryRepository {
  /** Appends one entry. No update/delete exists. */
  append(entry: LedgerEntry): Promise<void>;
  findByDeliveryJobId(deliveryJobId: string): Promise<LedgerEntry[]>;
  findByDeliveryJobIdAndType(deliveryJobId: string, entryType: LedgerEntryType): Promise<LedgerEntry[]>;
}

export interface FulfillmentCommitmentRepository {
  save(commitment: FulfillmentCommitment): Promise<void>;
  findByQuoteId(quoteId: string): Promise<FulfillmentCommitment | null>;
  findByCheckoutSessionId(checkoutSessionId: string): Promise<FulfillmentCommitment[]>;
  /** Status transition persistence (LOCKED → CONSUMED | EXPIRED). */
  updateStatus(id: string, status: string): Promise<void>;
}