jest.mock('../entities/delivery.entity', () => ({
  DeliveryEntity: class DeliveryEntityMock {}
}));

import { DeliveryDomainService } from './delivery.domain-service';
import { GeoPoint } from '../value-objects/geopoint.value-object';

const createDeliveryLike = (overrides?: Record<string, any>) => ({
  status: 'pending',
  package: {
    weight: 10
  },
  pickupAddress: {
    street: 'Pickup St',
    city: 'Dar es Salaam',
    coordinates: { lat: -6.79, lng: 39.2 }
  },
  deliveryAddress: {
    street: 'Drop St',
    city: 'Dar es Salaam',
    coordinates: { lat: -6.8, lng: 39.21 }
  },
  ...overrides
});

describe('DeliveryDomainService', () => {
  const service = new DeliveryDomainService();

  it('calculateEstimatedDeliveryTime applies priority and traffic factors', () => {
    const start = new Date('2026-03-08T10:00:00');
    jest.useFakeTimers().setSystemTime(start);

    const etaStandard = service.calculateEstimatedDeliveryTime(
      GeoPoint.create(-6.79, 39.2, 'A'),
      GeoPoint.create(-7.1, 39.6, 'B'),
      'standard',
      1
    );
    const etaUrgentHeavyTraffic = service.calculateEstimatedDeliveryTime(
      GeoPoint.create(-6.79, 39.2, 'A'),
      GeoPoint.create(-7.1, 39.6, 'B'),
      'urgent',
      2
    );

    expect(etaStandard.getTime()).toBeGreaterThan(start.getTime());
    expect(etaUrgentHeavyTraffic.getTime()).toBeGreaterThan(start.getTime());
    expect(etaUrgentHeavyTraffic.getTime()).toBeLessThanOrEqual(etaStandard.getTime());

    jest.useRealTimers();
  });

  it('validateDeliveryConstraints returns all detected violations', () => {
    const invalid = createDeliveryLike({
      package: { weight: 0 },
      pickupAddress: { street: '', city: '', coordinates: { lat: 100, lng: 200 } },
      deliveryAddress: { street: '', city: '', coordinates: { lat: 100, lng: 200 } }
    });

    const result = service.validateDeliveryConstraints(invalid as any);

    expect(result.isValid).toBe(false);
    expect(result.violations).toEqual(
      expect.arrayContaining([
        'Package weight must be greater than 0',
        'Invalid pickup address',
        'Invalid delivery address',
        'Pickup and delivery addresses cannot be the same'
      ])
    );
  });

  it('validateDeliveryConstraints enforces max weight boundary', () => {
    const overweight = createDeliveryLike({
      package: { weight: 600 }
    });
    const result = service.validateDeliveryConstraints(overweight as any);

    expect(result.violations).toContain('Package weight exceeds maximum limit (500kg)');
  });

  it('calculateDeliveryCost computes components and rounds total', () => {
    const base = service.calculateDeliveryCost(10, 3, 'standard', false);
    expect(base).toEqual(
      expect.objectContaining({
        baseCost: 5,
        distanceCost: 5,
        weightCost: 0,
        priorityCost: 0,
        rushHourSurcharge: 0,
        totalCost: 10
      })
    );

    const urgentRush = service.calculateDeliveryCost(12.4, 15, 'urgent', true);
    expect(urgentRush.weightCost).toBe(1);
    expect(urgentRush.priorityCost).toBeGreaterThan(0);
    expect(urgentRush.rushHourSurcharge).toBeGreaterThan(0);
    expect(urgentRush.totalCost).toBeCloseTo(
      urgentRush.baseCost + urgentRush.distanceCost + urgentRush.weightCost + urgentRush.priorityCost + urgentRush.rushHourSurcharge,
      2
    );
  });

  it('updateDeliveryStatus validates transition rules', () => {
    const pending = createDeliveryLike({ status: 'pending' });
    expect(service.updateDeliveryStatus(pending as any, 'assigned')).toEqual({ success: true });
    expect(service.updateDeliveryStatus(pending as any, 'delivered')).toEqual({
      success: false,
      error: 'Invalid status transition from pending to delivered'
    });

    const delivered = createDeliveryLike({ status: 'delivered' });
    expect(service.updateDeliveryStatus(delivered as any, 'failed').success).toBe(false);
  });
});
