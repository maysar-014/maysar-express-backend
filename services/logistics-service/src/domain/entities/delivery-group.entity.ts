/**
 * DeliveryGroup Entity
 *
 * Represents one physical courier operation containing one or more seller
 * pickup points and one buyer destination.
 *
 * Status transitions (enforced at entity level):
 *   PENDING_PRICING → PRICED → QUOTE_ISSUED → CONSUMED
 *   Any state → CANCELLED
 *
 * Invariants:
 *   - sellerOrderIds.length === pickupSequence.length
 *   - totalDeliveryCost >= 0
 *   - Immutable after QUOTE_ISSUED (no further modifications to members/cost)
 */

import { GeoPoint } from '../value-objects/geopoint.value-object';
import { makeId } from '../../../../../shared/ids/id';

export type DeliveryGroupStatus =
  | 'PENDING_PRICING'
  | 'PRICED'
  | 'QUOTE_ISSUED'
  | 'CONSUMED'
  | 'CANCELLED';

export interface DeliveryGroupData {
  id: string;
  masterOrderId: string;
  sellerOrderIds: string[];
  pickupSequence: GeoPoint[];
  buyerDestination: GeoPoint;
  totalDeliveryCost: number;
  pricingVersion: number;
  allocationAlgorithm: 'weight_proportional';
  status: DeliveryGroupStatus;
  quoteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_TRANSITIONS: Record<DeliveryGroupStatus, DeliveryGroupStatus[]> = {
  PENDING_PRICING: ['PRICED', 'CANCELLED'],
  PRICED:          ['QUOTE_ISSUED', 'CANCELLED'],
  QUOTE_ISSUED:    ['CONSUMED', 'CANCELLED'],
  CONSUMED:        [],
  CANCELLED:       [],
};

export function makeDeliveryGroupId(): string {
  return makeId('DCG');
}

export class DeliveryGroup {
  private data: DeliveryGroupData;

  constructor(data: DeliveryGroupData) {
    if (data.sellerOrderIds.length !== data.pickupSequence.length) {
      throw new Error(
        `DeliveryGroup invariant violation: sellerOrderIds.length (${data.sellerOrderIds.length}) !== pickupSequence.length (${data.pickupSequence.length})`,
      );
    }
    if (data.totalDeliveryCost < 0) {
      throw new Error(`DeliveryGroup invariant violation: totalDeliveryCost must be >= 0`);
    }
    this.data = { ...data };
  }

  static create(params: Omit<DeliveryGroupData, 'id' | 'status' | 'createdAt' | 'updatedAt'>): DeliveryGroup {
    return new DeliveryGroup({
      ...params,
      id: makeDeliveryGroupId(),
      status: 'PENDING_PRICING',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get id(): string { return this.data.id; }
  get masterOrderId(): string { return this.data.masterOrderId; }
  get sellerOrderIds(): string[] { return [...this.data.sellerOrderIds]; }
  get pickupSequence(): GeoPoint[] { return [...this.data.pickupSequence]; }
  get buyerDestination(): GeoPoint { return this.data.buyerDestination; }
  get totalDeliveryCost(): number { return this.data.totalDeliveryCost; }
  get pricingVersion(): number { return this.data.pricingVersion; }
  get allocationAlgorithm(): 'weight_proportional' { return this.data.allocationAlgorithm; }
  get status(): DeliveryGroupStatus { return this.data.status; }
  get quoteId(): string | undefined { return this.data.quoteId; }
  get createdAt(): Date { return this.data.createdAt; }
  get updatedAt(): Date { return this.data.updatedAt; }
  get sellerCount(): number { return this.data.sellerOrderIds.length; }
  get isConsolidated(): boolean { return this.data.sellerOrderIds.length > 1; }

  // ── State transitions ─────────────────────────────────────────────────────

  markPriced(totalDeliveryCost: number, pricingVersion: number): void {
    this.transitionTo('PRICED');
    this.data.totalDeliveryCost = totalDeliveryCost;
    this.data.pricingVersion = pricingVersion;
    this.data.updatedAt = new Date();
  }

  markQuoteIssued(quoteId: string): void {
    this.transitionTo('QUOTE_ISSUED');
    this.data.quoteId = quoteId;
    this.data.updatedAt = new Date();
  }

  markConsumed(): void {
    this.transitionTo('CONSUMED');
    this.data.updatedAt = new Date();
  }

  markCancelled(): void {
    this.transitionTo('CANCELLED');
    this.data.updatedAt = new Date();
  }

  toData(): DeliveryGroupData {
    return { ...this.data };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private transitionTo(next: DeliveryGroupStatus): void {
    const allowed = VALID_TRANSITIONS[this.data.status];
    if (!allowed.includes(next)) {
      throw new Error(
        `Invalid DeliveryGroup transition: ${this.data.status} → ${next}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }
    this.data.status = next;
  }
}
