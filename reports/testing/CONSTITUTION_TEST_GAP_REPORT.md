# Constitution Compliance Audit

- Generated At: 2026-09-27T19:54:01.681Z
- Source Files Audited: 2001
- Test Files Audited: 1506
- Missing Test Mappings: 383
- Domain Purity Violations: 2
- Domain Test Purity Violations: 0
- Coverage Target Violations: 588
- Files Missing Coverage Data: 741

## Highest Priority Missing Tests

| File | Layer | Component | Target Coverage | Lines |
|---|---|---|---:|---:|
| services/chat-service/src/infrastructure/repositories/prisma-moderation.repository.ts | infrastructure | infrastructure | 80% | 487 |
| services/logistics-service/src/domain/engines/delivery-pricing.engine.ts | domain | engine | 95% | 413 |
| services/logistics-service/src/domain/engines/fulfillment-option.engine.ts | domain | engine | 95% | 370 |
| services/chat-service/src/infrastructure/jobs/order-chat.handler.ts | infrastructure | infrastructure | 80% | 353 |
| services/catalog-service/src/api/controllers/seller-location.controller.ts | api | api-controller | 85% | 316 |
| services/chat-service/src/api/routes/chat.routes.ts | api | other | 80% | 312 |
| services/logistics-service/src/application/services/shipment-pool.service.ts | application | other | 80% | 292 |
| services/logistics-service/src/domain/value-objects/pricing-config.value-object.ts | domain | value-object | 98% | 292 |
| services/request-service/src/api/controllers/provider-request.controller.ts | api | api-controller | 85% | 288 |
| services/order-service/src/domain/engines/enhanced-cod-eligibility.engine.ts | domain | engine | 95% | 285 |
| services/logistics-service/src/application/services/consolidation-orchestrator.service.ts | application | other | 80% | 283 |
| services/logistics-service/src/domain/engines/consolidation.engine.ts | domain | engine | 95% | 261 |
| services/request-service/src/application/use-cases/convert-quote-to-order.use-case.ts | application | use-case | 90% | 247 |
| services/logistics-service/src/application/services/logistics-kpi.service.ts | application | other | 80% | 241 |
| services/order-service/src/domain/engines/cod-trust/identity-graph.service.ts | domain | engine | 95% | 241 |
| services/logistics-service/src/application/use-cases/create-order-shipments.use-case.ts | application | use-case | 90% | 227 |
| services/checkout-service/src/application/use-cases/get-delivery-options.use-case.ts | application | use-case | 90% | 212 |
| services/order-service/src/domain/engines/cod-trust/per-order-risk.assessor.ts | domain | engine | 95% | 206 |
| services/logistics-service/src/application/use-cases/generate-fulfillment-options.use-case.ts | application | use-case | 90% | 204 |
| services/logistics-service/src/infrastructure/repositories/prisma-cost-model.repository.ts | infrastructure | infrastructure | 80% | 199 |
| services/logistics-service/src/infrastructure/repositories/prisma-phase5.repository.ts | infrastructure | infrastructure | 80% | 196 |
| shared/errors/api-errors.ts | shared | other | 80% | 192 |
| services/logistics-service/src/infrastructure/providers/local-tanzania-locations.ts | infrastructure | infrastructure | 80% | 190 |
| services/order-service/src/domain/engines/progressive-cod-eligibility.engine.ts | domain | engine | 95% | 186 |
| services/logistics-service/src/application/services/tracking-update.service.ts | application | other | 80% | 185 |
| services/order-service/src/application/use-cases/buyer-confirm-checkout.use-case.ts | application | use-case | 90% | 183 |
| src/app.ts | shared | other | 80% | 183 |
| services/catalog-service/src/application/use-cases/manage-seller-locations.use-case.ts | application | use-case | 90% | 180 |
| services/logistics-service/src/infrastructure/repositories/prisma-vehicle-tariff.repository.ts | infrastructure | infrastructure | 80% | 180 |
| services/request-service/src/api/routes/request.routes.ts | api | other | 80% | 180 |
| services/user-service/src/internal/user-service.facade.ts | shared | other | 80% | 179 |
| services/logistics-service/src/application/use-cases/match-drivers.use-case.ts | application | use-case | 90% | 177 |
| services/order-service/src/api/controllers/verification.controller.ts | api | api-controller | 85% | 177 |
| services/catalog-service/src/application/use-cases/manage-product-inventory.use-case.ts | application | use-case | 90% | 175 |
| services/catalog-service/src/infrastructure/jobs/rolling-average.job.ts | infrastructure | infrastructure | 80% | 175 |
| services/order-service/src/infrastructure/jobs/cod-trust-backfill.job.ts | infrastructure | infrastructure | 80% | 175 |
| services/request-service/src/api/controllers/request.controller.ts | api | api-controller | 85% | 168 |
| services/catalog-service/src/api/controllers/buy-box-admin.controller.ts | api | api-controller | 85% | 166 |
| services/catalog-service/src/application/use-cases/compute-buy-box-ranking.use-case.ts | application | use-case | 90% | 165 |
| services/enabler-service/src/api/controllers/enabler-lifecycle.controller.ts | api | api-controller | 85% | 165 |
| shared/ids/id.ts | shared | other | 80% | 163 |
| services/logistics-service/src/application/use-cases/record-job-completion-ledger.use-case.ts | application | use-case | 90% | 161 |
| services/catalog-service/src/domain/buy-box/repositories/buy-box-ranking.repository.interface.ts | domain | other | 80% | 159 |
| services/checkout-service/src/infrastructure/services/catalog-price-validator.service.ts | infrastructure | infrastructure | 80% | 159 |
| services/notification-service/src/sms/application/use-cases/handle-delivery-report.use-case.ts | application | use-case | 90% | 156 |
| services/request-service/src/infrastructure/repositories/prisma-request.repository.ts | infrastructure | infrastructure | 80% | 154 |
| services/payment-service/src/infrastructure/providers/internal-wallet.adapter.ts | infrastructure | infrastructure | 80% | 149 |
| services/order-service/src/domain/engines/cod-trust/trust-score.functions.ts | domain | engine | 95% | 148 |
| services/order-service/src/domain/engines/cod-trust/seller-cod-risk.service.ts | domain | engine | 95% | 147 |
| services/logistics-service/src/domain/engines/driver-compensation.engine.ts | domain | engine | 95% | 146 |

## Coverage Violations

| File | Component | Target | Actual |
|---|---|---:|---:|
| services/auth-service/src/2fa/api/middleware/error.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/api/middleware/request-logger.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/api/routes/health.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/application/use-cases/verify-two-factor-setup.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/2fa/infrastructure/messaging/event-publisher.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/2fa/infrastructure/services/logger.service.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/api/middleware/index.ts | other | 80% | 0.00% |
| services/auth-service/src/application/mappers/user.mapper.ts | other | 80% | 0.00% |
| services/auth-service/src/application/use-cases/authenticate-user.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/application/use-cases/register-user.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/domain/value-objects/phone-number.value-object.ts | value-object | 98% | 0.00% |
| services/auth-service/src/infrastructure/clients/user-service.client.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/database/connection.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/database/prisma-client.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/repositories/prisma-user.repository.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/session/application/use-cases/create-session.use-case.ts | use-case | 90% | 0.00% |
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
| services/catalog-service/src/pricing/api/middleware/error.middleware.ts | other | 80% | 0.00% |
| services/catalog-service/src/pricing/api/middleware/request-logger.middleware.ts | other | 80% | 0.00% |
| services/catalog-service/src/pricing/api/routes/health.routes.ts | other | 80% | 0.00% |
| services/catalog-service/src/pricing/api/routes/pricing.routes.ts | other | 80% | 0.00% |
| services/catalog-service/src/pricing/app.ts | other | 80% | 0.00% |
| services/catalog-service/src/pricing/application/use-cases/calculate-price.use-case.ts | use-case | 90% | 0.00% |
| services/catalog-service/src/pricing/infrastructure/container.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/pricing/infrastructure/services/health-check.service.ts | infrastructure | 80% | 0.00% |
| services/catalog-service/src/pricing/infrastructure/services/logger.service.ts | infrastructure | 80% | 0.00% |
| services/checkout-service/src/api/middleware/validation.middleware.ts | other | 80% | 0.00% |
| services/checkout-service/src/infrastructure/monitoring/metrics.ts | infrastructure | 80% | 0.00% |
| services/checkout-service/src/shared/utilities.ts | other | 80% | 0.00% |
| services/commission-service/src/api/middleware/error.middleware.ts | other | 80% | 0.00% |
| services/commission-service/src/api/middleware/request-logger.middleware.ts | other | 80% | 0.00% |
| services/commission-service/src/config/index.ts | other | 80% | 0.00% |
| services/commission-service/src/infrastructure/monitoring/metrics.ts | infrastructure | 80% | 0.00% |
| services/commission-service/src/infrastructure/services/logger.service.ts | infrastructure | 80% | 0.00% |
| services/community-service/src/api/controllers/discussions.controller.ts | api-controller | 85% | 0.00% |
| services/community-service/src/api/middleware/rate-limiting.middleware.ts | other | 80% | 0.00% |
| services/community-service/src/api/middleware/validation.middleware.ts | other | 80% | 0.00% |
| services/community-service/src/application/use-cases/create-discussion-thread.use-case.ts | use-case | 90% | 0.00% |
| services/community-service/src/application/use-cases/submit-knowledge-article.use-case.ts | use-case | 90% | 0.00% |
| services/community-service/src/application/use-cases/validate-expertise.use-case.ts | use-case | 90% | 0.00% |
| services/community-service/src/domain/engines/reputation-engine.ts | engine | 95% | 0.00% |
| services/community-service/src/domain/policies/expertise-validation.policy.ts | policy | 95% | 0.00% |
| services/community-service/src/infrastructure/monitoring/metrics.ts | infrastructure | 80% | 0.00% |
| services/community-service/src/infrastructure/repositories/prisma-user.repository.ts | infrastructure | 80% | 0.00% |
| services/enabler-service/src/api/routes/index.ts | other | 80% | 0.00% |
| services/enabler-service/src/application/dto/enabler-order.dto.ts | other | 80% | 0.00% |
| services/enabler-service/src/application/dto/enabler-registration.dto.ts | other | 80% | 0.00% |

## Domain Purity Violations

| File | Import/Usage | Reason |
|---|---|---|
| services/chat-service/src/domain/risk/pattern-miner.ts | @prisma/client | forbidden external dependency in domain layer |
| services/logistics-service/src/domain/services/zone-classifier.ts | ../../infrastructure/providers/local-tanzania-locations | domain depends on outward layer |

## Domain Test Purity Violations

| File | Import/Usage | Reason |
|---|---|---|
| (none) | - | - |
