/**
 * DeliveryJob entity unit tests (Phase 2 §2.2)
 */

import { DeliveryJob, DeliveryJobFailureReason, makeDeliveryJobId } from '../delivery-job.entity';

function makeJob(): DeliveryJob {
  return DeliveryJob.create({ shipmentIds: ['SHP_1', 'SHP_2'] });
}

describe('DeliveryJob entity', () => {
  describe('creation', () => {
    it('starts in PENDING with no driver and no timestamps', () => {
      const job = makeJob();
      expect(job.status).toBe('PENDING');
      expect(job.driverId).toBeNull();
      expect(job.vehicleId).toBeNull();
      expect(job.actualPickupAt).toBeNull();
      expect(job.actualDeliveryAt).toBeNull();
      expect(job.failureReason).toBeNull();
      expect(job.isFailed).toBe(false);
      expect(job.isTerminal).toBe(false);
      expect(job.id).toMatch(/^DJB_/);
    });

    it('mints unique DJB- prefixed ids', () => {
      expect(makeDeliveryJobId()).not.toBe(makeDeliveryJobId());
    });

    it('rejects an empty shipment list', () => {
      expect(() => DeliveryJob.create({ shipmentIds: [] })).toThrow(/at least one shipmentId/);
    });

    it('rejects duplicate shipment ids', () => {
      expect(() => DeliveryJob.create({ shipmentIds: ['SHP_1', 'SHP_1'] })).toThrow(/must be unique/);
    });

    it('returns a defensive copy of shipmentIds', () => {
      const job = makeJob();
      job.shipmentIds.push('SHP_HACK');
      expect(job.shipmentIds).toEqual(['SHP_1', 'SHP_2']);
    });
  });

  describe('happy-path state machine', () => {
    it('walks the full lifecycle PENDING → … → SETTLED via named transitions', () => {
      const job = makeJob();
      job.assignDriver('drv_1', 'veh_1');
      expect(job.status).toBe('ASSIGNED');
      expect(job.driverId).toBe('drv_1');
      expect(job.vehicleId).toBe('veh_1');
      job.driverAccepts();
      expect(job.status).toBe('DRIVER_ACCEPTED');
      job.confirmPickup();
      expect(job.status).toBe('AT_PICKUP');
      job.confirmLoading();
      expect(job.status).toBe('LOADING');
      job.depart();
      expect(job.status).toBe('IN_TRANSIT');
      job.arriveAtDestination();
      expect(job.status).toBe('AT_DESTINATION');
      job.confirmDelivery();
      expect(job.status).toBe('DELIVERED');
      expect(job.actualDeliveryAt).toBeInstanceOf(Date);
      job.markConfirmed();
      expect(job.status).toBe('CONFIRMED');
      job.settle();
      expect(job.status).toBe('SETTLED');
      expect(job.isTerminal).toBe(true);
    });

    it('rejects out-of-order transitions', () => {
      const job = makeJob();
      expect(() => job.depart()).toThrow(/Invalid DeliveryJob transition: PENDING → IN_TRANSIT/);
      expect(() => job.confirmDelivery()).toThrow(/Invalid DeliveryJob transition: PENDING → DELIVERED/);
      expect(() => job.driverAccepts()).toThrow(/Invalid DeliveryJob transition: PENDING → DRIVER_ACCEPTED/);
    });

    it('rejects assigning a second driver after delivery', () => {
      const job = makeJob();
      job.assignDriver('drv_1');
      job.driverAccepts();
      job.confirmPickup();
      job.confirmLoading();
      job.depart();
      job.arriveAtDestination();
      job.confirmDelivery();
      expect(() => job.assignDriver('drv_2')).toThrow(/Invalid DeliveryJob transition: DELIVERED → ASSIGNED/);
    });

    it('rejects empty driverId on assignDriver', () => {
      expect(() => makeJob().assignDriver('')).toThrow(/requires a driverId/);
    });

    it('is a terminal-state dead end after SETTLED', () => {
      const job = makeJob();
      job.assignDriver('drv_1');
      job.driverAccepts();
      job.confirmPickup();
      job.confirmLoading();
      job.depart();
      job.arriveAtDestination();
      job.confirmDelivery();
      job.markConfirmed();
      job.settle();
      expect(() => job.settle()).toThrow(/Invalid DeliveryJob transition: SETTLED → SETTLED/);
    });
  });

  describe('failure paths', () => {
    it.each(['DRIVER_ACCEPTED', 'AT_PICKUP', 'LOADING'] as const)(
      'allows FAILED_PICKUP from %s',
      (state) => {
        const job = makeJob();
        job.assignDriver('drv_1');
        job.driverAccepts();
        if (state === 'AT_PICKUP' || state === 'LOADING') job.confirmPickup();
        if (state === 'LOADING') job.confirmLoading();
        job.markFailed('FAILED_PICKUP');
        expect(job.status).toBe('FAILED_PICKUP');
        expect(job.failureReason).toBe('FAILED_PICKUP');
        expect(job.isFailed).toBe(true);
        expect(job.isTerminal).toBe(true);
      },
    );

    it.each(['IN_TRANSIT', 'AT_DESTINATION'] as const)(
      'allows CUSTOMER_UNAVAILABLE from %s',
      (state) => {
        const job = makeJob();
        job.assignDriver('drv_1');
        job.driverAccepts();
        job.confirmPickup();
        job.confirmLoading();
        job.depart();
        if (state === 'AT_DESTINATION') job.arriveAtDestination();
        job.markFailed('CUSTOMER_UNAVAILABLE');
        expect(job.status).toBe('CUSTOMER_UNAVAILABLE');
        expect(job.failureReason).toBe('CUSTOMER_UNAVAILABLE');
        expect(job.isTerminal).toBe(true);
      },
    );

    it('does not allow FAILED_PICKUP after departure', () => {
      const job = makeJob();
      job.assignDriver('drv_1');
      job.driverAccepts();
      job.confirmPickup();
      job.confirmLoading();
      job.depart();
      expect(() => job.markFailed('FAILED_PICKUP')).toThrow(/Invalid DeliveryJob transition: IN_TRANSIT → FAILED_PICKUP/);
    });

    it('does not allow CUSTOMER_UNAVAILABLE before departure', () => {
      const job = makeJob();
      job.assignDriver('drv_1');
      job.driverAccepts();
      expect(() => job.markFailed('CUSTOMER_UNAVAILABLE')).toThrow(/Invalid DeliveryJob transition: DRIVER_ACCEPTED → CUSTOMER_UNAVAILABLE/);
    });

    it('rejects unknown failure reasons', () => {
      const job = makeJob();
      job.assignDriver('drv_1');
      job.driverAccepts();
      expect(() => job.markFailed('DISPUTED' as DeliveryJobFailureReason)).toThrow(/unknown failure reason/);
    });

    it('is a terminal-state dead end after FAILED_PICKUP', () => {
      const job = makeJob();
      job.assignDriver('drv_1');
      job.driverAccepts();
      job.markFailed('FAILED_PICKUP');
      expect(() => job.confirmPickup()).toThrow(/Invalid DeliveryJob transition: FAILED_PICKUP → AT_PICKUP/);
    });
  });

  describe('persistence round-trip', () => {
    it('toData output can rebuild an equivalent entity', () => {
      const job = DeliveryJob.create({
        shipmentIds: ['SHP_A', 'SHP_B'],
        scheduledPickupAt: new Date('2026-09-06T08:00:00Z'),
        estimatedDeliveryAt: new Date('2026-09-06T12:00:00Z'),
        routeId: 'route_1',
      });
      job.assignDriver('drv_9', 'veh_9');
      const rebuilt = new DeliveryJob(job.toData());
      expect(rebuilt.toData()).toEqual(job.toData());
      expect(rebuilt.scheduledPickupAt).toEqual(new Date('2026-09-06T08:00:00Z'));
    });

    it('rejects ASSIGNED status without a driverId (DB consistency guard)', () => {
      const job = makeJob();
      const data = job.toData();
      expect(() => new DeliveryJob({ ...data, status: 'ASSIGNED' })).toThrow(/ASSIGNED requires a driverId/);
    });

    it('rejects FAILED_PICKUP status with a mismatched failureReason', () => {
      const job = makeJob();
      const data = job.toData();
      expect(() => new DeliveryJob({ ...data, status: 'FAILED_PICKUP', failureReason: 'CUSTOMER_UNAVAILABLE' }))
        .toThrow(/requires failureReason FAILED_PICKUP/);
    });
  });
});
