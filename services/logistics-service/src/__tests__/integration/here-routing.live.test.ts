/**
 * Live HERE routing integration tests (opt-in)
 *
 * These tests call the real HERE Routing API via MapsRoutingBridge.
 * They are skipped unless RUN_LIVE_HERE_TESTS=true and HERE_API_KEY is set.
 */

import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { MapsRoutingBridge } from '../../infrastructure/providers/maps-routing.bridge';
import { DistanceCalculationAlgorithm } from '../../domain/algorithms/distance-calculation.algorithm';
import { Agent, setGlobalDispatcher } from 'undici';

const shouldRun =
  process.env.RUN_LIVE_HERE_TESTS === 'true' &&
  typeof process.env.HERE_API_KEY === 'string' &&
  process.env.HERE_API_KEY.length > 0;

const describeIfLive = shouldRun ? describe : describe.skip;

describeIfLive('HERE Routing (Live Integration)', () => {
  const pickup = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam CBD');
  const delivery = GeoPoint.create(-6.8167, 39.2833, 'Msasani');
  const dispatcher = new Agent({ keepAliveTimeout: 1, keepAliveMaxTimeout: 1 });

  beforeAll(() => {
    setGlobalDispatcher(dispatcher);
    const routing = new MapsRoutingBridge();
    DistanceCalculationAlgorithm.setRouteOptimizationService(routing);
  });

  afterAll(async () => {
    await dispatcher.close();
  });

  it('calculates a real route distance and duration', async () => {
    const result = await DistanceCalculationAlgorithm.calculateDeliveryDistance(pickup, delivery);

    expect(result.distance).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThan(0);
    expect(typeof result.bearing).toBe('number');
    expect(result.distance).not.toBeNaN();
  });

  it('checks within-radius using HERE routing', async () => {
    const within5km = await DistanceCalculationAlgorithm.isWithinRadius(pickup, delivery, 5);
    const within50km = await DistanceCalculationAlgorithm.isWithinRadius(pickup, delivery, 50);

    expect(within50km).toBe(true);
    expect(typeof within5km).toBe('boolean');
  });
});
