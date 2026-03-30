# Business Registry Service

Business registry module for the Maysar monolith. It handles business onboarding, verification, public seller discovery, compliance records, and lifecycle actions.

## Runtime

- Canonical monolith mount: `/api/business-registry`
- Legacy standalone router entry: `services/business-registry-service/src/main.ts`

## Current Routes

- `GET /api/business-registry/health`
- `GET /api/business-registry/health/ready`
- `GET /api/business-registry/health/live`
- `GET /api/business-registry/public/sellers`
- `GET /api/business-registry/public/sellers/:sellerId`
- `GET /api/business-registry/public/sellers/:sellerId/industries`
- `POST /api/business-registry/businesses`
- `GET /api/business-registry/businesses/search`
- `GET /api/business-registry/businesses/owner/:ownerId`
- `GET /api/business-registry/businesses/:id`
- `PUT /api/business-registry/businesses/:id`
- `DELETE /api/business-registry/businesses/:id`
- `POST /api/business-registry/businesses/:id/verify`
- `POST /api/business-registry/businesses/:id/suspend`
- `POST /api/business-registry/businesses/:id/reactivate`
- `POST /api/business-registry/businesses/:id/documents`
- `GET /api/business-registry/businesses/:id/documents`
- `POST /api/business-registry/businesses/:id/compliance-records`
- `GET /api/business-registry/businesses/:id/compliance-records`

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
npm run test:business-registry-service
npm run test:business-registry-service:unit
npm run test:business-registry-service:integration
npm run test:business-registry-service:coverage
```

## Docs

- `services/business-registry-service/src/api/index.ts`
- `services/business-registry-service/src/api/routes/business.routes.ts`
- `services/business-registry-service/src/application/sagas/`
