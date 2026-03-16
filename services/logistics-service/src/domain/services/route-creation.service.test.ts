import { RouteCreationService, type DeliveryForRoute } from './route-creation.service';
import { GeoPoint } from '../value-objects/geopoint.value-object';
import { Weight } from '../value-objects/weight.value-object';
import { CourierEntity } from '../entities/courier.entity';
import { RouteStatus } from '../enums/route-status.enum';

const createCourier = (): CourierEntity =>
  CourierEntity.create({
    id: 'courier-1',
    name: 'Courier One',
    phone: '255700000001',
    vehicle: {
      type: 'bike',
      capacity: {
        maxWeight: 20,
        maxVolume: 100,
        maxItems: 10
      }
    },
    rating: 4.8,
    completionRate: 0.98,
    currentLocation: GeoPoint.create(-6.790, 39.200, 'Courier Start'),
    isAvailable: true,
    trafficExperience: 0.9
  });

const createDelivery = (
  id: string,
  pickup: [number, number, string],
  dropoff: [number, number, string],
  weightKg = 2,
  priority: 'standard' | 'express' | 'urgent' = 'standard'
): DeliveryForRoute => ({
  id,
  pickupLocation: GeoPoint.create(pickup[0], pickup[1], pickup[2]),
  deliveryLocation: GeoPoint.create(dropoff[0], dropoff[1], dropoff[2]),
  weight: Weight.fromKilograms(weightKg),
  priority
});

const optimizedRoute = (waypoints: GeoPoint[], distance = 10, duration = 30) => ({
  segments: [],
  totalDistance: distance,
  totalDuration: duration,
  waypoints,
  efficiency: 90,
  confidence: 0.9,
  alternatives: []
});

describe('RouteCreationService', () => {
  let calculateMultiStopRoute: jest.Mock;
  let calculateOptimalRoute: jest.Mock;
  let service: RouteCreationService;

  beforeEach(() => {
    calculateMultiStopRoute = jest.fn();
    calculateOptimalRoute = jest.fn().mockImplementation(async (origin: GeoPoint, destination: GeoPoint) => {
      const distance = origin.distanceTo(destination);
      const duration = Math.max(1, Math.round((distance / 30) * 60));
      return optimizedRoute([origin, destination], distance, duration);
    });
    service = new RouteCreationService(
      {
        calculateMultiStopRoute,
        calculateOptimalRoute,
        getRouteAlternatives: jest.fn(),
        validateRoute: jest.fn()
      } as never,
      {} as never,
      { clusteringEnabled: false, clusteringRadiusKm: 1.0 }
    );
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates an optimized multi-delivery route with calculated savings', async () => {
    const courier = createCourier();
    const d1 = createDelivery('d1', [-6.791, 39.201, 'Pickup 1'], [-6.792, 39.202, 'Drop 1'], 2, 'express');
    const d2 = createDelivery('d2', [-6.793, 39.203, 'Pickup 2'], [-6.794, 39.204, 'Drop 2'], 3, 'standard');

    calculateMultiStopRoute
      .mockResolvedValueOnce(optimizedRoute([d1.pickupLocation, d2.pickupLocation], 8, 24))
      .mockResolvedValueOnce(optimizedRoute([courier.currentLocation, d1.pickupLocation, d1.deliveryLocation, d2.pickupLocation, d2.deliveryLocation], 12, 38));

    const result = await service.createRouteForCourier(courier, [d1, d2], {
      optimizationPreference: 'fastest'
    });

    expect(result.assignedDeliveries).toHaveLength(2);
    expect(result.route.getCourierId()).toBe('courier-1');
    expect(result.route.getStatus()).toBe(RouteStatus.PLANNED);
    expect(result.route.getWaypoints().length).toBe(5);
    expect(result.optimizationScore).toBeGreaterThanOrEqual(0);
    expect(result.estimatedSavings.timeMinutes).toBeGreaterThanOrEqual(0);
    expect(result.estimatedSavings.distanceKm).toBeGreaterThanOrEqual(0);
  });

  it('respects delivery constraints and limits assignment size', async () => {
    const courier = createCourier();
    const d1 = createDelivery('d1', [-6.791, 39.201, 'Pickup 1'], [-6.792, 39.202, 'Drop 1']);
    const d2 = createDelivery('d2', [-6.793, 39.203, 'Pickup 2'], [-6.794, 39.204, 'Drop 2']);

    calculateMultiStopRoute
      .mockResolvedValueOnce(optimizedRoute([d1.pickupLocation], 3, 12))
      .mockResolvedValueOnce(optimizedRoute([courier.currentLocation, d1.pickupLocation, d1.deliveryLocation], 5, 18));

    const result = await service.createRouteForCourier(courier, [d1, d2], {
      maxDeliveriesPerRoute: 1
    });

    expect(result.assignedDeliveries).toHaveLength(1);
  });

  it('throws when no deliveries satisfy constraints', async () => {
    const courier = createCourier();
    const tooHeavy = createDelivery('d-heavy', [-6.791, 39.201, 'Pickup'], [-6.792, 39.202, 'Drop'], 10);

    await expect(
      service.createRouteForCourier(courier, [tooHeavy], { maxTotalWeightKg: 1 })
    ).rejects.toThrow('No deliveries can be assigned to this courier under current constraints');
  });

  it('falls back to distance sequencing and approximate metrics when optimization fails', async () => {
    const courier = createCourier();
    const near = createDelivery('near', [-6.7905, 39.2005, 'Near Pickup'], [-6.7910, 39.2010, 'Near Drop']);
    const far = createDelivery('far', [-6.8500, 39.2600, 'Far Pickup'], [-6.8510, 39.2610, 'Far Drop']);

    calculateMultiStopRoute.mockRejectedValue(new Error('optimizer down'));

    const result = await service.createRouteForCourier(courier, [far, near]);

    expect(result.assignedDeliveries[0]?.id).toBe('near');
    expect(result.route.getTotalDistance()).toBeGreaterThan(0);
    expect(result.route.getEstimatedDuration()).toBeGreaterThan(0);
  });

  it('supports single-delivery route creation API', async () => {
    const courier = createCourier();
    const delivery = createDelivery('single', [-6.791, 39.201, 'Pickup'], [-6.792, 39.202, 'Drop'], 1, 'urgent');

    calculateMultiStopRoute
      .mockResolvedValueOnce(optimizedRoute([delivery.pickupLocation], 2, 10))
      .mockResolvedValueOnce(optimizedRoute([courier.currentLocation, delivery.pickupLocation, delivery.deliveryLocation], 4, 16));

    const result = await service.createRouteForSingleDelivery(courier, delivery);

    expect(result.assignedDeliveries).toHaveLength(1);
    expect(result.assignedDeliveries[0]?.id).toBe('single');
  });
});
