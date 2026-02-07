# Production Service Architecture

## Overview
The Production Service manages supplier production operations, including planning, capacity management, quality control, and inventory synchronization. It follows a Clean Architecture pattern with Saga Orchestration for complex workflows.

## Layers

### Domain Layer
- **Entities**: Core business objects (ProductionPlan, ProductionOrder, QualityCheckpoint).
- **Value Objects**: Immutable domain concepts (ProductionCapacity, ProductionSchedule).
- **Engines**: Orchestrates domain logic (Planning, Quality, Capacity).
- **Policies**: Encapsulates business rules (Approval, Standards).
- **Algorithms**: Pure calculation logic (Scheduling, LeadTime).

### Application Layer
- **Use Cases**: Orchestrates application logic for specific user intents.
- **Sagas**: Manages distributed transactions and long-running processes (e.g., Production Planning Saga).
- **DTOs**: Defines data transfer structures.

### Infrastructure Layer
- **Repositories**: Persistence implementations using Prisma.
- **Adapters**: Interfaces to external services (Inventory, Order) and Event Bus.
- **Providers**: Technical services (Cache, Notifications).

### API Layer
- **Controllers**: Handles HTTP requests.
- **Routes**: Defines API endpoints.
- **Validators**: Validates request data using Zod.

## Key Flows

### Production Planning
1. User creates a Production Plan.
2. **ProductionPlanSaga** is triggered.
3. Saga orchestrates:
    - Resource Allocation (Capacity Engine).
    - Production Scheduling (Scheduling Algorithm).
    - Order Creation (ProductionOrder Repository).
    - Event Publishing (ProductionScheduled).

### Quality Control
1. Quality Checkpoint is recorded.
2. **QualityControlEngine** evaluates compliance.
3. Rework is triggered if needed.
