# Support Service

[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)

> Customer support ticket management, agent assignment, escalation workflows, and resolution tracking.

## Purpose

The Support Service manages the full lifecycle of customer support interactions. It creates and routes tickets to available agents, handles escalation when SLAs are breached, tracks resolution, and publishes events that feed into analytics. Fast resolution reduces churn by ~15%; self-service deflection targets 40% of incoming tickets.

## Architecture

Follows Clean Architecture with strict layer separation:

```
src/
├── domain/           # Ticket entity, escalation policies, SLA rules
├── application/      # Use cases: CreateTicket, AssignAgent, EscalateTicket, ResolveTicket
│                     # Saga: TicketResolutionSaga
├── infrastructure/   # Prisma repositories, event bus adapter, notification adapter
└── api/              # Express routes and controllers
```

## Key Domain Concepts

### Ticket Lifecycle

`OPEN` → `ASSIGNED` → `IN_PROGRESS` → `RESOLVED` / `CLOSED`
                                     ↗ `ESCALATED` (SLA breach)

### TicketResolutionSaga

Orchestrates: ticket creation → agent assignment (queue if none available, 30s timeout) → resolution → notification.

## Dependencies

| Service | Reason |
|---------|--------|
| notification-service | Notifies customers on ticket updates |
| user-service | Agent and customer identity |

## API Endpoints

```
POST   /api/support/tickets               # Create support ticket
GET    /api/support/tickets/:id           # Get ticket details
PUT    /api/support/tickets/:id/assign    # Assign ticket to agent
PUT    /api/support/tickets/:id/resolve   # Resolve ticket
PUT    /api/support/tickets/:id/escalate  # Escalate ticket
GET    /api/support/tickets/user/:userId  # List user's tickets
GET    /health                            # Health check
```

## Events

See [docs/events.md](docs/events.md) for published and consumed events.

Key events: `TicketCreated`, `TicketResolved`, `EscalationTriggered`

## Sagas

See [docs/sagas.md](docs/sagas.md) for active saga definitions.

## Testing

```bash
npm run test:support-service
npm run test:support-service:unit
npm run test:support-service:integration
npm run test:support-service:coverage
```

## Documentation

| File | Description |
|------|-------------|
| [docs/service-overview.md](docs/service-overview.md) | Purpose, domain concepts, dependencies |
| [docs/events.md](docs/events.md) | Published and consumed events |
| [docs/sagas.md](docs/sagas.md) | Saga definitions |
| [docs/failure-matrix.md](docs/failure-matrix.md) | Failure modes and compensations |
| [docs/scaling-strategy.md](docs/scaling-strategy.md) | Scaling approach (queue-based, 50 tickets/s) |
| [docs/revenue-impact.md](docs/revenue-impact.md) | Business value |
| [docs/modeling/](docs/modeling/) | Sequence diagrams, state machines, use cases |
