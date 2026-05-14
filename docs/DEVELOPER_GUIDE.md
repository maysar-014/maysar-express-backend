# Maysar Express Backend - Developer Guide

## Overview

The codebase runs as a modular monolith. `src/main.ts` boots the process, `services/index.ts` registers the modules, and `src/app.ts` mounts them under `/api/{service-name}`. Modules communicate through the shared in-process event bus and shared saga/outbox helpers.

For a guided onboarding path with hands-on tutorials, start with [docs/developer-training/README.md](developer-training/README.md).

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

## Chat System

The chat system is a dedicated `chat-service` module providing real-time commerce communication. It is mounted at `/api/chat/v1` and exposes a WebSocket endpoint at `/ws`.

Full documentation: [`docs/chat-system/CHAT_SYSTEM.md`](chat-system/CHAT_SYSTEM.md)

### Quick start

```bash
# Start MinIO (local S3) alongside other infra
npm run infra:up

# MinIO console → http://localhost:9001  (maysar / maysar2026)
# chat-media bucket is created automatically
```

### Key env vars (already in .env after setup)

```env
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY_ID=maysar
S3_SECRET_ACCESS_KEY=maysar2026
S3_BUCKET_CHAT_MEDIA=chat-media
S3_FORCE_PATH_STYLE=true
```

### Running chat tests

```bash
npx jest --selectProjects=chat-service --no-coverage
```
