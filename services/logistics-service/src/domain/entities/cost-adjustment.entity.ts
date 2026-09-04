/**
 * CostAdjustment Entity (Phase 3 §3.2)
 *
 * Immutable record of a logistics cost that deviated from plan, with an
 * attributed responsible party. Foundation of fair settlement:
 *   - CUSTOMER-attributed costs may be recovered per CostVariancePolicy
 *   - MAYSAR-attributed costs are absorbed by Maysar
 *   - SUPPLIER-attributed costs are deducted from supplier settlement
 *
 * Create-only: there are no mutators. Immutability after creation is the
 * contract — corrections are new adjustments, never edits.
 */

export type CostAdjustmentType =
  | 'WAITING'
  | 'FAILED_DELIVERY_ATTEMPT'
  | 'ROUTE_DEVIATION'
  | 'LOADING_DELAY'
  | 'DAMAGE'
  | 'DISPUTE';

export type ResponsibleParty = 'CUSTOMER' | 'SUPPLIER' | 'DRIVER' | 'MAYSAR' | 'EXTERNAL';

export interface CostAdjustmentData {
  id: string;
  deliveryJobId: string;
  shipmentId: string | null;
  adjustmentType: CostAdjustmentType;
  amountTzs: number;
  responsibleParty: ResponsibleParty;
  reason: string;
  evidenceUrl: string | null;
  recordedAt: Date;
  recordedBy: string;
}

const ADJUSTMENT_TYPES: CostAdjustmentType[] = [
  'WAITING', 'FAILED_DELIVERY_ATTEMPT', 'ROUTE_DEVIATION', 'LOADING_DELAY', 'DAMAGE', 'DISPUTE',
];
const RESPONSIBLE_PARTIES: ResponsibleParty[] = ['CUSTOMER', 'SUPPLIER', 'DRIVER', 'MAYSAR', 'EXTERNAL'];

export class CostAdjustment {
  private data: CostAdjustmentData;

  constructor(data: CostAdjustmentData) {
    if (!ADJUSTMENT_TYPES.includes(data.adjustmentType)) {
      throw new Error(`CostAdjustment invariant violation: unknown adjustmentType '${data.adjustmentType}'`);
    }
    if (!RESPONSIBLE_PARTIES.includes(data.responsibleParty)) {
      throw new Error(`CostAdjustment invariant violation: unknown responsibleParty '${data.responsibleParty}'`);
    }
    if (!(data.amountTzs >= 0)) throw new Error('CostAdjustment invariant violation: amountTzs cannot be negative');
    if (!data.reason?.trim()) throw new Error('CostAdjustment invariant violation: reason is required for ops');
    this.data = { ...data };
  }

  static create(params: {
    id: string;
    deliveryJobId: string;
    shipmentId?: string | null;
    adjustmentType: CostAdjustmentType;
    amountTzs: number;
    responsibleParty: ResponsibleParty;
    reason: string;
    evidenceUrl?: string | null;
    recordedBy: string;
    recordedAt?: Date;
  }): CostAdjustment {
    return new CostAdjustment({
      ...params,
      shipmentId: params.shipmentId ?? null,
      evidenceUrl: params.evidenceUrl ?? null,
      recordedAt: params.recordedAt ?? new Date(),
    });
  }

  // ── Read-only getters (no setters — immutable after creation) ─────────────
  get id(): string { return this.data.id; }
  get deliveryJobId(): string { return this.data.deliveryJobId; }
  get shipmentId(): string | null { return this.data.shipmentId; }
  get adjustmentType(): CostAdjustmentType { return this.data.adjustmentType; }
  get amountTzs(): number { return this.data.amountTzs; }
  get responsibleParty(): ResponsibleParty { return this.data.responsibleParty; }
  get reason(): string { return this.data.reason; }
  get evidenceUrl(): string | null { return this.data.evidenceUrl; }
  get recordedAt(): Date { return this.data.recordedAt; }
  get recordedBy(): string { return this.data.recordedBy; }

  toData(): CostAdjustmentData {
    return { ...this.data };
  }
}