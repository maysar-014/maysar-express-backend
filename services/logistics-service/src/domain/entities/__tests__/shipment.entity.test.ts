/**
 * Shipment entity unit tests (Phase 2 §2.1)
 *
 * Covers: state-machine enforcement (named transitions only, valid/invalid
 * paths), failure sub-reason rules, and constructor invariants.
 */

import { Shipment, ShipmentFailureReason, makeShipmentId } from '../shipment.entity';
import { GeoPoint } from '../../value-objects/geopoint.value-object';

function makeShipment(overrides: Record<string, any> = {}): Shipment {
  return Shipment.create({
    orderId: 'mos_test_001',
    sellerId: 'seller-1',
    origin: GeoPoint.create(-6.77, 39.27, 'Mikocheni, Dar es Salaam'),
    destination: GeoPoint.create(-6.7924, 39.2083, 'City centre, Dar es Salaam'),
    packageWeightKg: 2.5,
    ...overrides,
  });
}

describe('Shipment entity', () => {
  describe('creation', () => {
    it('starts in CREATED with null deliveryJobId and no failure reason', () => {
      const s = makeShipment();
      expect(s.status).toBe('CREATED');
      expect(s.deliveryJobId).toBeNull();
      expect(s.failureReason).toBeNull();
      expect(s.isFailed).toBe(false);
      expect(s.isTerminal).toBe(false);
      expect(s.id).toMatch(/^SHP_/);
    });

    it('mints unique SHP- prefixed ids', () => {
      expect(makeShipmentId()).not.toBe(makeShipmentId());
    });

    it('defaults handling requirements to all-false', () => {
      expect(makeShipment().handlingRequirements).toEqual({
        fragile: false,
        temperatureControlled: false,
        hazmat: false,
      });
    });

    it('rejects non-positive package weight', () => {
      expect(() => makeShipment({ packageWeightKg: 0 })).toThrow(/packageWeightKg must be > 0/);
      expect(() => makeShipment({ packageWeightKg: -1 })).toThrow(/packageWeightKg must be > 0/);
    });

    it('rejects unknown vehicle classes', () => {
      expect(() => makeShipment({ requiredVehicleClass: 'SPACESHIP' })).toThrow(/unknown requiredVehicleClass/);
    });

    it('accepts a valid vehicle class', () => {
      expect(makeShipment({ requiredVehicleClass: 'PICKUP' }).requiredVehicleClass).toBe('PICKUP');
    });
  });

  describe('happy-path state machine', () => {
    it('walks the full lifecycle CREATED → … → SETTLED via named transitions', () => {
      const s = makeShipment();
      s.markPlanned();
      expect(s.status).toBe('PLANNED');
      s.assignToJob('DJB_test_001');
      expect(s.status).toBe('ASSIGNED');
      expect(s.deliveryJobId).toBe('DJB_test_001');
      s.dispatch();
      expect(s.status).toBe('DISPATCHED');
      s.markDelivered();
      expect(s.status).toBe('DELIVERED');
      s.confirm();
      expect(s.status).toBe('CONFIRMED');
      s.settle();
      expect(s.status).toBe('SETTLED');
      expect(s.isTerminal).toBe(true);
    });

    it('rejects out-of-order transitions', () => {
      const s = makeShipment();
      expect(() => s.dispatch()).toThrow(/Invalid Shipment transition: CREATED → DISPATCHED/);
      expect(() => s.settle()).toThrow(/Invalid Shipment transition: CREATED → SETTLED/);
      expect(() => s.markDelivered()).toThrow(/Invalid Shipment transition: CREATED → DELIVERED/);
    });

    it('rejects backward transitions', () => {
      const s = makeShipment();
      s.markPlanned();
      expect(() => s.markPlanned()).toThrow(/Invalid Shipment transition: PLANNED → PLANNED/);
    });

    it('is a terminal-state dead end after SETTLED', () => {
      const s = makeShipment();
      s.markPlanned();
      s.assignToJob('DJB_1');
      s.dispatch();
      s.markDelivered();
      s.confirm();
      s.settle();
      expect(() => s.confirm()).toThrow(/Invalid Shipment transition: SETTLED → CONFIRMED/);
    });

    it('rejects empty deliveryJobId on assignToJob', () => {
      const s = makeShipment();
      s.markPlanned();
      expect(() => s.assignToJob('')).toThrow(/requires a deliveryJobId/);
    });
  });

  describe('failure paths', () => {
    it.each(['PLANNED', 'ASSIGNED', 'DISPATCHED', 'DELIVERED'] as const)(
      'allows FAILED from %s with a mandatory sub-reason',
      (state) => {
        const s = makeShipment();
        s.markPlanned();
        if (state !== 'PLANNED') s.assignToJob('DJB_1');
        if (state === 'DISPATCHED' || state === 'DELIVERED') s.dispatch();
        if (state === 'DELIVERED') s.markDelivered();
        s.markFailed('FAILED_PICKUP');
        expect(s.status).toBe('FAILED');
        expect(s.failureReason).toBe('FAILED_PICKUP');
        expect(s.isFailed).toBe(true);
        expect(s.isTerminal).toBe(true);
      },
    );

    it('does not allow FAILED from CREATED (nothing has been planned yet)', () => {
      const s = makeShipment();
      expect(() => s.markFailed('SUPPLIER_DELAY')).toThrow(/Invalid Shipment transition: CREATED → FAILED/);
    });

    it('rejects unknown failure reasons', () => {
      const s = makeShipment();
      s.markPlanned();
      expect(() => s.markFailed('SOMETHING_ELSE' as ShipmentFailureReason)).toThrow(/unknown failure reason/);
    });

    it('accepts every documented sub-reason', () => {
      const reasons: ShipmentFailureReason[] = [
        'FAILED_PICKUP',
        'CUSTOMER_UNAVAILABLE',
        'SUPPLIER_DELAY',
        'DRIVER_FAILURE',
        'DAMAGED',
        'DISPUTED',
      ];
      for (const reason of reasons) {
        const s = makeShipment();
        s.markPlanned();
        s.markFailed(reason);
        expect(s.failureReason).toBe(reason);
      }
    });

    it('is a terminal-state dead end after FAILED', () => {
      const s = makeShipment();
      s.markPlanned();
      s.markFailed('DAMAGED');
      expect(() => s.markPlanned()).toThrow(/Invalid Shipment transition: FAILED → PLANNED/);
      expect(() => s.markFailed('DISPUTED')).toThrow(/Invalid Shipment transition: FAILED → FAILED/);
    });
  });

  describe('persistence round-trip', () => {
    it('toData output can rebuild an equivalent entity', () => {
      const s = makeShipment({
        packageDimensions: { lengthCm: 30, widthCm: 20, heightCm: 10 },
        requiredVehicleClass: 'MOTORCYCLE',
        requestedDeliveryWindow: { earliestAt: new Date('2026-09-05T08:00:00Z'), latestAt: new Date('2026-09-05T12:00:00Z') },
      });
      s.markPlanned();
      s.assignToJob('DJB_rt_001');
      const rebuilt = new Shipment(s.toData());
      expect(rebuilt.toData()).toEqual(s.toData());
      expect(rebuilt.packageDimensions).toEqual({ lengthCm: 30, widthCm: 20, heightCm: 10 });
      expect(rebuilt.requestedDeliveryWindow?.latestAt).toEqual(new Date('2026-09-05T12:00:00Z'));
    });

    it('rejects a FAILED row without a failure reason (DB consistency guard)', () => {
      const s = makeShipment();
      s.markPlanned();
      const data = s.toData();
      expect(() => new Shipment({ ...data, status: 'FAILED', failureReason: null })).toThrow(/requires a failureReason/);
    });

    it('rejects a failureReason on a non-FAILED row', () => {
      const s = makeShipment();
      const data = s.toData();
      expect(() => new Shipment({ ...data, failureReason: 'DAMAGED' })).toThrow(/failureReason can only be set/);
    });
  });
});
