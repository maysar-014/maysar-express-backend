import { Router } from 'express';
import { healthRouter } from './health.routes';
import { MapsRegistry } from '../../infrastructure/registry';
import { CalculateRouteUseCase } from '../../application/use-cases/calculate-route.use-case';
import { GeocodeAddressUseCase } from '../../application/use-cases/geocode-address.use-case';

export const apiRouter = Router();

// Register route modules
apiRouter.use('/health', healthRouter);

// ── Routing endpoint ──────────────────────────────────────────────────────────
// POST /routing/calculate
// Body: { origin: { lat, lng }, destination: { lat, lng } }
// Returns: { distance, duration, polyline }
apiRouter.post('/routing/calculate', async (req, res) => {
  try {
    const { origin, destination } = req.body;

    if (
      !origin || typeof origin.lat !== 'number' || typeof origin.lng !== 'number' ||
      !destination || typeof destination.lat !== 'number' || typeof destination.lng !== 'number'
    ) {
      return res.status(422).json({
        success: false,
        error: { code: 'INVALID_COORDINATES', message: 'origin and destination must have numeric lat and lng fields' },
      });
    }

    const registry = MapsRegistry.getInstance();
    const routingProvider = registry.getRoutingProvider();

    if (!routingProvider) {
      return res.status(503).json({
        success: false,
        error: { code: 'PROVIDER_UNAVAILABLE', message: 'Routing provider not initialized' },
      });
    }

    // CalculateRouteUseCase expects a RouteAdapter with calculateRoute(origin, destination)
    // GoogleMapsRoutingAdapter implements RoutingPort (calculateOptimalRoute), not RouteAdapter.
    // We adapt here to keep the use case pure.
    const adapter = {
      calculateRoute: async (o: { lat: number; lng: number }, d: { lat: number; lng: number }) => {
        const { GeoPoint } = await import('../../domain/value-objects/geopoint.value-object');
        const route = await routingProvider.calculateOptimalRoute(
          GeoPoint.create(o.lat, o.lng, 'origin'),
          GeoPoint.create(d.lat, d.lng, 'destination'),
        );
        return {
          distance: route.totalDistance,   // km
          duration: route.totalDuration,   // minutes
          polyline: route.segments.map(s => {
            const end = s.end.getCoordinates();
            return `${end.lat},${end.lng}`;
          }).join(';'),
        };
      },
    };

    const useCase = new CalculateRouteUseCase(adapter);
    const result = await useCase.execute({ origin, destination });

    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ROUTING_FAILED', message: err.message ?? 'Route calculation failed' },
    });
  }
});

// ── Geocoding endpoint ────────────────────────────────────────────────────────
// POST /geocoding/geocode
// Body: { address: string }
// Returns: { latitude, longitude }
apiRouter.post('/geocoding/geocode', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string' || address.trim().length === 0) {
      return res.status(422).json({
        success: false,
        error: { code: 'INVALID_ADDRESS', message: 'address must be a non-empty string' },
      });
    }

    const { GeocodingAdapterImpl } = await import('../../infrastructure/providers/geocoding.adapter');
    const geocodingAdapter = new GeocodingAdapterImpl(process.env.GOOGLE_MAPS_API_KEY);
    const useCase = new GeocodeAddressUseCase(geocodingAdapter);
    const result = await useCase.execute({ address: address.trim() });

    return res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    const isNotFound = err.message?.includes('could not be geocoded');
    return res.status(isNotFound ? 404 : 500).json({
      success: false,
      error: {
        code: isNotFound ? 'ADDRESS_NOT_FOUND' : 'GEOCODING_FAILED',
        message: err.message ?? 'Geocoding failed',
      },
    });
  }
});
