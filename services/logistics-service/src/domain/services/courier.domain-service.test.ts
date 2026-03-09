jest.mock('../entities/delivery.entity', () => ({
  DeliveryEntity: class DeliveryEntityMock {}
}));

import { CourierDomainService } from './courier.domain-service';
import { CourierEntity } from '../entities/courier.entity';
import { GeoPoint } from '../value-objects/geopoint.value-object';

const createCourier = (overrides?: Partial<CourierEntity>) =>
  CourierEntity.create({
    id: 'cour-1',
    name: 'Courier One',
    phone: '+255700000001',
    vehicle: {
      type: 'motorcycle',
      capacity: { maxWeight: 25, maxVolume: 0.7, maxItems: 30 }
    },
    rating: 4.5,
    completionRate: 0.97,
    currentLocation: GeoPoint.create(-6.79, 39.2, 'dar'),
    isAvailable: true,
    trafficExperience: 0.9,
    ...(overrides as any)
  });

const createDelivery = (overrides?: Record<string, unknown>) => {
  const createdAt = new Date('2026-03-08T09:00:00.000Z');
  const entity: any = {
    id: 'del-1',
    orderId: 'ord-1',
    pickupAddress: {
      street: 'Pickup Street',
      city: 'Dar es Salaam',
      region: 'DSM',
      coordinates: { lat: -6.79, lng: 39.2 },
      contactName: 'Sender',
      contactPhone: '+255700111111'
    },
    deliveryAddress: {
      street: 'Delivery Street',
      city: 'Dar es Salaam',
      region: 'DSM',
      coordinates: { lat: -6.8, lng: 39.21 },
      contactName: 'Recipient',
      contactPhone: '+255700222222'
    },
    package: {
      weight: 8,
      dimensions: { length: 30, width: 20, height: 15 },
      value: 100000,
      fragile: false,
      perishable: false,
      items: []
    },
    status: 'assigned',
    courierId: 'cour-1',
    trackingNumber: 'TRK-100',
    estimatedDeliveryTime: new Date('2026-03-08T10:00:00.000Z'),
    actualDeliveryTime: undefined,
    timestamps: { created: createdAt, assigned: createdAt },
    notes: undefined,
    createdAt,
    updatedAt: createdAt
  };

  if (overrides) {
    Object.assign(entity, overrides);
  }

  return entity;
};

describe('CourierDomainService', () => {
  it('calculateEstimatedArrivalTime uses fallback model when no arrival service is provided', async () => {
    const service = new CourierDomainService();
    const courier = createCourier();
    const destination = GeoPoint.create(-6.80, 39.22, 'destination');

    const result = await service.calculateEstimatedArrivalTime(
      courier,
      destination,
      new Date('2026-03-08T08:00:00.000Z')
    );

    expect(result.estimatedMinutes).toBeGreaterThan(0);
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.confidence).toBe(50);
    expect(result.factors).toEqual(
      expect.objectContaining({
        trafficMultiplier: 1,
        weatherMultiplier: 1,
        timeOfDayMultiplier: 1
      })
    );
  });

  it('calculateEstimatedArrivalTime delegates to arrival-time service when available', async () => {
    const mockedResult = {
      estimatedMinutes: 18,
      distanceKm: 7.4,
      factors: {
        distance: 7.4,
        trafficMultiplier: 1.1,
        weatherMultiplier: 1,
        timeOfDayMultiplier: 1
      },
      confidence: 92
    };
    const arrivalTimeService = {
      calculateEstimatedArrivalTime: jest.fn().mockResolvedValue(mockedResult)
    };
    const service = new CourierDomainService(arrivalTimeService as any);
    const courier = createCourier();
    const destination = GeoPoint.create(-6.82, 39.25, 'destination');
    const now = new Date('2026-03-08T08:30:00.000Z');

    const result = await service.calculateEstimatedArrivalTime(courier, destination, now);

    expect(arrivalTimeService.calculateEstimatedArrivalTime).toHaveBeenCalledWith(
      courier.currentLocation,
      destination,
      courier.vehicle.type,
      now
    );
    expect(result).toEqual(mockedResult);
  });

  it('calculateAvailability returns availability and estimated free time at full capacity', () => {
    const service = new CourierDomainService();
    const courier = createCourier();

    const deliveries = [
      createDelivery({
        id: 'del-a',
        orderId: 'ord-a',
        estimatedDeliveryTime: new Date('2026-03-08T10:30:00.000Z')
      }),
      createDelivery({
        id: 'del-b',
        orderId: 'ord-b',
        estimatedDeliveryTime: new Date('2026-03-08T10:45:00.000Z')
      }),
      createDelivery({
        id: 'del-c',
        orderId: 'ord-c',
        estimatedDeliveryTime: new Date('2026-03-08T10:20:00.000Z')
      }),
      createDelivery({
        id: 'del-d',
        orderId: 'ord-d',
        estimatedDeliveryTime: new Date('2026-03-08T10:35:00.000Z')
      }),
      createDelivery({
        id: 'del-e',
        orderId: 'ord-e',
        estimatedDeliveryTime: new Date('2026-03-08T10:50:00.000Z')
      })
    ];

    const availability = service.calculateAvailability(courier, deliveries);
    expect(availability).toEqual(
      expect.objectContaining({
        isAvailable: false,
        capacity: 5,
        currentLoad: 5,
        estimatedFreeTime: new Date('2026-03-08T10:50:00.000Z')
      })
    );

    const available = service.calculateAvailability(courier, deliveries.slice(0, 2));
    expect(available).toEqual(
      expect.objectContaining({
        isAvailable: true,
        capacity: 5,
        currentLoad: 2,
        estimatedFreeTime: undefined
      })
    );
  });

  it('calculateDistanceToPickup returns geodesic distance', () => {
    const service = new CourierDomainService();
    const distance = service.calculateDistanceToPickup(
      GeoPoint.create(-6.79, 39.2, 'a'),
      GeoPoint.create(-6.80, 39.22, 'b')
    );

    expect(distance).toBeGreaterThan(0);
  });

  it('canHandleDelivery enforces weight and service-area constraints', () => {
    const service = new CourierDomainService();
    const courier = createCourier();
    const eligible = createDelivery();
    const accepted = service.canHandleDelivery(courier, eligible);

    expect(accepted).toEqual({ canHandle: true, reasons: [] });

    const overweightOutside = createDelivery({
      id: 'del-2',
      orderId: 'ord-2',
      pickupAddress: { ...eligible.pickupAddress, city: 'Arusha' },
      deliveryAddress: { ...eligible.deliveryAddress, city: 'Mwanza' },
      package: { ...eligible.package, weight: 50 },
      status: 'pending'
    });
    const denied = service.canHandleDelivery(courier, overweightOutside);

    expect(denied.canHandle).toBe(false);
    expect(denied.reasons).toContain(
      'Package weight (50kg) exceeds vehicle capacity (25kg)'
    );
    expect(denied.reasons).toContain('Pickup location is outside courier service area');
    expect(denied.reasons).toContain('Delivery location is outside courier service area');
  });

  it('calculateEfficiencyScore returns zero metrics when no deliveries exist', () => {
    const service = new CourierDomainService();
    const courier = createCourier();

    const result = service.calculateEfficiencyScore(courier, []);
    expect(result).toEqual({
      score: 0,
      metrics: {
        onTimeRate: 0,
        averageDeliveryTime: 0,
        customerRating: 0,
        completionRate: 0
      }
    });
  });

  it('calculateEfficiencyScore computes weighted score and delivery metrics', () => {
    const service = new CourierDomainService();
    const courier = createCourier({ rating: 4.5 } as any);

    const deliveredOnTime = createDelivery({
      status: 'delivered',
      estimatedDeliveryTime: new Date('2026-03-08T10:35:00.000Z'),
      actualDeliveryTime: new Date('2026-03-08T10:30:00.000Z'),
      createdAt: new Date('2026-03-08T10:00:00.000Z')
    } as any);

    const deliveredLate = createDelivery({
      id: 'del-3',
      status: 'delivered',
      estimatedDeliveryTime: new Date('2026-03-08T12:00:00.000Z'),
      actualDeliveryTime: new Date('2026-03-08T12:30:00.000Z'),
      createdAt: new Date('2026-03-08T11:00:00.000Z')
    } as any);

    const inProgress = createDelivery({
      id: 'del-4',
      status: 'in_transit'
    } as any);

    const result = service.calculateEfficiencyScore(courier, [
      deliveredOnTime,
      deliveredLate,
      inProgress
    ]);

    expect(result.score).toBe(74);
    expect(result.metrics.onTimeRate).toBe(50);
    expect(result.metrics.completionRate).toBeCloseTo(66.666, 2);
    expect(result.metrics.averageDeliveryTime).toBe(60);
    expect(result.metrics.customerRating).toBe(4.5);
  });
});
