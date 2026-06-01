# Order Service

Order module for the Maysar monolith. It owns order creation, lifecycle updates, COD validation, tracking lookup, dispute resolution, and analytics.
It also enforces the platform-wide MBV floor before orders enter COD validation.

## Runtime

- Canonical monolith mount: `/api/order`
- Legacy standalone app entry: `services/order-service/src/main.ts`

## Current Routes

- `GET /api/order/health`
- `GET /api/order/health/live`
- `GET /api/order/health/ready`
- `GET /api/order/health/detailed`
- `GET /api/order/health/metrics`
- `GET /api/order/health/ping`
- `GET /api/order/health/circuit-breakers`
- `GET /api/order/orders`
- `POST /api/order/orders`
- `GET /api/order/orders/search`
- `GET /api/order/orders/analytics/stats`
- `GET /api/order/orders/tracking/:trackingNumber`
- `GET /api/order/orders/:id`
- `PUT /api/order/orders/:id`
- `POST /api/order/orders/:id/status`
- `POST /api/order/orders/:id/cancel`
- `DELETE /api/order/orders/:id`
- `POST /api/order/orders/cod/validate`
- `POST /api/order/orders/disputes/:id/resolve`

## MBV Behavior

- Global minimum basket value: `TZS 50,000`
- Orders below this floor are rejected with a clear shortfall message.
- The MBV check runs before COD eligibility checks so low-value baskets fail fast.
- COD validation still applies buyer trust, seller trust, and logistics rules after
  the MBV floor is satisfied.

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
npm run test:order-service
npm run test:order-service:unit
npm run test:order-service:integration
npm run test:order-service:coverage
```

## Docs

- `services/order-service/openapi.yaml`
- `services/order-service/src/api/routes/order.routes.ts`
- `services/order-service/src/application/sagas/`
