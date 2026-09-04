import { PricingBreakdown } from '../engines/delivery-pricing.engine';
import { ThreeEngineQuoteBreakdown } from '../engines/three-engine-breakdown';
import { DeliveryZone } from '../services/zone-classifier';

export type QuoteStatus = 'ACTIVE' | 'EXPIRED' | 'CONSUMED' | 'DELIVERY_UNAVAILABLE';

/** Either the interim 11-stage pipeline breakdown or the Phase 3 three-engine breakdown. */
export type QuoteBreakdown = PricingBreakdown | ThreeEngineQuoteBreakdown;

export interface QuoteData {
  quoteId: string;
  deliveryFee: number;
  courierCompensationEstimate: number;
  platformMarginAmount: number;
  pricingVersion: number;
  originLat: number;
  originLng: number;
  originAddress: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  packageWeightKg: number;
  deliveryZone: DeliveryZone | null;
  status: QuoteStatus;
  issuedAt: Date;
  expiresAt: Date;
  breakdown: QuoteBreakdown | null;
  unavailableReason?: string;
  consumedAt?: Date;
}

export interface QuoteResponse {
  quoteId: string;
  status: QuoteStatus;
  deliveryFee: number | null;
  currency: 'TZS';
  expiresAt: string;
  pricingVersion: number;
  deliveryZone: DeliveryZone | null;
  breakdown: QuoteBreakdown | null;
  unavailableReason?: string;
}

export class Quote {
  private data: QuoteData;

  constructor(data: QuoteData) {
    this.data = { ...data };
  }

  get quoteId(): string { return this.data.quoteId; }
  get status(): QuoteStatus { return this.data.status; }
  get deliveryFee(): number { return this.data.deliveryFee; }
  get pricingVersion(): number { return this.data.pricingVersion; }
  get courierCompensationEstimate(): number { return this.data.courierCompensationEstimate; }
  get platformMarginAmount(): number { return this.data.platformMarginAmount; }
  get deliveryZone(): DeliveryZone | null { return this.data.deliveryZone; }
  get issuedAt(): Date { return this.data.issuedAt; }
  get expiresAt(): Date { return this.data.expiresAt; }
  get breakdown(): QuoteBreakdown | null { return this.data.breakdown; }
  get unavailableReason(): string | undefined { return this.data.unavailableReason; }
  get packageWeightKg(): number { return this.data.packageWeightKg; }
  get originLat(): number { return this.data.originLat; }
  get originLng(): number { return this.data.originLng; }
  get destinationLat(): number { return this.data.destinationLat; }
  get destinationLng(): number { return this.data.destinationLng; }

  get isExpired(): boolean {
    return this.data.status === 'EXPIRED' || Date.now() > this.data.expiresAt.getTime();
  }

  get isUnavailable(): boolean {
    return this.data.status === 'DELIVERY_UNAVAILABLE';
  }

  markConsumed(): void {
    this.data.status = 'CONSUMED';
    this.data.consumedAt = new Date();
  }

  toResponse(): QuoteResponse {
    return {
      quoteId: this.data.quoteId,
      status: this.data.status,
      deliveryFee: this.data.status === 'DELIVERY_UNAVAILABLE' ? null : this.data.deliveryFee,
      currency: 'TZS',
      expiresAt: this.data.expiresAt.toISOString(),
      pricingVersion: this.data.pricingVersion,
      deliveryZone: this.data.deliveryZone,
      breakdown: this.data.breakdown,
      unavailableReason: this.data.unavailableReason,
    };
  }

  toData(): QuoteData {
    return { ...this.data };
  }
}
