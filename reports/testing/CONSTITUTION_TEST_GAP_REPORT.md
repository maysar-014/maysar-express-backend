# Constitution Compliance Audit

- Generated At: 2026-03-09T12:06:23.210Z
- Source Files Audited: 1516
- Test Files Audited: 1342
- Missing Test Mappings: 0
- Domain Purity Violations: 0
- Domain Test Purity Violations: 0
- Coverage Target Violations: 230
- Files Missing Coverage Data: 963

## Highest Priority Missing Tests

| File | Layer | Component | Target Coverage | Lines |
|---|---|---|---:|---:|
| (none) | - | - | - | - |

## Coverage Violations

| File | Component | Target | Actual |
|---|---|---:|---:|
| services/analytics-service/src/main.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/api/main.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/api/middleware/error.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/api/middleware/request-logger.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/api/routes/health.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/app.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/application/use-cases/verify-two-factor-setup.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/2fa/infrastructure/messaging/event-publisher.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/2fa/infrastructure/services/logger.service.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/2fa/main.ts | other | 80% | 0.00% |
| services/auth-service/src/api/middleware/index.ts | other | 80% | 0.00% |
| services/auth-service/src/application/mappers/user.mapper.ts | other | 80% | 0.00% |
| services/auth-service/src/application/use-cases/authenticate-user.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/application/use-cases/register-user.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/domain/value-objects/phone-number.value-object.ts | value-object | 98% | 0.00% |
| services/auth-service/src/infrastructure/clients/user-service.client.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/database/connection.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/database/prisma-client.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/repositories/prisma-user.repository.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/main.ts | other | 80% | 0.00% |
| services/auth-service/src/session/api/main.ts | other | 80% | 0.00% |
| services/auth-service/src/session/application/use-cases/create-session.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/session/main.ts | other | 80% | 0.00% |
| services/business-registry-service/src/api/index.ts | other | 80% | 0.00% |
| services/business-registry-service/src/api/middleware/error.middleware.ts | other | 80% | 0.00% |
| services/business-registry-service/src/api/middleware/request-logger.middleware.ts | other | 80% | 0.00% |
| services/business-registry-service/src/api/middleware/validation.middleware.ts | other | 80% | 0.00% |
| services/business-registry-service/src/application/sagas/index.ts | saga | 95% | 0.00% |
| services/business-registry-service/src/application/sagas/saga-base.ts | saga | 95% | 0.00% |
| services/business-registry-service/src/application/use-cases/index.ts | use-case | 90% | 0.00% |
| services/business-registry-service/src/application/use-cases/register-business.use-case.ts | use-case | 90% | 0.00% |
| services/business-registry-service/src/application/use-cases/verify-business.use-case.ts | use-case | 90% | 0.00% |
| services/business-registry-service/src/config/index.ts | other | 80% | 0.00% |
| services/business-registry-service/src/infrastructure/adapters/index.ts | infrastructure | 80% | 0.00% |
| services/business-registry-service/src/infrastructure/messaging/outbox-processor.ts | infrastructure | 80% | 0.00% |
| services/business-registry-service/src/infrastructure/monitoring/metrics.ts | infrastructure | 80% | 0.00% |
| services/business-registry-service/src/infrastructure/repositories/outbox.repository.ts | infrastructure | 80% | 0.00% |
| services/business-registry-service/src/main.ts | other | 80% | 0.00% |
| services/business-registry-service/src/test-setup.ts | other | 80% | 0.00% |
| services/catalog-service/src/api/controllers/index.ts | api-controller | 85% | 0.00% |
| services/catalog-service/src/api/middleware/authentication.middleware.ts | other | 80% | 0.00% |
| services/catalog-service/src/api/middleware/index.ts | other | 80% | 0.00% |
| services/catalog-service/src/api/middleware/rate-limit.middleware.ts | other | 80% | 0.00% |
| services/catalog-service/src/api/routes/index.ts | other | 80% | 0.00% |
| services/catalog-service/src/api/routes/pricing.routes.ts | other | 80% | 0.00% |
| services/catalog-service/src/api/routes/search.routes.ts | other | 80% | 0.00% |
| services/catalog-service/src/application/dto/index.ts | other | 80% | 0.00% |
| services/catalog-service/src/application/index.ts | other | 80% | 0.00% |
| services/catalog-service/src/application/mappers/index.ts | other | 80% | 0.00% |
| services/catalog-service/src/application/use-cases/index.ts | use-case | 90% | 0.00% |
| services/catalog-service/src/application/use-cases/match-product.use-case.ts | use-case | 90% | 0.00% |
| services/catalog-service/src/application/use-cases/preview-generated-description.use-case.ts | use-case | 90% | 0.00% |
| services/catalog-service/src/campaigns/api/main.ts | other | 80% | 0.00% |
| services/catalog-service/src/campaigns/app.ts | other | 80% | 0.00% |
| services/catalog-service/src/campaigns/application/use-cases/activate-campaign.use-case.ts | use-case | 90% | 0.00% |
| services/catalog-service/src/campaigns/container.ts | other | 80% | 0.00% |
| services/catalog-service/src/campaigns/infrastructure/container.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/campaigns/infrastructure/database/prisma-client.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/campaigns/infrastructure/index.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/campaigns/infrastructure/repositories/saga.repository.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/campaigns/infrastructure/services/logger.service.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/config/database.config.ts | other | 80% | 0.00% |
| services/catalog-service/src/config/index.ts | other | 80% | 0.00% |
| services/catalog-service/src/domain/algorithms/index.ts | algorithm | 98% | 0.00% |
| services/catalog-service/src/domain/engines/catalog-matching.engine.ts | engine | 95% | 0.00% |
| services/catalog-service/src/domain/events/index.ts | other | 80% | 0.00% |
| services/catalog-service/src/domain/indexes/index.ts | other | 80% | 0.00% |
| services/catalog-service/src/domain/interfaces.ts | other | 80% | 0.00% |
| services/catalog-service/src/domain/policies/visibility-policies.ts | policy | 95% | 0.00% |
| services/catalog-service/src/domain/services/index.ts | other | 80% | 0.00% |
| services/catalog-service/src/infrastructure/index.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/infrastructure/messaging/event-store.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/infrastructure/messaging/index.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/infrastructure/messaging/message-bus.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/infrastructure/monitoring/metrics.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/infrastructure/repositories/index.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/infrastructure/services/index.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/infrastructure/services/logger.service.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/pricing/api/controllers/pricing.controller.ts | api-controller | 85% | 0.00% |
| services/catalog-service/src/pricing/api/main.ts | other | 80% | 0.00% |
| services/catalog-service/src/pricing/api/middleware/error.middleware.ts | other | 80% | 0.00% |
| services/catalog-service/src/pricing/api/middleware/request-logger.middleware.ts | other | 80% | 0.00% |
| services/catalog-service/src/pricing/api/routes/health.routes.ts | other | 80% | 0.00% |
| services/catalog-service/src/pricing/api/routes/pricing.routes.ts | other | 80% | 0.00% |
| services/catalog-service/src/pricing/app.ts | other | 80% | 0.00% |
| services/catalog-service/src/pricing/application/use-cases/calculate-price.use-case.ts | use-case | 90% | 0.00% |
| services/catalog-service/src/pricing/infrastructure/container.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/pricing/infrastructure/services/health-check.service.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/pricing/infrastructure/services/logger.service.ts | infrastructure | 80% | 0.00% |
| services/logistics-service/src/api/middleware/error.middleware.ts | other | 80% | 0.00% |
| services/logistics-service/src/api/middleware/request-logger.middleware.ts | other | 80% | 0.00% |
| services/logistics-service/src/api/middleware/validation.middleware.ts | other | 80% | 0.00% |
| services/logistics-service/src/infrastructure/monitoring/metrics.ts | infrastructure | 80% | 0.00% |
| services/logistics-service/src/infrastructure/services/logger.service.ts | infrastructure | 80% | 0.00% |
| services/logistics-service/src/infrastructure/services/logger.ts | infrastructure | 80% | 0.00% |
| services/logistics-service/src/main.ts | other | 80% | 0.00% |
| services/logistics-service/src/infrastructure/messaging/event-publisher.ts | infrastructure | 80% | 1.06% |
| services/catalog-service/src/application/sagas/bulk-product-update.saga.ts | saga | 95% | 1.93% |
| services/auth-service/src/api/middleware/validation.middleware.ts | other | 80% | 4.00% |
| services/logistics-service/src/domain/engines/logistics.engine.ts | engine | 95% | 4.08% |

## Domain Purity Violations

| File | Import/Usage | Reason |
|---|---|---|
| (none) | - | - |

## Domain Test Purity Violations

| File | Import/Usage | Reason |
|---|---|---|
| (none) | - | - |
