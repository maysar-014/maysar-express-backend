# Maysar Constitutional Amendments - Monolithic Architecture Transition

**Date**: 2026-02-06
**Authority**: Technical Leadership Team
**Status**: ACTIVE

## 1. Purpose
This document records the shift in Maysar's architectural direction from a microservices-oriented approach to a **Modular Monolith** architecture. This transition optimizes for current development velocity while preserving the integrity required for eventual microservices decomposition.

## 2. Major Amendments

### 2.1 Architecture Constitution
- **Terminology Shift**: Replaced "services" with "modules" to reflect logical boundaries within a single deployment unit.
- **Module Communication Rule**: Introduced a preference for **in-memory event buses** (EventEmitter/NestJS) for internal communication, reducing network overhead.
- **Future-Proofing**: Added a clause ensuring that current module boundaries are designed to become physical service boundaries in the future without requires business logic rewrites.

### 2.2 Integration Constitution
- **Internal Security**: Removed mandatory internal mTLS and JWT requirements for module-to-module communication, focusing security on the application perimeter.
- **Hybrid Communication**: Formalized the use of synchronous service calls for immediate internal feedback and asynchronous events for cross-module workflows.
- **Reliability**: Maintained Saga orchestration and idempotency requirements as non-negotiable standards for data consistency.

## 3. Migration Impact
- **Event Bus**: The current Kafka-based `eventBus.ts` is considered a transitionary piece. Future internal events should favor in-memory dispatching where appropriate.
- **Codebase Alignment**: Existing services in the `services/` directory are now considered "modules". The file structure mandate remains strictly enforced within each module.

## 4. Backward Compatibility
- Patterns using Kafka for cross-module communication remain valid but are no longer the primary recommendation for purely internal workflows.
- Service-to-service mTLS configurations may be deprecated in local environments to simplify setup.

## 5. Binding Principle
> "We build for today's simplicity and tomorrow's scale. Logical decoupling is as sacred as physical decoupling."
