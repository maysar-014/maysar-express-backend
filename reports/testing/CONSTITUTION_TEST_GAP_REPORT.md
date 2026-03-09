# Constitution Compliance Audit

- Generated At: 2026-03-09T00:58:07.037Z
- Source Files Audited: 1528
- Test Files Audited: 1230
- Missing Test Mappings: 103
- Domain Purity Violations: 0
- Domain Test Purity Violations: 0
- Coverage Target Violations: 1261
- Files Missing Coverage Data: 210

## Highest Priority Missing Tests

| File | Layer | Component | Target Coverage | Lines |
|---|---|---|---:|---:|
| services/catalog-service/catalogService.ts | shared | other | 80% | 670 |
| services/notification-service/notification-service/notificationService.ts | shared | other | 80% | 571 |
| services/commission-service/commissionService.ts | shared | other | 80% | 478 |
| services/catalog-service/src/application/sagas/product-inventory-event-handlers.ts | application | saga | 95% | 356 |
| services/compliance-service/src/complianceService.ts | shared | other | 80% | 347 |
| services/user-service/src/application/use-cases/search-users.use-case.ts | application | use-case | 90% | 322 |
| services/order-service/src/infrastructure/database/supabase-order.repository.ts | infrastructure | infrastructure | 80% | 304 |
| services/wallet-service/src/api/controllers/wallet.controller.ts | api | api-controller | 85% | 291 |
| services/notification-service/notification-service/src/domain/engines/communication.engine.ts | domain | engine | 95% | 279 |
| services/logistics-service/src/domain/engines/performance-analytics.engine.ts | domain | engine | 95% | 276 |
| services/order-service/src/infrastructure/database/prisma-order.repository.ts | infrastructure | infrastructure | 80% | 237 |
| services/logistics-service/src/simple-main.ts | shared | other | 80% | 222 |
| services/enabler-service/src/domain/engines/product-matching.engine.ts | domain | engine | 95% | 219 |
| services/community-service/src/application/use-cases/propose-business-challenge.use-case.ts | application | use-case | 90% | 218 |
| services/wallet-service/src/application/sagas/cod-settlement.saga.ts | application | saga | 95% | 211 |
| services/community-service/src/application/use-cases/answer-question.use-case.ts | application | use-case | 90% | 197 |
| services/order-service/src/application/sagas/training.saga.ts | application | saga | 95% | 185 |
| services/payment-service/src/infrastructure/events/payment.event-handlers.ts | infrastructure | infrastructure | 80% | 165 |
| services/notification-service/src/application/mappers/notification-mapper.ts | application | other | 80% | 160 |
| services/wallet-service/src/application/use-cases/reverse-transaction.use-case.ts | application | use-case | 90% | 158 |
| services/wallet-service/src/application/use-cases/initiate-payout-from-wallet.use-case.ts | application | use-case | 90% | 152 |
| services/community-service/src/api/controllers/community.controller.ts | api | api-controller | 85% | 151 |
| services/catalog-service/src/domain/engines/buy-box.engine.ts | domain | engine | 95% | 145 |
| services/notification-service/src/sms/infrastructure/providers/mock-sms.provider.ts | infrastructure | infrastructure | 80% | 138 |
| services/user-service/src/infrastructure/messaging/cod-event-handlers.ts | infrastructure | infrastructure | 80% | 131 |
| services/logistics-service/src/logistics-api.ts | shared | other | 80% | 130 |
| services/community-service/src/api/controllers/knowledge.controller.ts | api | api-controller | 85% | 127 |
| services/community-service/src/application/use-cases/discover-content.use-case.ts | application | use-case | 90% | 125 |
| services/catalog-service/src/campaigns/api/controllers/campaign.controller.ts | api | api-controller | 85% | 124 |
| services/logistics-service/src/api/middleware/optimization.middleware.ts | api | other | 80% | 123 |
| shared/tracing/openTelemetry.ts | shared | other | 80% | 122 |
| services/logistics-service/src/domain/engines/delivery-history.engine.ts | domain | engine | 95% | 120 |
| services/user-service/src/application/use-cases/get-user.use-case.ts | application | use-case | 90% | 120 |
| services/order-service/src/domain/engines/cod-eligibility.engine.ts | domain | engine | 95% | 117 |
| services/catalog-service/src/domain/engines/optimized-search-engine.ts | domain | engine | 95% | 116 |
| services/order-service/src/application/sagas/payment.saga.ts | application | saga | 95% | 115 |
| services/wallet-service/src/api/routes/wallet.routes.ts | api | other | 80% | 112 |
| services/notification-service/src/sms/domain/repositories/sms.repository.ts | domain | other | 80% | 110 |
| services/community-service/src/api/middleware/quota-enforcement.middleware.ts | api | other | 80% | 108 |
| services/logistics-service/src/infrastructure-validator.ts | shared | other | 80% | 108 |
| services/payment-service/src/domain/repositories/payment-provider.gateway.ts | domain | other | 80% | 106 |
| services/enabler-service/src/application/use-cases/facilitate-order.use-case.ts | application | use-case | 90% | 105 |
| services/user-service/src/domain/engines/cod-reputation.engine.ts | domain | engine | 95% | 104 |
| services/order-service/src/application/sagas/settlement.saga.ts | application | saga | 95% | 100 |
| services/notification-service/src/infrastructure/repositories/prisma-preference.repository.ts | infrastructure | infrastructure | 80% | 99 |
| services/community-service/src/infrastructure/repositories/prisma-discussion-thread.repository.ts | infrastructure | infrastructure | 80% | 98 |
| services/notification-service/src/sms/domain/errors/sms.errors.ts | domain | other | 80% | 97 |
| services/logistics-service/src/diagnose-route-engine.ts | shared | other | 80% | 96 |
| services/catalog-service/src/api/controllers/product-matching.controller.ts | api | api-controller | 85% | 94 |
| services/catalog-service/src/domain/indexes/ngram-index.ts | domain | other | 80% | 93 |

## Coverage Violations

| File | Component | Target | Actual |
|---|---|---:|---:|
| services/analytics-service/src/api/controllers/AnalyticsControllerEnhanced.ts | api-controller | 85% | 0.00% |
| services/analytics-service/src/api/controllers/SellerDashboardController.ts | api-controller | 85% | 0.00% |
| services/analytics-service/src/api/routes/analyticsRoutes.ts | other | 80% | 0.00% |
| services/analytics-service/src/api/routes/sellerDashboardRoutes.ts | other | 80% | 0.00% |
| services/analytics-service/src/api/routes/sellerProfitabilityRoutes.ts | other | 80% | 0.00% |
| services/analytics-service/src/application/use-cases/CalculateInventoryHealth.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/CalculateProfitabilityScore.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/CalculateRepeatCustomers.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GenerateActionCenter.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GenerateSalesTrend.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/main.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/api/controllers/two-factor.controller.ts | api-controller | 85% | 0.00% |
| services/auth-service/src/2fa/api/main.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/api/middleware/error.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/api/middleware/request-logger.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/api/routes/health.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/api/routes/two-factor.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/app.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/application/sagas/saga-base.ts | saga | 95% | 0.00% |
| services/auth-service/src/2fa/application/sagas/two-factor-lifecycle.saga.ts | saga | 95% | 0.00% |
| services/auth-service/src/2fa/application/use-cases/disable-two-factor.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/2fa/application/use-cases/enable-two-factor.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/2fa/application/use-cases/get-two-factor-status.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/2fa/application/use-cases/regenerate-backup-codes.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/2fa/application/use-cases/setup-two-factor.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/2fa/application/use-cases/verify-backup-code.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/2fa/application/use-cases/verify-two-factor-login.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/2fa/application/use-cases/verify-two-factor-setup.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/2fa/application/use-cases/verify-two-factor.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/2fa/domain/engines/backup-code.engine.ts | engine | 95% | 0.00% |
| services/auth-service/src/2fa/domain/engines/totp.engine.ts | engine | 95% | 0.00% |
| services/auth-service/src/2fa/domain/entities/two-factor-config.entity.ts | domain-entity | 95% | 0.00% |
| services/auth-service/src/2fa/domain/policies/two-factor.policy.ts | policy | 95% | 0.00% |
| services/auth-service/src/2fa/domain/value-objects/backup-code.value-object.ts | value-object | 98% | 0.00% |
| services/auth-service/src/2fa/domain/value-objects/totp-secret.value-object.ts | value-object | 98% | 0.00% |
| services/auth-service/src/2fa/domain/value-objects/totp-token.value-object.ts | value-object | 98% | 0.00% |
| services/auth-service/src/2fa/infrastructure/container.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/2fa/infrastructure/messaging/event-publisher.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/2fa/infrastructure/repositories/prisma-two-factor.repository.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/2fa/infrastructure/services/encryption.service.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/2fa/infrastructure/services/logger.service.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/2fa/infrastructure/services/qr-code.service.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/2fa/main.ts | other | 80% | 0.00% |
| services/auth-service/src/2fa/types.ts | other | 80% | 0.00% |
| services/auth-service/src/api/controllers/admin.controller.ts | api-controller | 85% | 0.00% |
| services/auth-service/src/api/controllers/auth-middleware.controller.ts | api-controller | 85% | 0.00% |
| services/auth-service/src/api/controllers/auth.controller.ts | api-controller | 85% | 0.00% |
| services/auth-service/src/api/controllers/google-oauth.controller.ts | api-controller | 85% | 0.00% |
| services/auth-service/src/api/controllers/health.controller.ts | api-controller | 85% | 0.00% |
| services/auth-service/src/api/middleware/authentication.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/api/middleware/authorization.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/api/middleware/error-handler.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/api/middleware/index.ts | other | 80% | 0.00% |
| services/auth-service/src/api/middleware/logging.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/api/middleware/rate-limiting.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/api/middleware/validation.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/api/routes/admin.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/api/routes/auth-middleware.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/api/routes/auth.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/api/routes/google-oauth.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/api/routes/health.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/application/mappers/user.mapper.ts | other | 80% | 0.00% |
| services/auth-service/src/application/services/admin.service.ts | other | 80% | 0.00% |
| services/auth-service/src/application/services/audit.service.ts | other | 80% | 0.00% |
| services/auth-service/src/application/services/auth-middleware.service.ts | other | 80% | 0.00% |
| services/auth-service/src/application/services/security.service.ts | other | 80% | 0.00% |
| services/auth-service/src/application/services/system.service.ts | other | 80% | 0.00% |
| services/auth-service/src/application/use-cases/authenticate-user.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/application/use-cases/register-user.use-case.ts | use-case | 90% | 0.00% |
| services/auth-service/src/authService.ts | other | 80% | 0.00% |
| services/auth-service/src/config/auth-middleware.config.ts | other | 80% | 0.00% |
| services/auth-service/src/config/authorization.config.ts | other | 80% | 0.00% |
| services/auth-service/src/config/database.config.ts | other | 80% | 0.00% |
| services/auth-service/src/config/google-oauth.config.ts | other | 80% | 0.00% |
| services/auth-service/src/config/index.ts | other | 80% | 0.00% |
| services/auth-service/src/config/monitoring.config.ts | other | 80% | 0.00% |
| services/auth-service/src/config/resource-mapping.config.ts | other | 80% | 0.00% |
| services/auth-service/src/config/security.config.ts | other | 80% | 0.00% |
| services/auth-service/src/domain/engines/access.engine.ts | engine | 95% | 0.00% |
| services/auth-service/src/domain/engines/authentication.engine.ts | engine | 95% | 0.00% |
| services/auth-service/src/domain/engines/session.engine.ts | engine | 95% | 0.00% |
| services/auth-service/src/domain/entities/user.entity.ts | domain-entity | 95% | 0.00% |
| services/auth-service/src/domain/entities/user.types.ts | domain-entity | 95% | 0.00% |
| services/auth-service/src/domain/policies/authentication.policy.ts | policy | 95% | 0.00% |
| services/auth-service/src/domain/value-objects/email.value-object.ts | value-object | 98% | 0.00% |
| services/auth-service/src/domain/value-objects/password-hash.value-object.ts | value-object | 98% | 0.00% |
| services/auth-service/src/domain/value-objects/phone-number.value-object.ts | value-object | 98% | 0.00% |
| services/auth-service/src/infrastructure/cache/connection.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/clients/auth-service.client.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/clients/user-service.client.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/database/connection.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/database/prisma-client.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/events/auth.event-handlers.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/messaging/connection.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/monitoring/metrics.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/repositories/admin.repository.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/repositories/prisma-user.repository.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/repositories/user-service.repository.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/services/logger.service.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/infrastructure/services/service-discovery.service.ts | infrastructure | 80% | 0.00% |

## Domain Purity Violations

| File | Import/Usage | Reason |
|---|---|---|
| (none) | - | - |

## Domain Test Purity Violations

| File | Import/Usage | Reason |
|---|---|---|
| (none) | - | - |
