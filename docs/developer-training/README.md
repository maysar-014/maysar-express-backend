# Developer Training

This folder is a practical onboarding path for engineers joining the Maysar backend.
It starts with the runtime and codebase shape, then moves into the domain patterns,
data model, eventing, testing, and release flow.

## How To Use This

Read the tutorials in order the first time through. After that, jump directly to the
topic you need.

## Learning Path

1. [Platform Orientation](01-platform-orientation.md)
2. [Local Setup And First Run](02-local-setup.md)
3. [Module Architecture](03-module-architecture.md)
4. [Domain, Application, And Infrastructure](04-domain-application-infrastructure.md)
5. [Prisma And Data Modeling](05-prisma-and-data-models.md)
6. [Events, Outbox, And Sagas](06-events-outbox-and-sagas.md)
7. [Security, Auth, And KYC](07-security-auth-and-kyc.md)
8. [Testing And Debugging](08-testing-and-debugging.md)
9. [OpenAPI And Postman](09-openapi-and-postman.md)
10. [Release And Operations](10-release-and-operations.md)

## What You Will Learn

- How the modular monolith is assembled at runtime
- How requests move through middleware, controllers, use cases, and repositories
- How Prisma models map to business behavior
- How event-driven workflows and sagas keep the platform resilient
- How KYC gating, auth, and policy enforcement work together
- How to test, debug, and ship changes safely

## Suggested Pace

- Day 1: read modules 1 to 3 and run the app locally
- Day 2: learn the layered architecture and Prisma patterns
- Day 3: study events, idempotency, and sagas
- Day 4: focus on auth, KYC, and policy enforcement
- Day 5: practice testing, contracts, and release flow

## Hands-On Rule

Every tutorial includes code examples and a small exercise. Try the exercise before
moving on. The goal is not just to read the system, but to be able to change it with
confidence.
