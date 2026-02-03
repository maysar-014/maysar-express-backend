# Training Service

Microservice for managing courier training modules, tracking progress, and enforcing certification requirements.

## Features

- Training module management
- Progress tracking (Start, Complete, Fail)
- Certification expiration management
- Delivery eligibility enforcement
- Event-driven integration (Outbox pattern)

## Tech Stack

- Node.js / TypeScript
- Express
- Prisma (PostgreSQL)
- Redis (Caching)
- Kafka (Messaging)
- Docker

## Getting Started

1. Install dependencies: `npm install`
2. Set up environment: `cp .env.example .env`
3. Generate prisma client: `npx prisma generate`
4. Run migrations: `npx prisma migrate dev`
5. Seed data: `npx ts-node prisma/seed.ts`
6. Start dev server: `npm run dev`

## API Documentation

- OpenAPI Spec: `openapi.yaml`
- Swagger UI: `http://localhost:3010/docs/api/index.html` (TODO)
