# Notification Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Multi-channel notification delivery — SMS, email, push, and in-app — with preference management and delivery tracking.

## Purpose

The Notification Service is the platform's communication hub. It receives notification requests from all other services and routes them to the appropriate delivery channel based on user preferences. It tracks delivery status (sent, delivered, read, clicked) and implements retry logic for failed deliveries.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # Notification entities, channel routing policies, preference rules
├── application/      # Use cases: SendNotification, UpdatePreferences, TrackDelivery
├── infrastructure/   # SMS adapter, email (SMTP/nodemailer), Firebase push, in-app store
└── api/              # Express routes and controllers
```

## Key Domain Concepts

### Notification Channels

| Channel | Provider |
|---------|---------|
| SMS | sms-service (mock by default; Meseji placeholder available) |
| Email | SMTP via nodemailer (Maileroo) |
| Push | Firebase Admin SDK |
| In-app | Database-backed notification store |

### Notification Types

- **Transactional**: Order updates, payment confirmations, delivery status
- **Marketing**: Campaigns, promotions, product announcements
- **System**: Security alerts, account changes, verification codes

### Delivery Tracking States

`PENDING` → `SENT` → `DELIVERED` → `READ` → `CLICKED`

Failed deliveries are retried with exponential backoff.

## Dependencies

| Service | Reason |
|---------|--------|
| sms-service | SMS channel delivery |
| Firebase | Mobile push notification delivery |
| SMTP provider | Email delivery |

## API Endpoints

```
POST   /api/notifications/send            # Send notification to a user
GET    /api/notifications/:userId         # Get user's notification history
PUT    /api/notifications/:id/read        # Mark notification as read
GET    /api/notifications/preferences/:userId  # Get user notification preferences
PUT    /api/notifications/preferences/:userId  # Update notification preferences
GET    /health                            # Health check
```

## Database Schema

| Model | Description |
|-------|-------------|
| `Notification_Notification` | Notification records with channel and status |
| `Notification_Preference` | Per-user channel and type preferences |
| `Notification_DeliveryLog` | Delivery attempt tracking with retry state |

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:notification-service
npm run test:notification-service:unit
npm run test:notification-service:integration
npm run test:notification-service:coverage
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
> SMS delivery is currently local-only by default. The `meseji` provider exists as a non-networked placeholder and is not wired to a live API yet.
