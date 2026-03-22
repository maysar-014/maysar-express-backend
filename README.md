# Maysar Digital Community Trade Network

> Enterprise E-Commerce Platform Backend — Modular Monolith, Clean Architecture, Event-Driven

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## Architecture

Single Node.js process running 21 service modules under `services/`. Each module preserves Clean Architecture layers (`domain/`, `application/`, `infrastructure/`, `api/`). Modules communicate via an in-process `EventBus` — no HTTP between modules.

```
src/main.ts  →  ModuleRegistry  →  [21 service modules]
                                         ↕
                                   shared/events/eventBus (in-process)
                                         ↕
                                   shared/saga (distributed transactions)
```

See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for the full architecture guide.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+, TypeScript 5.5 |
| Framework | Express 4, Inversify DI |
| Database | PostgreSQL 15+, Prisma 5 |
| Cache / Locking | Redis 7+, ioredis |
| Messaging | In-process EventBus (kafkajs for future Kafka) |
| Validation | Zod, Joi |
| Logging | Winston (structured JSON) |
| Metrics | Prometheus (prom-client) |
| Tracing | OpenTelemetry → Jaeger |
| Error Tracking | Sentry |
| Testing | Jest, Supertest, Testcontainers |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and configure environment
cp .env.example .env

# 3. Set up database (migrate + seed)
npm run db:fresh

# 4. Start development server (http://localhost:3000)
npm run dev
```

## E2E Tests

Run the Postman/Newman E2E collection after the server is up on `http://localhost:3000`.

```bash
# Optional (recommended in dev)
export SMS_PROVIDER=mock
export PAYMENT_RATE_LIMIT_DISABLED=true

# Run E2E suite
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
| [checkout-service](services/checkout-service/README.md) | Cart management, checkout session orchestration |
| [commission-service](services/commission-service/README.md) | Commission calculation for sellers, enablers, customers |
| [community-service](services/community-service/README.md) | Social posts, feeds, content moderation |
| [compliance-service](services/compliance-service/README.md) | AML/KYC monitoring, regulatory reporting |
| [enabler-service](services/enabler-service/README.md) | Third-party sales facilitation, tier management |
| [inventory-service](services/inventory-service/README.md) | Stock reservation lifecycle, Redlock protection |
| [logistics-service](services/logistics-service/README.md) | Delivery scheduling, route optimization, courier management |
| [maps-service](services/maps-service/README.md) | Route computation, real-time tracking, HERE/Google Maps |
| [notification-service](services/notification-service/README.md) | Multi-channel delivery: SMS, email, push, in-app |
| [order-service](services/order-service/README.md) | Order lifecycle, multi-payment, saga orchestration |
| [payment-service](services/payment-service/README.md) | Payment processing, fraud assessment, COD pre-auth |
| [payout-service](services/payout-service/README.md) | Seller/enabler payouts, bank transfer, mobile money |
| [production-service](services/production-service/README.md) | Supplier production planning, quality control |
| [support-service](services/support-service/README.md) | Customer support tickets, escalation, resolution |
| [training-service](services/training-service/README.md) | Courier training modules, certification tracking |
| [user-service](services/user-service/README.md) | User profiles, verification, roles, security |
| [wallet-service](services/wallet-service/README.md) | Wallet balances, COD commitment ledger, settlement |

## Shared Libraries

| Module | Description |
|--------|-------------|
| [shared/events](shared/events/) | In-process EventBus, publish/subscribe, dead-letter queue |
| [shared/saga](shared/saga/) | DistributedSagaOrchestrator, step execution, compensation |
| [shared/outbox](shared/outbox/README.md) | Transactional outbox pattern for guaranteed event delivery |
| [shared/database](shared/database/) | Prisma client singleton with ID middleware |
| [shared/encryption](shared/encryption/) | AES-256-GCM PII encryption, HMAC hashing |
| [shared/errors](shared/errors/) | AppError hierarchy, optimistic lock errors |
| [shared/audit](shared/audit/) | Event bus audit logging |
| [shared/middleware](shared/middleware/) | CSRF protection, idempotency, Redis rate-limit store |
| [shared/redis](shared/redis/) | ioredis client factory, shared connection pool |
| [shared/locking](shared/locking/) | Redis-based distributed locking (RedisLock) |
| [shared/logger](shared/logger/) | Winston structured logger factory |
| [shared/metrics](shared/metrics/) | Prometheus metrics factory, MetricsCollector |
| [shared/tracing](shared/tracing/) | OpenTelemetry TracingService, correlation middleware |
| [shared/i18n](shared/i18n/) | i18next configuration, en/sw locales |
| [shared/ids](shared/ids/) | Prefixed ULID generation, domain prefix registry |
| [shared/config](shared/config/) | Service base URL helpers |
| [shared/types](shared/types/) | Shared TypeScript interfaces (BaseEntity, IRepository, etc.) |
| [shared/utils](shared/utils/) | Currency, enum mappers, retry with exponential backoff |
| [shared/validation](shared/validation/) | Zod/Joi ID validators |
| [shared-contracts](shared-contracts/) | Cross-service event and type contracts |

## Key Scripts

```bash
npm run dev                          # Start dev server with hot reload
npm run build                        # Compile TypeScript
npm run test                         # Run all tests
npm run test:coverage                # Tests with coverage report
npm run test:<service-name>          # Test a specific service (e.g. test:payment-service)
npm run lint                         # ESLint across all source
npm run staging:up                   # Start staging environment via Docker Compose
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Central documentation index |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | Architecture, getting started, adding modules |
| [docs/MODELING_QUICK_START.md](docs/MODELING_QUICK_START.md) | How to create Mermaid diagrams |
| [docs/DIAGRAM_MAINTENANCE_GUIDE.md](docs/DIAGRAM_MAINTENANCE_GUIDE.md) | Diagram update workflow |
| [architecture_constitution.md](architecture_constitution.md) | Architectural governance rules |
| [software-modeling-constitution.md](software-modeling-constitution.md) | Modeling standards |
| [api-documentation-constitution.md](api-documentation-constitution.md) | API documentation standards |
| [testing-constitution.md](testing-constitution.md) | Testing standards |
| [integration_constitution.md](integration_constitution.md) | Integration standards |
| [containerization_constitution.md](containerization_constitution.md) | Container standards |

## Infrastructure

- [infra/README.md](infra/README.md) — Terraform modules, Prometheus config
- [docker-compose.yml](docker-compose.yml) — Local development stack
- [Dockerfile](Dockerfile) — Multi-stage production image

## Contributing

Pre-commit hooks run ESLint + Prettier (lint-staged) and a secrets scan on every commit. See `husky` configuration in [package.json](package.json).

```bash
# Code quality
npm run lint

# Format
npx prettier --write .
```
