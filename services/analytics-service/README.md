# Analytics Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Aggregates business metrics, generates reports, and provides data insights for platform decision-making.

## Purpose

The Analytics Service is the platform's data intelligence layer. It consumes events from all other services to compute GMV, order volume, conversion rates, seller performance, enabler productivity, COD completion rates, fraud rates, commission revenue, and platform margins. It powers real-time dashboards, cohort analysis, and funnel analysis.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # Metric aggregation logic, report entities
├── application/      # Use cases: GenerateReport, TrackMetric, RunCohortAnalysis
├── infrastructure/   # Prisma repositories, event consumers
└── api/              # Express routes and controllers
```

## Key Domain Concepts

- **Metrics**: Aggregated KPIs (GMV, order volume, conversion rates, fraud rates)
- **Reports**: Daily/weekly/monthly generated summaries
- **Events**: Raw event log consumed from all platform services
- **Cohort Analysis**: User/seller segmentation over time
- **Funnel Analysis**: Drop-off tracking across checkout stages

## Dependencies

| Service | Reason |
|---------|--------|
| All services | Consumes domain events for metric aggregation |

## Database Schema

| Model | Description |
|-------|-------------|
| `Analytics_Metric` | Aggregated metric snapshots |
| `Analytics_Report` | Generated report records |
| `Analytics_Event` | Raw event log for replay and analysis |

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:analytics-service
npm run test:analytics-service:unit
npm run test:analytics-service:integration
npm run test:analytics-service:coverage
```

## Documentation

| File | Description |
|------|-------------|
| [docs/service-overview.md](docs/service-overview.md) | Purpose, domain concepts, dependencies |
| [docs/events.md](docs/events.md) | Published and consumed events |
| [docs/sagas.md](docs/sagas.md) | Saga definitions |
| [docs/failure-matrix.md](docs/failure-matrix.md) | Failure modes and compensations |
| [docs/scaling-strategy.md](docs/scaling-strategy.md) | Scaling approach |
| [docs/revenue-impact.md](docs/revenue-impact.md) | Business value |
| [docs/modeling/](docs/modeling/) | Sequence diagrams, state machines, use cases |
