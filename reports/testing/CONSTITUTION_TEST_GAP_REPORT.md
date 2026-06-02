# Constitution Compliance Audit

- Generated At: 2026-05-29T19:05:24.514Z
- Source Files Audited: 1813
- Test Files Audited: 1440
- Missing Test Mappings: 188
- Domain Purity Violations: 0
- Domain Test Purity Violations: 0
- Coverage Target Violations: 622
- Files Missing Coverage Data: 512

## Highest Priority Missing Tests

| File | Layer | Component | Target Coverage | Lines |
|---|---|---|---:|---:|
| services/governance-service/src/api/controllers/governance.controller.ts | api | api-controller | 85% | 215 |
| services/logistics-service/src/application/services/tracking-update.service.ts | application | other | 80% | 185 |
| services/user-service/src/internal/user-service.facade.ts | shared | other | 80% | 179 |
| services/catalog-service/src/infrastructure/jobs/rolling-average.job.ts | infrastructure | infrastructure | 80% | 175 |
| services/order-service/src/domain/engines/progressive-cod-eligibility.engine.ts | domain | engine | 95% | 173 |
| services/catalog-service/src/application/use-cases/compute-buy-box-ranking.use-case.ts | application | use-case | 90% | 165 |
| services/catalog-service/src/domain/buy-box/repositories/buy-box-ranking.repository.interface.ts | domain | other | 80% | 159 |
| shared/ids/id.ts | shared | other | 80% | 157 |
| services/catalog-service/src/api/controllers/buy-box-admin.controller.ts | api | api-controller | 85% | 156 |
| services/notification-service/src/sms/application/use-cases/handle-delivery-report.use-case.ts | application | use-case | 90% | 156 |
| services/governance-service/src/domain/phase-certification.ts | domain | other | 80% | 150 |
| services/chat-service/src/infrastructure/jobs/marketplace-intelligence.job.ts | infrastructure | infrastructure | 80% | 145 |
| services/chat-service/src/application/use-cases/initiate-conversation.use-case.ts | application | use-case | 90% | 137 |
| services/payment-service/src/api/controllers/paymentGateway-webhook.utils.ts | api | api-controller | 85% | 136 |
| services/payment-service/src/api/routes/paymentGateway-webhook.middleware.ts | api | other | 80% | 132 |
| services/auth-service/src/infrastructure/repositories/prisma-audit.repository.ts | infrastructure | infrastructure | 80% | 131 |
| services/catalog-service/src/infrastructure/jobs/buy-box-recomputation.job.ts | infrastructure | infrastructure | 80% | 125 |
| services/logistics-service/src/infrastructure/repositories/prisma-earnings.repository.ts | infrastructure | infrastructure | 80% | 122 |
| services/catalog-service/src/domain/buy-box/category-strategy.service.ts | domain | other | 80% | 121 |
| services/commission-service/src/infrastructure/repositories/prisma-reward.repository.ts | infrastructure | infrastructure | 80% | 120 |
| services/catalog-service/src/application/use-cases/submit-product-review.use-case.ts | application | use-case | 90% | 118 |
| services/chat-service/src/infrastructure/media/s3-media.store.ts | infrastructure | infrastructure | 80% | 118 |
| services/auth-service/src/application/use-cases/verify-phone-otp.use-case.ts | application | use-case | 90% | 116 |
| services/order-service/src/application/services/trust-signal-ingestion.service.ts | application | other | 80% | 116 |
| services/governance-service/src/infrastructure/governance-report-store.ts | infrastructure | infrastructure | 80% | 113 |
| services/checkout-service/src/infrastructure/repositories/prisma-cart.repository.ts | infrastructure | infrastructure | 80% | 112 |
| services/logistics-service/src/infrastructure/workers/tracking-stream.worker.ts | infrastructure | infrastructure | 80% | 112 |
| services/governance-service/src/domain/governance.types.ts | domain | other | 80% | 110 |
| services/community-service/src/infrastructure/repositories/prisma-follow.repository.ts | infrastructure | infrastructure | 80% | 109 |
| services/chat-service/src/api/controllers/conversation.controller.ts | api | api-controller | 85% | 106 |
| services/chat-service/src/infrastructure/jobs/retention.job.ts | infrastructure | infrastructure | 80% | 104 |
| services/kyc-service/src/application/use-cases/admin-verify-kyc.use-case.ts | application | use-case | 90% | 103 |
| services/chat-service/src/api/routes/chat.routes.ts | api | other | 80% | 101 |
| services/maps-service/src/infrastructure/providers/geocoding.adapter.ts | infrastructure | infrastructure | 80% | 101 |
| services/community-service/src/infrastructure/repositories/prisma-comment.repository.ts | infrastructure | infrastructure | 80% | 100 |
| services/chat-service/src/infrastructure/notifications/notification.client.ts | infrastructure | infrastructure | 80% | 99 |
| services/auth-service/src/api/controllers/phone-verification.controller.ts | api | api-controller | 85% | 96 |
| services/catalog-service/src/domain/buy-box/geographic-optimizer.ts | domain | other | 80% | 95 |
| services/logistics-service/src/infrastructure/repositories/prisma-tracking.repository.ts | infrastructure | infrastructure | 80% | 94 |
| services/logistics-service/src/application/services/courier-assignment.service.ts | application | other | 80% | 91 |
| services/order-service/src/infrastructure/repositories/prisma-cod-restriction.repository.ts | infrastructure | infrastructure | 80% | 90 |
| services/chat-service/src/infrastructure/jobs/archive-courier-conversations.job.ts | infrastructure | infrastructure | 80% | 89 |
| services/notification-service/src/internal/notification.facade.ts | shared | other | 80% | 87 |
| services/production-service/src/application/dto/bulk-order.dto.ts | application | other | 80% | 86 |
| shared/middleware/method-not-allowed.middleware.ts | shared | other | 80% | 85 |
| services/catalog-service/src/domain/buy-box/signals/recency-weighted-rate.ts | domain | other | 80% | 84 |
| services/commission-service/src/infrastructure/repositories/prisma-event-store.repository.ts | infrastructure | infrastructure | 80% | 83 |
| services/governance-service/src/infrastructure/inspectors/index-roundtrip-inspector.ts | infrastructure | infrastructure | 80% | 83 |
| services/catalog-service/src/api/routes/buy-box-admin.routes.ts | api | other | 80% | 82 |
| services/enabler-service/src/infrastructure/repositories/prisma-enabler-analytics.repository.ts | infrastructure | infrastructure | 80% | 82 |

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
| services/checkout-service/src/api/middleware/validation.middleware.ts | other | 80% | 0.00% |
| services/checkout-service/src/infrastructure/monitoring/metrics.ts | infrastructure | 80% | 0.00% |
| services/checkout-service/src/main.ts | other | 80% | 0.00% |
| services/checkout-service/src/shared/utilities.ts | other | 80% | 0.00% |
| services/commission-service/src/api/middleware/error.middleware.ts | other | 80% | 0.00% |
| services/commission-service/src/api/middleware/request-logger.middleware.ts | other | 80% | 0.00% |
| services/commission-service/src/config/index.ts | other | 80% | 0.00% |
| services/commission-service/src/infrastructure/monitoring/metrics.ts | infrastructure | 80% | 0.00% |
| services/commission-service/src/infrastructure/services/logger.service.ts | infrastructure | 80% | 0.00% |
| services/commission-service/src/main.ts | other | 80% | 0.00% |
| services/community-service/src/api/controllers/discussions.controller.ts | api-controller | 85% | 0.00% |

## Domain Purity Violations

| File | Import/Usage | Reason |
|---|---|---|
| (none) | - | - |

## Domain Test Purity Violations

| File | Import/Usage | Reason |
|---|---|---|
| (none) | - | - |
