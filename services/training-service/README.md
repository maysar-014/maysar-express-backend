# Training Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Courier and enabler training modules, progress tracking, certification management, and delivery eligibility enforcement.

## Purpose

The Training Service manages the learning and certification lifecycle for couriers and enablers. It enforces delivery eligibility — couriers must hold a valid certification to accept deliveries. Trained enablers achieve 2x productivity and 30% higher task completion rates. Certifications have expiry dates and must be renewed.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # TrainingModule, Enrollment, Certification entities; eligibility policies
├── application/      # Use cases: EnrollCourier, TrackProgress, AwardCertification
│                     # Saga: TrainingEnrollmentSaga
├── infrastructure/   # Prisma repositories, outbox publisher, event bus adapter
└── api/              # Express routes and controllers
```

## Key Domain Concepts

### Training Progress States

`ENROLLED` → `IN_PROGRESS` → `COMPLETED` / `FAILED`

### Certification

- Awarded on module completion
- Has expiry date — must be renewed
- Enforced by logistics-service before courier assignment

### TrainingEnrollmentSaga

Orchestrates: enrollment → progress tracking → certification award → eligibility update. Handles duplicate enrollment (returns existing) and data loss (retry with 10s timeout).

## Dependencies

| Service | Reason |
|---------|--------|
| logistics-service | Checks certification before courier assignment |
| enabler-service | Enabler onboarding requires training completion |
| notification-service | Training reminders and certification alerts |

## API Endpoints

See [openapi.yaml](openapi.yaml) for the full API specification.

```
POST   /api/training/modules              # Create training module
GET    /api/training/modules/:id          # Get module details
POST   /api/training/enroll               # Enroll courier/enabler in module
PUT    /api/training/progress/:id         # Update training progress
POST   /api/training/complete/:id         # Mark training complete
GET    /api/training/certifications/:userId  # Get user certifications
GET    /api/training/eligibility/:userId  # Check delivery eligibility
GET    /health                            # Health check
```

## Database Schema

Defined in the shared Prisma schema. Key models include training modules, enrollments with progress state, and certifications with expiry tracking.

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

Key events: `TrainingStarted`, `TrainingCompleted`, `CertificationAwarded`

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:training-service
npm run test:training-service:unit
npm run test:training-service:integration
npm run test:training-service:coverage
```

## Documentation

| File | Description |
|------|-------------|
| [openapi.yaml](openapi.yaml) | OpenAPI 3.0 API specification |
| [docs/service-overview.md](docs/service-overview.md) | Purpose, domain concepts, dependencies |
| [docs/events.md](docs/events.md) | Published and consumed events |
| [docs/sagas.md](docs/sagas.md) | Saga definitions |
| [docs/failure-matrix.md](docs/failure-matrix.md) | Failure modes and compensations |
| [docs/scaling-strategy.md](docs/scaling-strategy.md) | Scaling approach (10 enrollments/s, CDN video) |
| [docs/revenue-impact.md](docs/revenue-impact.md) | Business value (2x enabler productivity) |
| [docs/modeling/](docs/modeling/) | Sequence diagrams, state machines, use cases |
