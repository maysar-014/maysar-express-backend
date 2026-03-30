# Logistics Service

Logistics module for the Maysar monolith. It handles delivery planning, route optimization, courier management, tracking, analytics, earnings, and operational checks.

## Runtime

- Canonical monolith mount: `/api/logistics`
- Public v1 API: `/api/logistics/api/v1`
- Legacy courier API: `/api/logistics/api/courier`
- Legacy standalone app entry: `services/logistics-service/src/main.ts`

## Current Routes

- `GET /api/logistics/health`
- `GET /api/logistics/health/ready`
- `GET /api/logistics/health/live`
- `GET /api/logistics/api/stats/performance`
- `GET /api/logistics/api/v1/deliveries`
- `POST /api/logistics/api/v1/deliveries`
- `GET /api/logistics/api/v1/deliveries/:deliveryId`
- `GET /api/logistics/api/v1/deliveries/:deliveryId/history`
- `GET /api/logistics/api/v1/routes`
- `POST /api/logistics/api/v1/routes/optimize`
- `GET /api/logistics/api/v1/routes/:routeId`
- `GET /api/logistics/api/v1/routes/courier/:courierId`
- `GET /api/logistics/api/v1/couriers`
- `GET /api/logistics/api/v1/couriers/:courierId`
- `GET /api/logistics/api/v1/tracking/:trackingNumber`
- `POST /api/logistics/api/v1/tracking/location`
- `GET /api/logistics/api/v1/tracking/courier/:courierId/history`
- `GET /api/logistics/api/v1/analytics`
- `GET /api/logistics/api/v1/analytics/performance`
- `GET /api/logistics/api/v1/analytics/courier/:courierId`
- `GET /api/logistics/api/v1/earnings`
- `GET /api/logistics/api/v1/earnings/courier/:courierId`
- `POST /api/logistics/api/v1/earnings/calculate`
- `GET /api/logistics/api/v1/earnings/summary`
- `GET /api/logistics/api/v1/engines/status`
- `GET /api/logistics/api/v1/architecture/status`
- `GET /api/logistics/api/v1/architecture/layers`
- `GET /api/logistics/api/v1/architecture/test-results`
- `GET /api/logistics/api/v1/circuit-breaker/status`
- `GET /api/logistics/api/v1/performance/benchmarks`
- `GET /api/logistics/api/v1/security/audit`
- `GET /api/logistics/api/v1/test/all-engines`
- `GET /api/logistics/api/v1/test/architectural`

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Testing

```bash
npm run test:logistics-service
npm run test:logistics-service:unit
npm run test:logistics-service:integration
npm run test:logistics-service:coverage
```

## Docs

- `services/logistics-service/openapi.yaml`
- `services/logistics-service/src/api/routes/logistics.routes.ts`
- `services/logistics-service/src/api/routes/courier.routes.ts`
