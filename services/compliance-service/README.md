# Compliance Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> AML/KYC transaction monitoring, suspicious activity detection, and regulatory reporting.

## Purpose

The Compliance Service monitors all platform transactions for Anti-Money Laundering (AML) and Know Your Customer (KYC) compliance. It flags suspicious activity, generates regulatory reports, and runs the `ComplianceCheckSaga` to validate transactions against configurable compliance rules. This service is critical for platform operation — non-compliance risks regulatory shutdown.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # Compliance rules engine, risk scoring, AML/KYC policies
├── application/      # Use cases: CheckTransaction, FlagActivity, GenerateReport
├── infrastructure/   # Prisma repositories, event consumers, report exporters
└── api/              # Express routes and controllers
```

## Key Domain Concepts

- **AML Monitoring**: Transaction pattern analysis against configurable thresholds
- **KYC Validation**: Identity verification status checks before high-value transactions
- **Suspicious Activity Detection**: Rule-based and threshold-based flagging
- **Regulatory Reports**: Automated report generation for compliance submissions
- **ComplianceCheckSaga**: Validates transactions against all active compliance rules before processing

## Dependencies

| Service | Reason |
|---------|--------|
| order-service | Transaction data for AML monitoring |
| payment-service | Payment amounts trigger compliance checks |
| user-service | KYC status verification |

## API Endpoints

```
POST   /api/compliance/check              # Run compliance check on a transaction
GET    /api/compliance/flags              # List flagged activities
GET    /api/compliance/flags/:id          # Get flag details
POST   /api/compliance/reports            # Generate regulatory report
GET    /api/compliance/reports/:id        # Get report
GET    /health                            # Health check
```

## Database Schema

Compliance data models are defined in the shared Prisma schema. Key models include compliance check records, activity flags, and generated reports.

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

Key events: `SuspiciousActivityDetected`, `ComplianceReportGenerated`

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

Active saga: `ComplianceCheckSaga` — validates transactions against compliance rules with 10s timeout and alert-based compensation.

## Testing

```bash
npm run test:compliance-service
npm run test:compliance-service:unit
npm run test:compliance-service:integration
npm run test:compliance-service:coverage
```

## Documentation

| File | Description |
|------|-------------|
| [docs/service-overview.md](docs/service-overview.md) | Purpose, domain concepts, dependencies |
| [docs/events.md](docs/events.md) | Published and consumed events |
| [docs/sagas.md](docs/sagas.md) | Saga definitions |
| [docs/failure-matrix.md](docs/failure-matrix.md) | Failure modes and compensations |
| [docs/scaling-strategy.md](docs/scaling-strategy.md) | Scaling approach (event-driven, 1000 tx/s) |
| [docs/revenue-impact.md](docs/revenue-impact.md) | Business value (prevents platform shutdown, reduces fraud losses) |
| [docs/modeling/](docs/modeling/) | Sequence diagrams, state machines, use cases |
