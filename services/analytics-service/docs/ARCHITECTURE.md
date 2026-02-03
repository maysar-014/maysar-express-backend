# Analytics Service Architecture

## Overview
The Analytics Service is responsible for processing operational events (orders, payments, etc.) into real-time metrics, insights, and predictions.

## Layers

### Domain Layer
- **Entities**: `Metric`, `AnalyticsEvent`, `Insight`, `Prediction`, `Alert`.
- **Value Objects**: `MetricValue`, `TimePeriod`.
- **Engines**: `AnalyticsProcessingEngine` orchestrates the conversion of events to metrics.
- **Services**: `MetricCalculationService` contains deterministic calculation logic.
- **Algorithms**: `StatisticalAlgorithm` provides pure mathematical functions (mean, stdDev).
- **Interfaces**: `IMetricRepository` defines the persistence port.

### Application Layer
- **Use Cases**: `ProcessAnalyticsEventUseCase` coordinates the flow from event arrival to metric storage and notification.
- **DTOs**: `MetricDto`, `AnalyticsEventDto`.
- **Mappers**: `MetricMapper`.

### Infrastructure Layer
- **Repositories**: `MetricRepository` (Prisma/Postgres).
- **Providers**: `CacheProvider` (Redis).
- **Messaging**: `EventSubscriber` (Subscribes to external events), `EventBusAdapter`.
- **Services**: `SchedulerService` (Cron jobs).

## Data Flow
1. Operational Event arrives via `EventBus`.
2. `EventSubscriber` catches the event and invokes `ProcessAnalyticsEventUseCase`.
3. Use case creates a domain `AnalyticsEvent` and passes it to `AnalyticsProcessingEngine`.
4. Engine use `MetricCalculationService` and `StatisticalAlgorithm` to generate `Metric` entities.
5. Use case saves metrics via `IMetricRepository`.
6. Use case publishes `analytics.metrics.calculated` event.
