# Maysar Express Backend - Developer Guide

## Overview

The codebase runs as a modular monolith. `src/main.ts` boots the process, `services/index.ts` registers the modules, and `src/app.ts` mounts them under `/api/{service-name}`. Modules communicate through the shared in-process event bus and shared saga/outbox helpers.

## Getting Started

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The server listens on `http://localhost:3000` by default.

## Adding A Module

1. Create `services/my-new-service/`.
2. Implement the module export in `services/my-new-service/index.ts` using the `Module` interface from `src/core/module.interface.ts`.
3. Expose the module routes from that wrapper and register the module in `services/index.ts`.
4. Let `src/app.ts` mount it automatically under `/api/my-new-service`.
5. If a legacy alias is required, add it via `routeAliases`.

## Testing

```bash
npm run test
npm run test:<service-name>
npm run test:integration:module
npm run test:e2e:cypress
```

## Containers

Use Docker Compose for a local containerized stack:

```bash
docker compose up --build
docker compose down
```

For the staging profile, use:

```bash
npm run staging:up
npm run staging:down
```

## Notes

- Module-level route prefixes should be documented as they appear after `src/app.ts` mounts the module.
- Prefer the shared event bus over HTTP calls between modules.
- When adding documentation, keep the monolith runtime and the module wrapper paths in sync.
