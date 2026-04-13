# Platform Orientation

This project is a modular Express monolith. That means it runs as one Node.js process,
but the code is organized into domain modules that behave like small services.

## Mental Model

Think of the system in four layers:

1. Runtime layer - Express, middleware, module registry, health endpoints
2. Domain layer - business rules and pure policy logic
3. Application layer - use cases that coordinate work
4. Infrastructure layer - Prisma, Redis, outbox, event bus, external adapters

The useful question is not "which microservice owns this?" but "which module owns this rule?"

## Main Entry Points

- [src/main.ts](../../src/main.ts) starts the platform
- [src/app.ts](../../src/app.ts) mounts modules and shared middleware
- [services/index.ts](../../services/index.ts) registers modules
- [shared/events/eventBus.ts](../../shared/events/eventBus.ts) carries cross-module events

## Request Life Cycle

When a request arrives:

1. Express receives the request
2. Shared middleware attaches auth, correlation, and observability context
3. The target service router handles the route
4. The controller parses the request and delegates to a use case
5. The use case calls a repository or policy service
6. The repository reads or writes Prisma models
7. The controller returns a response envelope

```text
HTTP request -> middleware -> controller -> use case -> repository -> Prisma
```

## Why This Structure Matters

- It keeps business rules out of controllers
- It makes modules easier to test in isolation
- It lets cross-service workflows move through events instead of direct coupling
- It keeps the codebase readable even when the platform is large

## Example: KYC

The KYC work is a good example of the pattern:

- [services/kyc-service/src/api/routes/kyc.routes.ts](../../services/kyc-service/src/api/routes/kyc.routes.ts) exposes the API
- [services/kyc-service/src/api/controllers/kyc.controller.ts](../../services/kyc-service/src/api/controllers/kyc.controller.ts) handles HTTP
- [services/kyc-service/src/application/use-cases/submit-kyc.use-case.ts](../../services/kyc-service/src/application/use-cases/submit-kyc.use-case.ts) applies business flow
- [services/kyc-service/src/infrastructure/repositories/prisma-kyc.repository.ts](../../services/kyc-service/src/infrastructure/repositories/prisma-kyc.repository.ts) updates Prisma models
- [services/kyc-service/src/application/event-handlers/kyc-event-subscriber.ts](../../services/kyc-service/src/application/event-handlers/kyc-event-subscriber.ts) reacts to platform events

## Exercise

Open one route file and trace a request all the way to Prisma.

Suggested route:

- [services/wallet-service/src/api/routes/wallet.routes.ts](../../services/wallet-service/src/api/routes/wallet.routes.ts)

Write down:

- what middleware runs first
- where authorization happens
- where validation happens
- which controller method is called
- which repository writes to the database
