/**
 * LedgerEntry Entity (Phase 3 §3.3)
 *
 * One append-only accounting entry in the logistics ledger. Sign convention:
 * positive amountTzs = income to the counterparty, negative = cost.
 *
 * Every entry stores pricingVersion / tariffVersion / routingVersion + full
 * metadata so any historical transaction can be reproduced exactly six months
 * later (backlog rule 4). Rows are NEVER updated — corrections are new
 * entries (e.g. REFUND or ADJUSTMENT).
 */

export type LedgerEntryType =
  | 'BUYER_LOGISTICS_CHARGE'
  | 'CARRIER_PAYABLE'
  | 'SUPPLIER_LOGISTICS_CHARGE'
  | 'MAYSAR_LOGISTICS_REVENUE'
  | 'DISCOUNT_MAYSAR_FUNDED'
  | 'DISCOUNT_SUPPLIER_FUNDED'
  | 'PENALTY'
  | 'REFUND'
  | 'ADJUSTMENT'
  | 'CONSOLIDATION_SAVING';

export interface LedgerEntryData {
  id: string;
  deliveryJobId: string;
  shipmentId: string | null;
  entryType: LedgerEntryType;
  amountTzs: number;
  counterpartyId: string;
  pricingVersion: number;
  tariffVersion: number | null;
  routingVersion: string | null;
  calculatedAt: Date;
  metadata: Record<string, unknown>;
}

const ENTRY_TYPES: LedgerEntryType[] = [
  'BUYER_LOGISTICS_CHARGE', 'CARRIER_PAYABLE', 'SUPPLIER_LOGISTICS_CHARGE', 'MAYSAR_LOGISTICS_REVENUE',
  'DISCOUNT_MAYSAR_FUNDED', 'DISCOUNT_SUPPLIER_FUNDED', 'PENALTY', 'REFUND', 'ADJUSTMENT', 'CONSOLIDATION_SAVING',
];

export class LedgerEntry {
  private data: LedgerEntryData;

  constructor(data: LedgerEntryData) {
    if (!ENTRY_TYPES.includes(data.entryType)) {
      throw new Error(`LedgerEntry invariant violation: unknown entryType '${data.entryType}'`);
    }
    if (!Number.isFinite(data.amountTzs)) {
      throw new Error('LedgerEntry invariant violation: amountTzs must be a finite number');
    }
    if (!(data.pricingVersion >= 0)) throw new Error('LedgerEntry invariant violation: pricingVersion is required');
    this.data = { ...data };
  }

  static create(params: {
    id: string;
    deliveryJobId: string;
    shipmentId?: string | null;
    entryType: LedgerEntryType;
    amountTzs: number;
    counterpartyId: string;
    pricingVersion: number;
    tariffVersion?: number | null;
    routingVersion?: string | null;
    metadata: Record<string, unknown>;
    calculatedAt?: Date;
  }): LedgerEntry {
    return new LedgerEntry({
      ...params,
      shipmentId: params.shipmentId ?? null,
      tariffVersion: params.tariffVersion ?? null,
      routingVersion: params.routingVersion ?? null,
      calculatedAt: params.calculatedAt ?? new Date(),
    });
  }

  // ── Read-only getters (append-only — no mutators) ──────────────────────────
  get id(): string { return this.data.id; }
  get deliveryJobId(): string { return this.data.deliveryJobId; }
  get shipmentId(): string | null { return this.data.shipmentId; }
  get entryType(): LedgerEntryType { return this.data.entryType; }
  get amountTzs(): number { return this.data.amountTzs; }
  get counterpartyId(): string { return this.data.counterpartyId; }
  get pricingVersion(): number { return this.data.pricingVersion; }
  get tariffVersion(): number | null { return this.data.tariffVersion; }
  get routingVersion(): string | null { return this.data.routingVersion; }
  get calculatedAt(): Date { return this.data.calculatedAt; }
  get metadata(): Record<string, unknown> { return { ...this.data.metadata }; }

  toData(): LedgerEntryData {
    return { ...this.data };
  }
}