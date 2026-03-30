# User Service

User module for the Maysar monolith. It owns profile management, verification, security actions, and COD reputation lookups.

## Runtime

- Canonical monolith mount: `/api/user`
- Legacy standalone app entry: `services/user-service/src/main.ts` (serves the same router under `/api/v1`)

## Current Routes

- `GET /api/user/health`
- `GET /api/user/health/ready`
- `GET /api/user/health/live`
- `GET /api/user/health/metrics`
- `GET /api/user/lookup`
- `GET /api/user/search`
- `POST /api/user`
- `GET /api/user/profile`
- `PUT /api/user/profile`
- `GET /api/user/:id`
- `PUT /api/user/:id`
- `DELETE /api/user/:id`
- `POST /api/user/verify-email/:token`
- `POST /api/user/request-password-reset`
- `POST /api/user/reset-password/:token`
- `POST /api/user/:id/password`
- `POST /api/user/:id/suspend`
- `POST /api/user/:id/role`
- `POST /api/user/:id/phone/verify`
- `POST /api/user/:id/2fa/setup`
- `POST /api/user/security/breaches/report`
- `GET /api/user/:userId/cod-reputation`

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
npm run test:user-service
npm run test:user-service:unit
npm run test:user-service:integration
npm run test:user-service:coverage
```

## Docs

- `services/user-service/openapi.yaml`
- `services/user-service/src/api/routes/user.routes.ts`
- `services/user-service/src/application/sagas/`
