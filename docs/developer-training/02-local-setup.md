# Local Setup And First Run

This tutorial shows how to get from a fresh clone to a running local backend.

## Prerequisites

- Node.js 18 or newer
- npm 9 or newer
- PostgreSQL
- Redis for services that depend on it
- Git

## Install Dependencies

```bash
npm install
```

## Configure Environment

Copy the example environment file and adjust it for your machine.

```bash
cp .env.example .env
```

Key variables:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `BASE_URL`
- `SERVICE_NAME`

## Generate Prisma Client

```bash
npm run prisma:generate
```

## Apply Database Migrations

```bash
npm run prisma:migrate
```

If your local database is already populated, you may need to inspect or baseline the
schema before applying new migrations.

## Start The App

```bash
npm run dev
```

You should see the service bind to the configured port, usually `3000`.

## Smoke Check

Try the health endpoint:

```bash
curl http://localhost:3000/health
```

If the service is healthy, you should get a JSON response with status information.

## Common Setup Problems

- Database connection failures usually mean the `DATABASE_URL` is wrong or PostgreSQL is down
- Redis warnings often mean the service can still boot, but some features are degraded
- Prisma generation errors usually mean the schema and client are out of sync

## Example Workflow

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Exercise

1. Start the app locally
2. Call `/health`
3. Find which service logs appear in the console first
4. Change one harmless environment variable and observe the startup difference
