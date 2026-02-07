# Campaign Service

The Campaign Service manages promotional campaigns, pricing rules, and scheduling within the Maysar platform. It follows Clean Architecture principles and utilizes Saga Orchestration for complex workflows.

## Features

- **Campaign Lifecycle Management**: Create, schedule, launch, pause, resume, cancel, and complete campaigns.
- **Flexible Pricing Rules**: Fixed discounts, percentage discounts, fixed prices, and buy-get rules.
- **Conditional Application**: Apply rules based on order value, customer segment, geographic region, and more.
- **Targeting**: Apply campaigns to specific products or entire categories.
- **Metrics Tracking**: Monitor campaign performance, views, conversions, and revenue impact.
- **Transactional Outbox**: Reliable event publishing for inter-service communication.

## Architecture

The service is organized into several layers:

- **Domain**: Entities (`Campaign`, `PricingRule`, `Condition`), value objects, events, and domain policies.
- **Application**: Use cases, DTOs, mappers, and Sagas for orchestration.
- **Infrastructure**: Prisma-based repository, event publisher, logger, and scheduler services.
- **API**: Express controllers and routes integrated with Inversify DI.

## API Endpoints

- `POST /api/campaign`: Create a new campaign.
- `GET /api/campaign`: List all campaigns.
- `GET /api/campaign/:id`: Get campaign details.
- `PUT /api/campaign/:id`: Update a draft campaign.
- `POST /api/campaign/:id/launch`: Launch a campaign.
- `POST /api/campaign/:id/schedule`: Schedule a campaign.
- `POST /api/campaign/:id/pause`: Pause an active campaign.
- `POST /api/campaign/:id/resume`: Resume a paused campaign.
- `POST /api/campaign/:id/cancel`: Cancel a campaign.
- `POST /api/campaign/:id/complete`: Manually complete a campaign.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- Docker and Docker Compose (for database and messaging)
- Prisma Client

### Configuration

Copy `.env.example` to `.env` and fill in the required variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/maysar_db
KAFKA_BROKERS=localhost:9092
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
```

### Installation

```bash
npm install
npx prisma generate
```

### Running the Service

```bash
npm run dev
```
