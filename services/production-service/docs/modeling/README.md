# Production Service - Modeling Documentation

This directory contains Mermaid diagrams documenting the production service's architecture, workflows, and domain models.

## Directory Structure

- **state-machines/** - Entity lifecycle state machines
- **sequence/** - Saga orchestration sequence diagrams
- **use-cases/** - Business use case diagrams

## State Machines

### [production-order-status.mmd](state-machines/production-order-status.mmd)
Lifecycle of a ProductionOrder entity from PENDING through various phases (SCHEDULED, IN_PROGRESS, QUALITY_CHECK) to terminal states (COMPLETED, FAILED, CANCELLED).

### [production-plan-status.mmd](state-machines/production-plan-status.mmd)
Lifecycle of a ProductionPlan entity from DRAFT through execution (SCHEDULED, IN_PROGRESS) with pause capability (ON_HOLD) to terminal states.

### [quality-checkpoint-status.mmd](state-machines/quality-checkpoint-status.mmd)
Lifecycle of QualityCheckpoint entity during inspection process, including rework flow.

## Sequence Diagrams

### [production-plan-saga.mmd](sequence/production-plan-saga.mmd)
Orchestration of production planning: draft creation, resource allocation, scheduling, and order status updates with compensation logic.

### [production-completion-saga.mmd](sequence/production-completion-saga.mmd)
Orchestration of production completion: quality validation, inventory updates, and order service notifications.

### [capacity-adjustment-saga.mmd](sequence/capacity-adjustment-saga.mmd)
Orchestration of capacity changes: validation, capacity updates, and rescheduling of active production plans.

### [quality-control-saga.mmd](sequence/quality-control-saga.mmd)
Orchestration of quality inspection: checkpoint creation, inspector assignment, and result recording with async inspection flow.

## Use Cases

### [production-management.mmd](use-cases/production-management.mmd)
High-level business use cases for production operations including planning, execution, quality control, and capacity management.

## Alignment with Code

All diagrams reflect the actual implementation in:
- `src/domain/entities/` - Entity state machines
- `src/application/sagas/` - Saga sequence diagrams
- `src/domain/` - Business use cases

Last Updated: 2026-02-07
