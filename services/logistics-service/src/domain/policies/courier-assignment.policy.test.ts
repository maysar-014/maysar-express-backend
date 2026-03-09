import { CourierEntity } from '../entities/courier.entity';
import { CourierAssignmentPolicy, type CourierAssignmentCriteria } from './courier-assignment.policy';
import { GeoPoint } from '../value-objects/geopoint.value-object';
import { Weight } from '../value-objects/weight.value-object';

const createCourier = (overrides?: Partial<CourierEntity>) =>
  CourierEntity.create({
    id: 'cour-1',
    name: 'Courier One',
    phone: '+255700000001',
    vehicle: {
      type: 'motorcycle',
      capacity: {
        maxWeight: 25,
        maxVolume: 1.5,
        maxItems: 30
      }
    },
    rating: 4.7,
    completionRate: 0.98,
    currentLocation: GeoPoint.create(-6.79, 39.2, 'Dar'),
    isAvailable: true,
    trafficExperience: 0.92,
    ...(overrides as any)
  });

const createCriteria = (overrides?: Partial<CourierAssignmentCriteria>): CourierAssignmentCriteria => ({
  pickupLocation: GeoPoint.create(-6.791, 39.201, 'Pickup'),
  deliveryLocation: GeoPoint.create(-6.801, 39.211, 'Delivery'),
  weight: Weight.create(8),
  priority: 'express',
  specialRequirements: ['fragile'],
  ...overrides
});

describe('CourierAssignmentPolicy', () => {
  it('canAssignCourier enforces availability, quality, capacity, distance, and requirements', () => {
    const policy = new CourierAssignmentPolicy();
    const criteria = createCriteria();

    expect(policy.canAssignCourier(createCourier(), criteria)).toBe(true);
    expect(policy.canAssignCourier(createCourier({ isAvailable: false } as any), criteria)).toBe(false);
    expect(policy.canAssignCourier(createCourier({ rating: 3.9 } as any), criteria)).toBe(false);
    expect(policy.canAssignCourier(createCourier({ completionRate: 0.9 } as any), criteria)).toBe(false);
    expect(
      policy.canAssignCourier(
        createCourier({
          vehicle: { type: 'bike', capacity: { maxWeight: 5, maxVolume: 1.2, maxItems: 10 } }
        } as any),
        criteria
      )
    ).toBe(false);
    expect(
      policy.canAssignCourier(
        createCourier({
          currentLocation: GeoPoint.create(-7.4, 39.2, 'Far')
        } as any),
        criteria
      )
    ).toBe(false);
    expect(policy.canAssignCourier(createCourier(), createCriteria({ specialRequirements: ['cold-chain'] }))).toBe(
      false
    );
  });

  it('calculateCourierScore returns weighted score and detailed breakdown', () => {
    const policy = new CourierAssignmentPolicy();
    const courier = createCourier();
    const criteria = createCriteria();

    const score = policy.calculateCourierScore(courier, criteria);

    expect(score.courier).toBe(courier);
    expect(score.totalScore).toBeGreaterThan(0);
    expect(score.totalScore).toBeLessThanOrEqual(100);
    expect(score.breakdown).toEqual(
      expect.objectContaining({
        distance: expect.any(Number),
        rating: 4.7 / 5,
        completionRate: 0.98,
        vehicleMatch: expect.any(Number),
        weatherSuitability: 0.9,
        trafficExperience: 0.92
      })
    );
  });

  it('selectOptimalCourier picks highest scored eligible courier or null', () => {
    const policy = new CourierAssignmentPolicy();
    const criteria = createCriteria();

    const lowScore = createCourier({
      id: 'cour-low',
      rating: 4.1,
      completionRate: 0.95,
      trafficExperience: 0.8
    } as any);
    const highScore = createCourier({
      id: 'cour-high',
      rating: 4.9,
      completionRate: 0.99,
      trafficExperience: 0.95
    } as any);
    const ineligible = createCourier({
      id: 'cour-no',
      isAvailable: false
    } as any);

    const selected = policy.selectOptimalCourier([lowScore, highScore, ineligible], criteria);
    expect(selected?.id).toBe('cour-high');

    const none = policy.selectOptimalCourier([ineligible], criteria);
    expect(none).toBeNull();
  });

  it('returns static assignment constraints', () => {
    const policy = new CourierAssignmentPolicy();
    expect(policy.getAssignmentConstraints(createCriteria())).toEqual({
      maxDistance: 50,
      minRating: 4,
      minCompletionRate: 0.95
    });
  });
});
