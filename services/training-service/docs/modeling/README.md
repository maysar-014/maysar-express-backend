# Training Service Modeling Documentation

This directory contains the behavioral and structural models for the `training-service`, following the [Software Modeling Constitution](../../../software-modeling-constitution.md).

## 1. Use Case Diagrams
High-level business goals and actor interactions.
- [Training Operations](./use-cases/training-operations.mmd): Core business capabilities for learners and system.

## 2. State Machine Diagrams
Entity lifecycles and state transitions.
- [Training Record Lifecycle](./state-machines/training-record.mmd): Comprehensive state transitions for `TrainingRecord` (NOT_STARTED -> IN_PROGRESS -> COMPLETED/FAILED -> EXPIRED).

## 3. Sequence Diagrams
Implementation-level execution flows for Use Cases and Sagas.
- [Start Training Flow](./sequence/start-training.mmd): Interaction between use case, policy engine, and repository.
- [Complete Training Flow](./sequence/complete-training.mmd): Result calculation and eligibility check trigger.
- [Training Completion Saga](./sequence/training-completion-saga.mmd): Distributed orchestration and event publishing flow.

---
> [!NOTE]
> All diagrams are authored in [Mermaid](https://mermaid.js.org/) syntax.

