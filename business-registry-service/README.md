# Business Registry Service

Business Registry Service for Maysar Marketplace. Handles business registration, verification workflows, compliance tracking, and lifecycle management.

## Architecture

The service follows Clean Architecture principles with strict layer separation:

- **Domain Layer**: Entities, value objects, policies, algorithms, and domain services
- **Application Layer**: Use cases, sagas, DTOs, and mappers
- **Infrastructure Layer**: Prisma repositories, event publishing, logging
- **API Layer**: Express controllers, routes, and middleware

## Setup

```bash
npm install
cp .env.example .env
# Configure DATABASE_URL in .env
npx prisma generate
npx prisma migrate dev
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## Testing

```bash
npm test
npm run test:coverage
npm run test:e2e
```

## API Endpoints

### Business Management
- `POST /api/businesses` - Register a new business
- `GET /api/businesses/:id` - Get business by ID
- `PUT /api/businesses/:id` - Update business details
- `DELETE /api/businesses/:id` - Delete business
- `POST /api/businesses/:id/verify` - Verify business
- `POST /api/businesses/:id/suspend` - Suspend business
- `POST /api/businesses/:id/reactivate` - Reactivate business
- `GET /api/businesses/owner/:ownerId` - Get businesses by owner
- `GET /api/businesses/search?q=query` - Search businesses

### Health
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe (database connectivity)
- `GET /health/live` - Liveness probe

## Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| PORT | Service port (default: 3001) |
| NODE_ENV | Environment (development/production) |
| LOG_LEVEL | Logging level |
| EVENT_BUS_URL | Redis URL for event bus |

## Deployment

```bash
docker build -t business-registry-service .
docker run -p 3001:3001 business-registry-service
```
