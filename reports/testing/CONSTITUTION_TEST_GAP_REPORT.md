# Constitution Compliance Audit

- Generated At: 2026-03-08T01:43:06.014Z
- Source Files Audited: 1527
- Test Files Audited: 703
- Missing Test Mappings: 626
- Domain Purity Violations: 19
- Domain Test Purity Violations: 9
- Coverage Target Violations: 843
- Files Missing Coverage Data: 649

## Highest Priority Missing Tests

| File | Layer | Component | Target Coverage | Lines |
|---|---|---|---:|---:|
| services/logistics-service/src/api/controllers/test.controller.ts | api | api-controller | 85% | 734 |
| services/logistics-service/src/infrastructure/repositories/delivery.repository.ts | infrastructure | infrastructure | 80% | 721 |
| services/catalog-service/catalogService.ts | shared | other | 80% | 670 |
| services/notification-service/notification-service/notificationService.ts | shared | other | 80% | 571 |
| services/logistics-service/src/infrastructure/architectural-analysis.ts | infrastructure | infrastructure | 80% | 566 |
| shared/saga/saga.orchestrator.ts | shared | other | 80% | 545 |
| services/logistics-service/src/infrastructure/performance-benchmarks.ts | infrastructure | infrastructure | 80% | 497 |
| services/logistics-service/src/api/controllers/route.controller.ts | api | api-controller | 85% | 482 |
| services/commission-service/commissionService.ts | shared | other | 80% | 478 |
| services/logistics-service/src/domain/engines/super-efficiency-optimizer.engine.ts | domain | engine | 95% | 471 |
| services/logistics-service/src/infrastructure/repositories/courier.repository.ts | infrastructure | infrastructure | 80% | 460 |
| services/logistics-service/src/api/validators/analytics.validator.ts | api | other | 80% | 441 |
| services/logistics-service/src/api/routes/logistics.routes.ts | api | other | 80% | 433 |
| services/business-registry-service/src/infrastructure/repositories/prisma-business.repository.ts | infrastructure | infrastructure | 80% | 423 |
| services/logistics-service/src/infrastructure/security-audit.ts | infrastructure | infrastructure | 80% | 418 |
| services/logistics-service/src/domain/engines/integration-testing.engine.ts | domain | engine | 95% | 415 |
| services/logistics-service/src/domain/services/route-creation.service.ts | domain | other | 80% | 415 |
| services/logistics-service/src/api/controllers/delivery.controller.ts | api | api-controller | 85% | 399 |
| services/logistics-service/src/infrastructure/repositories/earnings.repository.ts | infrastructure | infrastructure | 80% | 387 |
| services/logistics-service/src/domain/engines/earnings-management.engine.ts | domain | engine | 95% | 376 |
| services/order-service/src/infrastructure/monitoring/alerting.ts | infrastructure | infrastructure | 80% | 371 |
| services/logistics-service/src/infrastructure/monitoring.ts | infrastructure | infrastructure | 80% | 365 |
| services/order-service/src/middleware/caching.middleware.ts | shared | other | 80% | 363 |
| services/catalog-service/src/application/sagas/product-inventory-event-handlers.ts | application | saga | 95% | 356 |
| services/order-service/src/infrastructure/cache/cache-manager.ts | infrastructure | infrastructure | 80% | 352 |
| services/logistics-service/src/api/validators/earnings.validator.ts | api | other | 80% | 348 |
| services/compliance-service/src/complianceService.ts | shared | other | 80% | 347 |
| services/payment-service/src/domain/events/payment.events.ts | domain | other | 80% | 331 |
| services/logistics-service/src/test-runner.ts | shared | other | 80% | 330 |
| services/logistics-service/src/domain/engines/real-time-tracking.engine.ts | domain | engine | 95% | 326 |
| services/user-service/src/application/use-cases/search-users.use-case.ts | application | use-case | 90% | 322 |
| services/auth-service/src/api/routes/auth-middleware.routes.ts | api | other | 80% | 320 |
| services/logistics-service/src/diagnostic-runner.ts | shared | other | 80% | 318 |
| services/logistics-service/src/api/validators/route.validator.ts | api | other | 80% | 308 |
| services/logistics-service/src/infrastructure/repositories/route.repository.ts | infrastructure | infrastructure | 80% | 305 |
| services/order-service/src/infrastructure/database/supabase-order.repository.ts | infrastructure | infrastructure | 80% | 304 |
| services/logistics-service/src/api/validators/tracking.validator.ts | api | other | 80% | 298 |
| services/catalog-service/src/domain/events/pricing-events.ts | domain | other | 80% | 296 |
| services/catalog-service/src/domain/events/product-events.ts | domain | other | 80% | 295 |
| services/wallet-service/src/api/controllers/wallet.controller.ts | api | api-controller | 85% | 291 |
| services/notification-service/notification-service/src/domain/engines/communication.engine.ts | domain | engine | 95% | 279 |
| events/validate.ts | shared | other | 80% | 278 |
| services/auth-service/src/infrastructure/services/service-discovery.ts | infrastructure | infrastructure | 80% | 276 |
| services/logistics-service/src/domain/engines/performance-analytics.engine.ts | domain | engine | 95% | 276 |
| services/user-service/src/application/dto/user.dto.ts | application | other | 80% | 273 |
| services/logistics-service/src/api/controllers/earnings.controller.ts | api | api-controller | 85% | 267 |
| shared/metrics/metrics.factory.ts | shared | other | 80% | 264 |
| services/logistics-service/src/application/sagas/delivery.saga.ts | application | saga | 95% | 257 |
| services/notification-service/src/sms/domain/events/sms.events.ts | domain | other | 80% | 247 |
| services/community-service/src/domain/value-objects/engagement-quota.value-object.ts | domain | value-object | 98% | 237 |

## Coverage Violations

| File | Component | Target | Actual |
|---|---|---:|---:|
| services/analytics-service/src/api/controllers/AnalyticsController.ts | api-controller | 85% | 0.00% |
| services/analytics-service/src/api/controllers/AnalyticsControllerEnhanced.ts | api-controller | 85% | 0.00% |
| services/analytics-service/src/api/routes/analyticsRoutes.ts | other | 80% | 0.00% |
| services/analytics-service/src/api/routes/sellerProfitabilityRoutes.ts | other | 80% | 0.00% |
| services/analytics-service/src/application/dto/metric.dto.ts | other | 80% | 0.00% |
| services/analytics-service/src/application/mappers/metric.mapper.ts | other | 80% | 0.00% |
| services/analytics-service/src/application/sagas/CourierAnalyticsSaga.ts | saga | 95% | 0.00% |
| services/analytics-service/src/application/sagas/EnablerAnalyticsSaga.ts | saga | 95% | 0.00% |
| services/analytics-service/src/application/sagas/SellerAnalyticsSaga.ts | saga | 95% | 0.00% |
| services/analytics-service/src/application/sagas/SupplierAnalyticsSaga.ts | saga | 95% | 0.00% |
| services/analytics-service/src/application/use-cases/GetCourierAnalytics.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GetFinancialMetrics.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GetGrowthIndicators.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GetHappinessSignals.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GetRetentionMetrics.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GetRevenueHealthMetrics.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GetSalesAnalytics.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GetSellerDashboard.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GetSellerOrders.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GetSellerProfitabilityDashboard.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/GetSupplierAnalytics.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/application/use-cases/ProcessAnalyticsEventUseCase.ts | use-case | 90% | 0.00% |
| services/analytics-service/src/domain/algorithms/MovingAverageAlgorithm.ts | algorithm | 98% | 0.00% |
| services/analytics-service/src/domain/algorithms/StatisticalAlgorithm.ts | algorithm | 98% | 0.00% |
| services/analytics-service/src/domain/engines/AlertEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/engines/AnalyticsProcessingEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/engines/CourierAnalyticsEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/engines/EnablerAnalyticsEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/engines/FinancialMetricsEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/engines/GrowthIndicatorsEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/engines/PredictionEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/engines/RedFlagEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/engines/RetentionEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/engines/RevenueHealthEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/engines/SellerAnalyticsEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/engines/SellerHappinessEngine.ts | engine | 95% | 0.00% |
| services/analytics-service/src/domain/entities/Alert.entity.ts | domain-entity | 95% | 0.00% |
| services/analytics-service/src/domain/entities/AnalyticsEvent.entity.ts | domain-entity | 95% | 0.00% |
| services/analytics-service/src/domain/entities/Insight.entity.ts | domain-entity | 95% | 0.00% |
| services/analytics-service/src/domain/entities/Metric.entity.ts | domain-entity | 95% | 0.00% |
| services/analytics-service/src/domain/entities/Prediction.entity.ts | domain-entity | 95% | 0.00% |
| services/analytics-service/src/domain/policies/AlertPolicy.ts | policy | 95% | 0.00% |
| services/analytics-service/src/domain/services/AggregationService.ts | other | 80% | 0.00% |
| services/analytics-service/src/domain/services/MetricCalculationService.ts | other | 80% | 0.00% |
| services/analytics-service/src/domain/services/TrendAnalysisService.ts | other | 80% | 0.00% |
| services/analytics-service/src/domain/value-objects/metric-value.value-object.ts | value-object | 98% | 0.00% |
| services/analytics-service/src/domain/value-objects/time-period.value-object.ts | value-object | 98% | 0.00% |
| services/analytics-service/src/infrastructure/database/prisma.ts | infrastructure | 80% | 0.00% |
| services/analytics-service/src/infrastructure/messaging/EventSubscriber.ts | infrastructure | 80% | 0.00% |
| services/analytics-service/src/infrastructure/MetricsCacheService.ts | infrastructure | 80% | 0.00% |
| services/analytics-service/src/infrastructure/MetricsScheduler.ts | infrastructure | 80% | 0.00% |
| services/analytics-service/src/infrastructure/providers/cache.provider.ts | infrastructure | 80% | 0.00% |
| services/analytics-service/src/infrastructure/providers/CacheProvider.ts | infrastructure | 80% | 0.00% |
| services/analytics-service/src/infrastructure/repositories/AnalyticsEventRepository.ts | infrastructure | 80% | 0.00% |
| services/analytics-service/src/infrastructure/repositories/SellerAnalyticsRepository.ts | infrastructure | 80% | 0.00% |
| services/analytics-service/src/infrastructure/SellerDashboardCache.ts | infrastructure | 80% | 0.00% |
| services/analytics-service/src/infrastructure/services/EnhancedSchedulerService.ts | infrastructure | 80% | 0.00% |
| services/analytics-service/src/infrastructure/services/SchedulerService.ts | infrastructure | 80% | 0.00% |
| services/analytics-service/src/main.ts | other | 80% | 0.00% |
| services/auth-service/src/api/controllers/auth-middleware.controller.ts | api-controller | 85% | 0.00% |
| services/auth-service/src/api/controllers/auth.controller.ts | api-controller | 85% | 0.00% |
| services/auth-service/src/api/controllers/google-oauth.controller.ts | api-controller | 85% | 0.00% |
| services/auth-service/src/api/middleware/index.ts | other | 80% | 0.00% |
| services/auth-service/src/api/middleware/logging.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/api/middleware/rate-limiting.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/api/middleware/validation.middleware.ts | other | 80% | 0.00% |
| services/auth-service/src/api/routes/auth-middleware.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/api/routes/auth.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/api/routes/google-oauth.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/api/routes/health.routes.ts | other | 80% | 0.00% |
| services/auth-service/src/application/mappers/user.mapper.ts | other | 80% | 0.00% |
| services/auth-service/src/application/services/auth-middleware.service.ts | other | 80% | 0.00% |
| services/auth-service/src/config/auth-middleware.config.ts | other | 80% | 0.00% |
| services/auth-service/src/config/authorization.config.ts | other | 80% | 0.00% |
| services/auth-service/src/config/database.config.ts | other | 80% | 0.00% |
| services/auth-service/src/config/google-oauth.config.ts | other | 80% | 0.00% |
| services/auth-service/src/config/index.ts | other | 80% | 0.00% |
| services/auth-service/src/config/monitoring.config.ts | other | 80% | 0.00% |
| services/auth-service/src/config/security.config.ts | other | 80% | 0.00% |
| services/auth-service/src/domain/entities/user.entity.ts | domain-entity | 95% | 0.00% |
| services/auth-service/src/domain/entities/user.types.ts | domain-entity | 95% | 0.00% |
| services/auth-service/src/infrastructure/clients/user-service.client.ts | infrastructure | 80% | 0.00% |
| services/auth-service/src/test-setup.ts | other | 80% | 0.00% |
| services/business-registry-service/src/api/controllers/business.controller.ts | api-controller | 85% | 0.00% |
| services/business-registry-service/src/api/index.ts | other | 80% | 0.00% |
| services/business-registry-service/src/api/middleware/error.middleware.ts | other | 80% | 0.00% |
| services/business-registry-service/src/api/middleware/request-logger.middleware.ts | other | 80% | 0.00% |
| services/business-registry-service/src/api/middleware/validation.middleware.ts | other | 80% | 0.00% |
| services/business-registry-service/src/api/routes/business.routes.ts | other | 80% | 0.00% |
| services/business-registry-service/src/api/routes/health.routes.ts | other | 80% | 0.00% |
| services/business-registry-service/src/application/mappers/business-mapper.ts | other | 80% | 0.00% |
| services/business-registry-service/src/application/sagas/business-onboarding.saga.ts | saga | 95% | 0.00% |
| services/business-registry-service/src/application/sagas/business-verification.saga.ts | saga | 95% | 0.00% |
| services/business-registry-service/src/application/sagas/saga-event-handler.ts | saga | 95% | 0.00% |
| services/business-registry-service/src/application/use-cases/index.ts | use-case | 90% | 0.00% |
| services/business-registry-service/src/application/use-cases/reactivate-business.use-case.ts | use-case | 90% | 0.00% |
| services/business-registry-service/src/application/use-cases/register-business.use-case.ts | use-case | 90% | 0.00% |
| services/business-registry-service/src/application/use-cases/suspend-business.use-case.ts | use-case | 90% | 0.00% |
| services/business-registry-service/src/application/use-cases/update-business.use-case.ts | use-case | 90% | 0.00% |
| services/business-registry-service/src/application/use-cases/verify-business.use-case.ts | use-case | 90% | 0.00% |

## Domain Purity Violations

| File | Import/Usage | Reason |
|---|---|---|
| services/analytics-service/src/domain/engines/RevenueHealthEngine.ts | @prisma/client/runtime/library | forbidden external dependency in domain layer |
| services/auth-service/src/domain/engines/authentication.engine.ts | ../../infrastructure/services/logger.service | domain depends on outward layer |
| services/catalog-service/src/domain/value-objects/buy-box-weights.value-object.ts | process.env | domain accesses environment variables |
| services/catalog-service/src/domain/verification.ts | process.env | domain accesses environment variables |
| services/enabler-service/src/domain/algorithms/tier-calculation.algorithm.ts | @prisma/client | forbidden external dependency in domain layer |
| services/enabler-service/src/domain/engines/commission-calculation.engine.ts | @prisma/client | forbidden external dependency in domain layer |
| services/enabler-service/src/domain/engines/enabler-eligibility.engine.ts | @prisma/client | forbidden external dependency in domain layer |
| services/enabler-service/src/domain/engines/product-matching.engine.ts | @prisma/client | forbidden external dependency in domain layer |
| services/enabler-service/src/domain/entities/enabler-order.entity.ts | @prisma/client | forbidden external dependency in domain layer |
| services/enabler-service/src/domain/entities/enabler.entity.ts | @prisma/client | forbidden external dependency in domain layer |
| services/enabler-service/src/domain/entities/product-listing.entity.ts | @prisma/client | forbidden external dependency in domain layer |
| services/enabler-service/src/domain/policies/enabler-approval.policy.ts | @prisma/client | forbidden external dependency in domain layer |
| services/enabler-service/src/domain/policies/order-facilitation.policy.ts | @prisma/client | forbidden external dependency in domain layer |
| services/enabler-service/src/domain/policies/product-listing.policy.ts | @prisma/client | forbidden external dependency in domain layer |
| services/enabler-service/src/domain/repositories/enabler.repository.interface.ts | @prisma/client | forbidden external dependency in domain layer |
| services/enabler-service/src/domain/value-objects/commission-tier.value-object.ts | @prisma/client | forbidden external dependency in domain layer |
| services/inventory-service/src/domain/engines/stock.engine.ts | ioredis | forbidden external dependency in domain layer |
| services/order-service/src/domain/engines/cache.engine.ts | ../../infrastructure/cache/cache-manager | domain depends on outward layer |
| services/user-service/src/domain/value-objects/password-hash.value-object.ts | process.env | domain accesses environment variables |

## Domain Test Purity Violations

| File | Import/Usage | Reason |
|---|---|---|
| services/catalog-service/src/domain/__tests__/verification.test.ts | axios | domain tests should not depend on infrastructure/network |
| services/catalog-service/src/domain/__tests__/verification.test.ts | fs | domain tests should not depend on infrastructure/network |
| services/catalog-service/src/domain/__tests__/verification.test.ts | process.env | domain tests should not depend on env vars |
| services/enabler-service/src/domain/engines/__tests__/commission-calculation.engine.test.ts | @prisma/client | domain tests should not depend on infrastructure/network |
| services/enabler-service/src/domain/engines/__tests__/enabler-eligibility.engine.test.ts | @prisma/client | domain tests should not depend on infrastructure/network |
| services/enabler-service/src/domain/entities/__tests__/enabler.entity.test.ts | @prisma/client | domain tests should not depend on infrastructure/network |
| services/enabler-service/src/domain/entities/__tests__/product-listing.test.ts | @prisma/client | domain tests should not depend on infrastructure/network |
| services/user-service/src/domain/value-objects/__tests__/password-hash.extra.test.ts | process.env | domain tests should not depend on env vars |
| services/user-service/src/domain/value-objects/__tests__/password-hash.value-object.test.ts | process.env | domain tests should not depend on env vars |
