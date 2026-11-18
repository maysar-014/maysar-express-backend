/**
 * Shipment Entity (Phase 2 §2.1 / MYS-DEL-001 Article 23)
 *
 * The atomic unit of physical movement: one seller group's package travelling
 * from a seller origin to the buyer destination. One order produces one
 * Shipment per seller group. A Shipment is assigned to exactly one DeliveryJob
 * (deliveryJobId) by the consolidation engine.
 *
 * State machine — enforced via named transition methods only; there is no
 * public API to write `status` directly.
 *
 *   CREATED → PLANNED → ASSIGNED → DISPATCHED → DELIVERED → CONFIRMED → SETTLED
 *
 * Failure: a Shipment can enter FAILED (with a mandatory sub-reason) from
 * PLANNED, ASSIGNED, DISPATCHED or DELIVERED. The backlog diagram shows FAILED
 * branching from the tail of the chain, but the mandated sub-reasons
 * (FAILED_PICKUP, SUPPLIER_DELAY, …) occur before delivery, so the earlier
 * pre-terminal states must also be able to fail.
 *
 * Failure sub-reasons: FAILED_PICKUP, CUSTOMER_UNAVAILABLE, SUPPLIER_DELAY,
 * DRIVER_FAILURE, DAMAGED, DISPUTED
 *
 * Constitutional outcome (MYS-DEL-001 Article 23):
 * When a shipment reaches a terminal state (SETTLED or FAILED), `outcomeCode`
 * is set to one of the 10 actor/cause-attributed outcome codes from DeliveryOutcome.
 * `outcomeResponsibleParty` is derived from OUTCOME_RESPONSIBLE_PARTY and
 * recorded for automatic cost attribution by the settlement layer.
 */

import { GeoPoint } from '../value-objects/geopoint.value-object';
import { makeId } from '../../../../../shared/ids/id';
import { makeShipmentTrackingNumber } from '../../../../../shared/ids/human-readable-ids';
import {
  DeliveryOutcome,
  OUTCOME_RESPONSIBLE_PARTY,
  OutcomeResponsibleParty,
  isDeliveryOutcome,
} from '../value-objects/delivery-outcome';
export type ShipmentStatus =
  | 'CREATED'
  | 'PLANNED'
  | 'ASSIGNED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'SETTLED'
  | 'FAILED';

export type ShipmentFailureReason =
  | 'FAILED_PICKUP'
  | 'CUSTOMER_UNAVAILABLE'
  | 'SUPPLIER_DELAY'
  | 'DRIVER_FAILURE'
  | 'DAMAGED'
  | 'DISPUTED';

export type VehicleClass = 'MOTORCYCLE' | 'PICKUP' | 'VAN' | 'TRUCK';

export interface PackageDimensions {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

export interface HandlingRequirements {
  fragile: boolean;
  temperatureControlled: boolean;
  hazmat: boolean;
}

export interface DeliveryWindow {
  earliestAt: Date;
  latestAt: Date;
}

export interface ShipmentData {
  id: string;
  /** Order this shipment belongs to - the order number (ORD-YYYYMMDD-NLNL). */
  orderId: string;
  /** Independent shipment tracking number (TRK-NLNLNL); never the order number. */
  trackingNumber?: string;
  sellerId: string;
  origin: GeoPoint;
  destination: GeoPoint;
  packageWeightKg: number;
  packageDimensions: PackageDimensions | null;
  handlingRequirements: HandlingRequirements;
  requestedDeliveryWindow: DeliveryWindow | null;
  requiredVehicleClass: VehicleClass | null;
  status: ShipmentStatus;
  failureReason: ShipmentFailureReason | null;
  deliveryJobId: string | null;
  /** MYS-DEL-001 Article 23: actor/cause-attributed terminal outcome. Null until terminal. */
  outcomeCode: DeliveryOutcome | null;
  /** Responsible party for cost attribution. Null until outcomeCode is set. */
  outcomeResponsibleParty: OutcomeResponsibleParty | null;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  CREATED:    ['PLANNED'],
  PLANNED:    ['ASSIGNED', 'FAILED'],
  ASSIGNED:   ['DISPATCHED', 'FAILED'],
  DISPATCHED: ['DELIVERED', 'FAILED'],
  DELIVERED:  ['CONFIRMED', 'FAILED'],
  CONFIRMED:  ['SETTLED'],
  SETTLED:    [],
  FAILED:     [],
};

const FAILURE_REASONS: ShipmentFailureReason[] = [
  'FAILED_PICKUP',
  'CUSTOMER_UNAVAILABLE',
  'SUPPLIER_DELAY',
  'DRIVER_FAILURE',
  'DAMAGED',
  'DISPUTED',
];

const VEHICLE_CLASSES: VehicleClass[] = ['MOTORCYCLE', 'PICKUP', 'VAN', 'TRUCK'];

export function makeShipmentId(): string {
  return makeId('SHP');
}

export class Shipment {
  private data: ShipmentData;

  constructor(data: ShipmentData) {
    if (!data.orderId) throw new Error('Shipment invariant violation: orderId is required');
    if (!data.sellerId) throw new Error('Shipment invariant violation: sellerId is required');
    if (!(data.packageWeightKg > 0)) {
      throw new Error(`Shipment invariant violation: packageWeightKg must be > 0 (got ${data.packageWeightKg})`);
    }
    if (data.requiredVehicleClass !== null && !VEHICLE_CLASSES.includes(data.requiredVehicleClass)) {
      throw new Error(`Shipment invariant violation: unknown requiredVehicleClass '${data.requiredVehicleClass}'`);
    }
    if (data.status === 'FAILED' && !data.failureReason) {
      throw new Error('Shipment invariant violation: FAILED status requires a failureReason');
    }
    if (data.status !== 'FAILED' && data.failureReason) {
      throw new Error('Shipment invariant violation: failureReason can only be set when status is FAILED');
    }
    if (data.outcomeCode !== null && !isDeliveryOutcome(data.outcomeCode)) {
      throw new Error(`Shipment invariant violation: unknown outcomeCode '${data.outcomeCode}'`);
    }
    if (data.outcomeCode !== null && data.outcomeResponsibleParty === null) {
      throw new Error('Shipment invariant violation: outcomeCode requires outcomeResponsibleParty');
    }
    // Every shipment owns an independent tracking number. Rows/entities created
    // before this contract existed get one on hydration; nothing ever reuses the
    // order number as a shipment identifier.
    this.data = { ...data, trackingNumber: data.trackingNumber || makeShipmentTrackingNumber() };
  }

  static create(params: {
    orderId: string;
    sellerId: string;
    origin: GeoPoint;
    destination: GeoPoint;
    packageWeightKg: number;
    packageDimensions?: PackageDimensions | null;
    handlingRequirements?: Partial<HandlingRequirements>;
    requestedDeliveryWindow?: DeliveryWindow | null;
    requiredVehicleClass?: VehicleClass | null;
  }): Shipment {
    return new Shipment({
      id: makeShipmentId(),
      orderId: params.orderId,
      sellerId: params.sellerId,
      origin: params.origin,
      destination: params.destination,
      packageWeightKg: params.packageWeightKg,
      packageDimensions: params.packageDimensions ?? null,
      handlingRequirements: {
        fragile: params.handlingRequirements?.fragile ?? false,
        temperatureControlled: params.handlingRequirements?.temperatureControlled ?? false,
        hazmat: params.handlingRequirements?.hazmat ?? false,
      },
      requestedDeliveryWindow: params.requestedDeliveryWindow ?? null,
      requiredVehicleClass: params.requiredVehicleClass ?? null,
      status: 'CREATED',
      failureReason: null,
      deliveryJobId: null,
      outcomeCode: null,
      outcomeResponsibleParty: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get id(): string { return this.data.id; }
  get orderId(): string { return this.data.orderId; }
  get trackingNumber(): string { return this.data.trackingNumber as string; }
  get sellerId(): string { return this.data.sellerId; }
  get origin(): GeoPoint { return this.data.origin; }
  get destination(): GeoPoint { return this.data.destination; }
  get packageWeightKg(): number { return this.data.packageWeightKg; }
  get packageDimensions(): PackageDimensions | null { return this.data.packageDimensions ? { ...this.data.packageDimensions } : null; }
  get handlingRequirements(): HandlingRequirements { return { ...this.data.handlingRequirements }; }
  get requestedDeliveryWindow(): DeliveryWindow | null {
    return this.data.requestedDeliveryWindow
      ? { ...this.data.requestedDeliveryWindow }
      : null;
  }
  get requiredVehicleClass(): VehicleClass | null { return this.data.requiredVehicleClass; }
  get status(): ShipmentStatus { return this.data.status; }
  get failureReason(): ShipmentFailureReason | null { return this.data.failureReason; }
  get deliveryJobId(): string | null { return this.data.deliveryJobId; }
  /** MYS-DEL-001 Article 23: constitutional terminal outcome code. */
  get outcomeCode(): DeliveryOutcome | null { return this.data.outcomeCode; }
  /** Responsible party for cost attribution from this shipment's outcome. */
  get outcomeResponsibleParty(): OutcomeResponsibleParty | null { return this.data.outcomeResponsibleParty; }
  get createdAt(): Date { return this.data.createdAt; }
  get updatedAt(): Date { return this.data.updatedAt; }
  get isFailed(): boolean { return this.data.status === 'FAILED'; }
  get isTerminal(): boolean { return this.data.status === 'SETTLED' || this.data.status === 'FAILED'; }

  // ── State transitions (named methods only) ────────────────────────────────

  /** Consolidation engine has included this shipment in a planned route. */
  markPlanned(): void {
    this.transitionTo('PLANNED');
  }

  /** The shipment has been assigned to a DeliveryJob. */
  assignToJob(deliveryJobId: string): void {
    if (!deliveryJobId) throw new Error('Shipment.assignToJob requires a deliveryJobId');
    this.transitionTo('ASSIGNED');
    this.data.deliveryJobId = deliveryJobId;
    this.data.updatedAt = new Date();
  }

  /** Courier has picked up / departed with the goods. */
  dispatch(): void {
    this.transitionTo('DISPATCHED');
  }

  /** Goods delivered to the buyer (not yet confirmed by the buyer). */
  markDelivered(): void {
    this.transitionTo('DELIVERED');
  }

  /** Buyer/platform confirmed successful delivery. */
  confirm(): void {
    this.transitionTo('CONFIRMED');
  }

  /** Payment settled — terminal state. Records COMPLETED outcome. */
  settle(): void {
    this.transitionTo('SETTLED');
    this.data.outcomeCode = 'COMPLETED';
    this.data.outcomeResponsibleParty = OUTCOME_RESPONSIBLE_PARTY['COMPLETED'];
    this.data.updatedAt = new Date();
  }

  /**
   * Failure with a mandatory sub-reason — terminal state.
   *
   * `outcome` must be one of the constitutional failure/cancellation codes
   * (MYS-DEL-001 Article 23). `failureSubReason` retains the existing
   * operational sub-reason for backward compatibility.
   */
  markFailed(reason: ShipmentFailureReason, outcome: DeliveryOutcome): void {
    if (!FAILURE_REASONS.includes(reason)) {
      throw new Error(`Shipment.markFailed: unknown failure reason '${reason}'. Allowed: ${FAILURE_REASONS.join(', ')}`);
    }
    if (!isDeliveryOutcome(outcome)) {
      throw new Error(`Shipment.markFailed: unknown outcome '${outcome}'`);
    }
    if (outcome === 'COMPLETED') {
      throw new Error('Shipment.markFailed: outcome must not be COMPLETED on a failure transition');
    }
    this.transitionTo('FAILED');
    this.data.failureReason = reason;
    this.data.outcomeCode = outcome;
    this.data.outcomeResponsibleParty = OUTCOME_RESPONSIBLE_PARTY[outcome];
    this.data.updatedAt = new Date();
  }

  /**
   * Convenience overload: set outcome without changing status.
   * Used when the outcome is determined after the status transition
   * (e.g. investigation resolves INVESTIGATE responsibility).
   * Only valid when the shipment is already terminal.
   */
  resolveOutcome(outcome: DeliveryOutcome): void {
    if (!this.isTerminal) {
      throw new Error('Shipment.resolveOutcome: can only be called on a terminal shipment');
    }
    if (!isDeliveryOutcome(outcome)) {
      throw new Error(`Shipment.resolveOutcome: unknown outcome '${outcome}'`);
    }
    this.data.outcomeCode = outcome;
    this.data.outcomeResponsibleParty = OUTCOME_RESPONSIBLE_PARTY[outcome];
    this.data.updatedAt = new Date();
  }

  /** Re-issues this shipment's own tracking number (collision retry only). */
  reassignTrackingNumber(): void {
    this.data.trackingNumber = makeShipmentTrackingNumber();
    this.data.updatedAt = new Date();
  }

  toData(): ShipmentData {
    return { ...this.data };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private transitionTo(next: ShipmentStatus): void {
    const allowed = VALID_TRANSITIONS[this.data.status];
    if (!allowed.includes(next)) {
      throw new Error(
        `Invalid Shipment transition: ${this.data.status} → ${next}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }
    this.data.status = next;
    this.data.updatedAt = new Date();
  }
}

