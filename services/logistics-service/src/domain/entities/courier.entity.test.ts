import { GeoPoint } from '../value-objects/geopoint.value-object';
import { CourierEntity } from './courier.entity';

describe('CourierEntity', () => {
  const point = GeoPoint.create(-6.8, 39.2, 'Dar');

  it('creates courier and evaluates assignment eligibility', () => {
    const courier = CourierEntity.create({
      id: 'cour-1',
      name: 'Courier One',
      phone: '+255700000000',
      vehicle: {
        type: 'bike',
        capacity: { maxWeight: 20, maxVolume: 2, maxItems: 30 }
      },
      rating: 4.5,
      completionRate: 0.98,
      currentLocation: point,
      isAvailable: true,
      trafficExperience: 3
    });

    expect(courier.isEligibleForAssignment()).toBe(true);
    expect(courier.canHandleWeight(10)).toBe(true);
    expect(courier.canHandleVolume(1.5)).toBe(true);
    expect(courier.toString()).toContain('Courier One');
  });

  it('returns false for assignment when thresholds are not met', () => {
    const courier = CourierEntity.create({
      id: 'cour-2',
      name: 'Courier Two',
      phone: '+255700000001',
      vehicle: {
        type: 'car',
        capacity: { maxWeight: 100, maxVolume: 8, maxItems: 200 }
      },
      rating: 3.9,
      completionRate: 0.9,
      currentLocation: point,
      isAvailable: true,
      trafficExperience: 6
    });

    expect(courier.isEligibleForAssignment()).toBe(false);
    expect(courier.canHandleWeight(101)).toBe(false);
    expect(courier.getDistanceFrom(point)).toBeCloseTo(0, 6);
  });
});
