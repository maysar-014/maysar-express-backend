# Maysar Express Backend - Modular Monolith Developer Guide

## Overview

We have migrated from a microservices architecture to a modular monolith to simplify development, deployment, and operation while maintaining clear boundaries.

## Architecture

- **Single Process**: All modules run in one Node.js process.
- **Unified Entry Point**: `src/main.ts` bootstraps the application.
- **Modular Structure**: Services are now modules under `services/`, preserving their Clean Architecture layers.
- **Communication**:
  - **In-Process Events**: Using `shared/events/eventBus.ts` (EventEmitter).
  - **Service Locator**: Using `src/core/service-locator.ts` for some shared capabilities.
  - **No HTTP between modules**: Modules should communicate via events or direct method calls if strictly necessary via public interfaces.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Setup Database**:
   ```bash
   npm run db:fresh
   ```
   (Ensures `prisma/schema.prisma` is deployed)
3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Server runs at `http://localhost:3000`.

## Adding a New Module

1. Create a directory in `services/my-new-service`.
2. Implement your domain logic.
3. Create `services/my-new-service/index.ts` exporting the `Module` interface:
   ```typescript
   export const MyNewModule: Module = {
       name: 'my-new-service',
       initialize: async () => { ... },
       routes: router,
       shutdown: async () => { ... }
   };
   ```
4. Register it in `services/index.ts`.

## Testing

- **Unit Tests**: `npm run test:unit`
- **Integration Tests**: `npm run test:integration`
- All tests run via `jest` with the root `jest.config.js`.

## Docker

Build the single image:
```bash
docker build -t maysar-backend .
```
Run with Compose:
```bash
npm run docker:up
```
