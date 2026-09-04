import { DeliveryZone } from '../services/zone-classifier';

export interface PricingAuditRecordData {
  id: string;
  orderId?: string;
  quoteId: string;
  pricingVersion: number;
  courierCompensationEstimate: number;
  buyerDeliveryFee: number;
  platformMarginAmount: number;
  deliveryZone: DeliveryZone | null;
  packageWeightKg: number;
  distanceKm: number;
  durationMinutes: number;
  recordedAt: Date;
}

/** Immutable audit record — no setters, no update methods. */
export class PricingAuditRecord {
  constructor(private readonly data: PricingAuditRecordData) {
    // Enforce immutability at construction
    Object.freeze(this.data);
  }

  get id(): string { return this.data.id; }
  get orderId(): string | undefined { return this.data.orderId; }
  get quoteId(): string { return this.data.quoteId; }
  get pricingVersion(): number { return this.data.pricingVersion; }
  get courierCompensationEstimate(): number { return this.data.courierCompensationEstimate; }
  get buyerDeliveryFee(): number { return this.data.buyerDeliveryFee; }
  get platformMarginAmount(): number { return this.data.platformMarginAmount; }
  get deliveryZone(): DeliveryZone | null { return this.data.deliveryZone; }
  get packageWeightKg(): number { return this.data.packageWeightKg; }
  get distanceKm(): number { return this.data.distanceKm; }
  get durationMinutes(): number { return this.data.durationMinutes; }
  get recordedAt(): Date { return this.data.recordedAt; }

  toJSON(): PricingAuditRecordData {
    return { ...this.data };
  }
}
