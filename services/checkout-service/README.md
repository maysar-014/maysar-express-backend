# Checkout Service

Checkout module for cart management and checkout session orchestration.
It now also exposes the global MBV signal used across the platform so the UI can
tell buyers when delivery is blocked and how much more they need to add.

## Runtime

- Canonical monolith mount: `/api/checkout`
- Legacy cart alias: `/api/cart`
- Legacy standalone app entry: `services/checkout-service/src/main.ts`

## Current Routes

- `GET /api/checkout/health`
- `GET /api/checkout/health/ready`
- `GET /api/checkout/health/live`
- `GET /api/checkout/metrics`
- `POST /api/checkout/cart/merge`
- `GET /api/checkout/cart/current`
- `GET /api/checkout/cart/:cartId`
- `POST /api/checkout/cart/items`
- `PATCH /api/checkout/cart/items`
- `DELETE /api/checkout/cart/items`
- `DELETE /api/checkout/cart/:cartId`
- `POST /api/checkout/initiate`
- `GET /api/checkout/:id`
- `POST /api/checkout/:id/confirm`

## MBV Behavior

- Global minimum basket value: `TZS 50,000`
- Checkout session responses include:
  - `deliveryEligible`
  - `minimumBasketValue`
  - `minimumBasketShortfall`
  - `minimumBasketMessage`
- Confirm checkout returns `422` when the basket is below the minimum.
- Below-MBV baskets can still exist in cart state; the UI should guide buyers to
  add more items or choose pickup.

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
npm run test:checkout-service
npm run test:checkout-service:unit
npm run test:checkout-service:integration
npm run test:checkout-service:coverage
```

## Docs

- `services/checkout-service/src/api/routes/checkout.routes.ts`
- `services/checkout-service/src/api/controllers/checkout.controller.ts`
- `services/checkout-service/src/application/handlers/checkout-event.handlers.ts`
