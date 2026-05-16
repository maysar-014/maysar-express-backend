# Maysar Digital Community Trade Network

> Enterprise E-Commerce Platform Backend - Modular Monolith, Clean Architecture, Event-Driven

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Architecture

The repo runs as a single Node.js process. `src/main.ts` bootstraps the app, loads the 21 exported modules from `services/index.ts`, and `src/app.ts` mounts each one under `/api/{service-name}`. Modules communicate through the shared in-process event bus and saga/outbox helpers, not through HTTP calls.

```text
src/main.ts -> moduleRegistry -> src/app.ts -> /api/{service-name}
                      |
                      +-> shared/events/eventBus
                      +-> shared/saga + shared/outbox
```

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for the fuller architecture notes.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+, TypeScript 5.5 |
| Framework | Express 4, Inversify DI |
| Database | PostgreSQL 15+, Prisma 5 |
| Cache / Locking | Redis 7+, ioredis |
| Messaging | In-process EventBus + shared outbox |
| Validation | Zod, Joi |
| Logging | Winston structured JSON |
| Metrics | Prometheus (`prom-client`) |
| Tracing | OpenTelemetry -> Jaeger |
| Error Tracking | Sentry |
| Testing | Jest, Supertest, Testcontainers |

## Quick Start

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The app listens on `http://localhost:3000` by default.

## E2E Tests

Run the Postman/Newman collection after the server is up on `http://localhost:3000`.

```bash
npx newman run postman/Maysar-Platform-E2E.postman_collection.json \
  --timeout-request 12000 \
  --timeout-script 12000 \
  --reporters json \
  --reporter-json-export reports/newman-e2e.json
```

The report is written to `reports/newman-e2e.json`.

## Service Modules

| Service | Description |
|---------|-------------|
| [analytics-service](services/analytics-service/README.md) | Business metrics, GMV reporting, cohort analysis |
| [auth-service](services/auth-service/README.md) | JWT authentication, session management, 2FA |
| [business-registry-service](services/business-registry-service/README.md) | Business registration, verification, lifecycle |
| [catalog-service](services/catalog-service/README.md) | Product discovery, buy-box, pricing, campaigns |
| [checkout-service](services/checkout-service/README.md) | Cart management and checkout session orchestration |
| [commission-service](services/commission-service/README.md) | Commission calculation for sellers, enablers, customers |
| [community-service](services/community-service/README.md) | Knowledge articles, discussions, posts, feeds |
| [compliance-service](services/compliance-service/README.md) | AML/KYC monitoring, regulatory reporting |
| [enabler-service](services/enabler-service/README.md) | Third-party sales facilitation, tier management |
| [inventory-service](services/inventory-service/README.md) | Stock reservation lifecycle, Redlock protection |
| [logistics-service](services/logistics-service/README.md) | Delivery scheduling, route optimization, courier ops |
| [maps-service](services/maps-service/README.md) | Route computation, real-time tracking, mapping adapters |
| [notification-service](services/notification-service/README.md) | Multi-channel delivery: SMS, email, push, in-app |
| [order-service](services/order-service/README.md) | Order lifecycle, COD validation, saga orchestration |
| [payment-service](services/payment-service/README.md) | Payment processing, fraud assessment, COD pre-auth |
| [payout-service](services/payout-service/README.md) | Seller/enabler payouts, bank transfer, mobile money |
| [production-service](services/production-service/README.md) | Supplier production planning, quality control |
| [support-service](services/support-service/README.md) | Customer support tickets, escalation, resolution |
| [training-service](services/training-service/README.md) | Courier and enabler training, certification tracking |
| [user-service](services/user-service/README.md) | User profiles, verification, roles, security |
| [wallet-service](services/wallet-service/README.md) | Wallet balances, COD commitment ledger, settlement |

## Shared Libraries

| Module | Description |
|--------|-------------|
| [shared/events](shared/events/) | In-process EventBus, publish/subscribe, dead-letter queue |
| [shared/saga](shared/saga/) | Saga orchestration, step execution, compensation |
| [shared/outbox](shared/outbox/README.md) | Transactional outbox pattern |
| [shared/database](shared/database/) | Prisma client singleton and ID middleware |
| [shared/encryption](shared/encryption/) | AES-256-GCM PII encryption, HMAC hashing |
| [shared/errors](shared/errors/) | AppError hierarchy and optimistic lock errors |
| [shared/middleware](shared/middleware/) | CSRF, idempotency, auth context, rate limits |
| [shared/redis](shared/redis/) | Shared `ioredis` client factory |
| [shared/locking](shared/locking/) | Redis-based distributed locking |
| [shared/logger](shared/logger/) | Winston logger factory |
| [shared/metrics](shared/metrics/) | Prometheus metrics factory |
| [shared/tracing](shared/tracing/) | OpenTelemetry tracing and correlation middleware |
| [shared/i18n](shared/i18n/) | i18next config and locales |
| [shared/ids](shared/ids/) | Prefixed ULID generation |
| [shared/config](shared/config/) | Service base URL helpers |
| [shared/types](shared/types/) | Shared TypeScript interfaces |
| [shared/utils](shared/utils/) | Currency, enum mappers, retry helpers |
| [shared/validation](shared/validation/) | Zod/Joi ID validators |
| [shared-contracts](shared-contracts/) | Cross-service event and type contracts |

## Key Scripts

```bash
npm run dev
npm run build
npm run test
npm run test:coverage
npm run lint
npm run prisma:generate
npm run prisma:migrate
npm run staging:up
npm run staging:down
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Central documentation index |
| [docs/Flow Docs/README.md](docs/Flow%20Docs/README.md) | Persona-oriented journey maps with happy/unhappy paths and sequence diagrams |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | Architecture, local setup, adding modules |
| [docs/MODELING_QUICK_START.md](docs/MODELING_QUICK_START.md) | How to create Mermaid diagrams |
| [docs/DIAGRAM_MAINTENANCE_GUIDE.md](docs/DIAGRAM_MAINTENANCE_GUIDE.md) | Diagram update workflow |
| [architecture_constitution.md](architecture_constitution.md) | Architectural governance rules |
| [software-modeling-constitution.md](software-modeling-constitution.md) | Modeling standards |
| [api-documentation-constitution.md](api-documentation-constitution.md) | API documentation standards |
| [testing-constitution.md](testing-constitution.md) | Testing standards |
| [integration_constitution.md](integration_constitution.md) | Integration standards |
| [containerization_constitution.md](containerization_constitution.md) | Container standards |
| [performance_constitution.md](performance_constitution.md) | Performance budgets, latency rules, and the binding 3-second page-load law |

## Infrastructure

- [infra/README.md](infra/README.md) - Terraform modules and Prometheus config
- [docker-compose.yml](docker-compose.yml) - Local development stack
- [docs/postgres-portable-setup.md](docs/postgres-portable-setup.md) - Portable PostgreSQL with backups and restore verification
- [Dockerfile](Dockerfile) - Multi-stage production image

## Contributing

Pre-commit hooks run ESLint + Prettier via `lint-staged`. See `package.json` for the current hook wiring.

```bash
npm run lint
npx prettier --write .
```
