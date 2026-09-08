/**
 * DeliveryJob Entity (Phase 2 §2.2)
 *
 * One physical courier operation. May contain multiple Shipments
 * (consolidated). This is the entity that gets assigned to a driver.
 *
 * State machine — enforced via named transition methods only; there is no
 * public API to write `status` directly.
 *
 *   PENDING → ASSIGNED → DRIVER_ACCEPTED → AT_PICKUP → LOADING → IN_TRANSIT
 *     → AT_DESTINATION → DELIVERED → CONFIRMED → SETTLED
 *
 * Failures (terminal, with failureReason):
 *   DRIVER_ACCEPTED / AT_PICKUP / LOADING → FAILED_PICKUP   (supplier not ready)
 *   IN_TRANSIT / AT_DESTINATION           → CUSTOMER_UNAVAILABLE
 */

import { makeId } from '../../../../../shared/ids/id';

export type DeliveryJobStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'DRIVER_ACCEPTED'
  | 'AT_PICKUP'
  | 'LOADING'
  | 'IN_TRANSIT'
  | 'AT_DESTINATION'
  | 'DELIVERED'
  | 'CONFIRMED'
  | 'SETTLED'
  | 'FAILED_PICKUP'
  | 'CUSTOMER_UNAVAILABLE';

export type DeliveryJobFailureReason = 'FAILED_PICKUP' | 'CUSTOMER_UNAVAILABLE';

export interface DeliveryJobData {
  id: string;
  shipmentIds: string[];
  driverId: string | null;
  vehicleId: string | null;
  routeId: string | null;
  status: DeliveryJobStatus;
  failureReason: DeliveryJobFailureReason | null;
  scheduledPickupAt: Date | null;
  estimatedDeliveryAt: Date | null;
  actualPickupAt: Date | null;
  actualDeliveryAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const VALID_TRANSITIONS: Record<DeliveryJobStatus, DeliveryJobStatus[]> = {
  PENDING:             ['ASSIGNED'],
  ASSIGNED:            ['DRIVER_ACCEPTED'],
  DRIVER_ACCEPTED:     ['AT_PICKUP', 'FAILED_PICKUP'],
  AT_PICKUP:           ['LOADING', 'FAILED_PICKUP'],
  LOADING:             ['IN_TRANSIT', 'FAILED_PICKUP'],
  IN_TRANSIT:          ['AT_DESTINATION', 'CUSTOMER_UNAVAILABLE'],
  AT_DESTINATION:      ['DELIVERED', 'CUSTOMER_UNAVAILABLE'],
  DELIVERED:           ['CONFIRMED'],
  CONFIRMED:           ['SETTLED'],
  SETTLED:             [],
  FAILED_PICKUP:       [],
  CUSTOMER_UNAVAILABLE: [],
};

const FAILURE_REASONS: DeliveryJobFailureReason[] = ['FAILED_PICKUP', 'CUSTOMER_UNAVAILABLE'];

export function makeDeliveryJobId(): string {
  return makeId('DJB');
}

export class DeliveryJob {
  private data: DeliveryJobData;

  constructor(data: DeliveryJobData) {
    if (!data.shipmentIds || data.shipmentIds.length === 0) {
      throw new Error('DeliveryJob invariant violation: at least one shipmentId is required');
    }
    if (new Set(data.shipmentIds).size !== data.shipmentIds.length) {
      throw new Error('DeliveryJob invariant violation: shipmentIds must be unique');
    }
    if (data.status === 'ASSIGNED' && !data.driverId) {
      throw new Error('DeliveryJob invariant violation: ASSIGNED requires a driverId');
    }
    if (data.status === 'FAILED_PICKUP' && data.failureReason !== 'FAILED_PICKUP') {
      throw new Error('DeliveryJob invariant violation: FAILED_PICKUP status requires failureReason FAILED_PICKUP');
    }
    if (data.status === 'CUSTOMER_UNAVAILABLE' && data.failureReason !== 'CUSTOMER_UNAVAILABLE') {
      throw new Error('DeliveryJob invariant violation: CUSTOMER_UNAVAILABLE status requires matching failureReason');
    }
    this.data = { ...data };
  }

  static create(params: {
    shipmentIds: string[];
    scheduledPickupAt?: Date | null;
    estimatedDeliveryAt?: Date | null;
    routeId?: string | null;
  }): DeliveryJob {
    return new DeliveryJob({
      id: makeDeliveryJobId(),
      shipmentIds: params.shipmentIds,
      driverId: null,
      vehicleId: null,
      routeId: params.routeId ?? null,
      status: 'PENDING',
      failureReason: null,
      scheduledPickupAt: params.scheduledPickupAt ?? null,
      estimatedDeliveryAt: params.estimatedDeliveryAt ?? null,
      actualPickupAt: null,
      actualDeliveryAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // ── Getters ───────────────────────────────────────────────────────────────
  get id(): string { return this.data.id; }
  get shipmentIds(): string[] { return [...this.data.shipmentIds]; }
  get driverId(): string | null { return this.data.driverId; }
  get vehicleId(): string | null { return this.data.vehicleId; }
  get routeId(): string | null { return this.data.routeId; }
  get status(): DeliveryJobStatus { return this.data.status; }
  get failureReason(): DeliveryJobFailureReason | null { return this.data.failureReason; }
  get scheduledPickupAt(): Date | null { return this.data.scheduledPickupAt; }
  get estimatedDeliveryAt(): Date | null { return this.data.estimatedDeliveryAt; }
  get actualPickupAt(): Date | null { return this.data.actualPickupAt; }
  get actualDeliveryAt(): Date | null { return this.data.actualDeliveryAt; }
  get createdAt(): Date { return this.data.createdAt; }
  get updatedAt(): Date { return this.data.updatedAt; }
  get isFailed(): boolean { return this.data.status === 'FAILED_PICKUP' || this.data.status === 'CUSTOMER_UNAVAILABLE'; }
  get isTerminal(): boolean {
    return this.data.status === 'SETTLED' || this.isFailed;
  }

  // ── State transitions (named methods only) ────────────────────────────────

  /** Assign a driver (and optionally vehicle) to this job. */
  assignDriver(driverId: string, vehicleId?: string | null): void {
    if (!driverId) throw new Error('DeliveryJob.assignDriver requires a driverId');
    this.transitionTo('ASSIGNED');
    this.data.driverId = driverId;
    if (vehicleId !== undefined) this.data.vehicleId = vehicleId;
    this.data.updatedAt = new Date();
  }

  driverAccepts(): void {
    this.transitionTo('DRIVER_ACCEPTED');
  }

  confirmPickup(): void {
    this.transitionTo('AT_PICKUP');
  }

  confirmLoading(): void {
    this.transitionTo('LOADING');
  }

  depart(): void {
    this.transitionTo('IN_TRANSIT');
  }

  arriveAtDestination(): void {
    this.transitionTo('AT_DESTINATION');
  }

  confirmDelivery(): void {
    this.transitionTo('DELIVERED');
    this.data.actualDeliveryAt = new Date();
  }

  /** Buyer/platform confirmed successful delivery (DELIVERED → CONFIRMED). */
  markConfirmed(): void {
    this.transitionTo('CONFIRMED');
  }

  settle(): void {
    this.transitionTo('SETTLED');
  }

  /** Terminal failure with a mandatory reason. */
  markFailed(reason: DeliveryJobFailureReason): void {
    if (!FAILURE_REASONS.includes(reason)) {
      throw new Error(`DeliveryJob.markFailed: unknown failure reason '${reason}'. Allowed: ${FAILURE_REASONS.join(', ')}`);
    }
    this.transitionTo(reason);
    this.data.failureReason = reason;
    this.data.updatedAt = new Date();
  }

  toData(): DeliveryJobData {
    return { ...this.data };
  }

  /**
   * Route insertion (Phase 5 §5.2): append an inserted shipment to this job.
   * Named method only — no direct shipmentIds writes. Valid while the job is
   * being worked (ASSIGNED … IN_TRANSIT); terminal/complete jobs cannot grow.
   */
  extendWithShipment(shipmentId: string): void {
    if (!shipmentId) throw new Error('DeliveryJob.extendWithShipment requires a shipmentId');
    const growable: DeliveryJobStatus[] = ['ASSIGNED', 'DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING', 'IN_TRANSIT'];
    if (!growable.includes(this.data.status)) {
      throw new Error(`DeliveryJob.extendWithShipment: job in status ${this.data.status} cannot accept new shipments`);
    }
    if (this.data.shipmentIds.includes(shipmentId)) {
      throw new Error(`DeliveryJob.extendWithShipment: shipment ${shipmentId} already on job ${this.data.id}`);
    }
    this.data.shipmentIds = [...this.data.shipmentIds, shipmentId];
    this.data.updatedAt = new Date();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private transitionTo(next: DeliveryJobStatus): void {
    const allowed = VALID_TRANSITIONS[this.data.status];
    if (!allowed.includes(next)) {
      throw new Error(
        `Invalid DeliveryJob transition: ${this.data.status} → ${next}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }
    this.data.status = next;
    this.data.updatedAt = new Date();
  }
}

