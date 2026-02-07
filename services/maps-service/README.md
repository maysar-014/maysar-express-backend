# Maps Service

Professional implementation of the Maps domain logic following Clean Architecture + Saga Orchestration.

## Purpose

The Maps Service provides comprehensive spatial and location-based functionality including:
- **Route Optimization** - Optimal routing via Google Maps and HERE APIs
- **Real-Time Tracking** - Courier location tracking and ETA calculations
- **Traffic Data** - Live traffic conditions and predictions
- **Weather Integration** - Weather conditions affecting deliveries

## Architecture

Follows Clean Architecture with strict layer separation:
- **Domain** - GeoPoint value object, routing/tracking/traffic/weather ports
- **Application** - MapsService coordinating all providers
- **Infrastructure** - External API adapters with circuit breaker protection
- **API** - Health check endpoints and future REST API

## External Integrations

- **Google Maps Directions API** - Primary routing provider
- **HERE Maps API** - Fallback routing with multi-stop optimization
- **OpenWeatherMap API** - Weather conditions and forecasts
- **Traffic Data** - Via Google Maps traffic layer

## Environment Variables

```
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
HERE_API_KEY=your_here_api_key
OPENWEATHER_API_KEY=your_openweather_api_key
```

## Health Endpoints

- `GET /maps-service/health` - Overall service health with circuit breaker status
- `GET /maps-service/health/ready` - Readiness probe
- `GET /maps-service/health/live` - Liveness probe

## Usage

Maps Service is consumed by other services (e.g., Logistics Service) via the `MapsRegistry`:

```typescript
import { MapsRegistry } from '@services/maps-service/src/infrastructure/registry';

const mapsService = MapsRegistry.getInstance().getMapsService();
const route = await mapsService.getOptimalRoute(origin, destination);
```

## Circuit Breaker Protection

All external API calls are protected by circuit breakers to prevent cascading failures. Circuit breaker metrics are exposed via the health endpoint.
