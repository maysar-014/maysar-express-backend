# Enabler Service - Modeling Documentation

This directory contains Mermaid diagrams documenting the enabler service's architecture, workflows, and domain models.

## Directory Structure

- **state-machines/** - Entity lifecycle state machines
- **sequence/** - Saga orchestration sequence diagrams
- **use-cases/** - Business use case diagrams

## State Machines

### [enabler-status.mmd](state-machines/enabler-status.mmd)
Lifecycle of an Enabler entity from PENDING through verification and approval to ACTIVE status, with suspension and deactivation flows.

### [enabler-order-status.mmd](state-machines/enabler-order-status.mmd)
Lifecycle of EnablerOrder entity from CREATED through assignment and processing to COMPLETED.

### [product-listing-status.mmd](state-machines/product-listing-status.mmd)
Lifecycle of ProductListing entity from DRAFT through approval process to ACTIVE, with suspension and archival capabilities.

### [commission-status.mmd](state-machines/commission-status.mmd)
Lifecycle of EnablerCommission entity from calculation (PENDING) through approval and payout (PAID), including dispute handling.

## Sequence Diagrams

### [enabler-onboarding-saga.mmd](sequence/enabler-onboarding-saga.mmd)
Orchestration of enabler onboarding: registration, business verification, auto-approval for eligible tiers, wallet setup, and welcome notification.

### [product-listing-saga.mmd](sequence/product-listing-saga.mmd)
Orchestration of product listing: validation, quality checks, approval workflow, and catalog synchronization.

### [enabler-order-fulfillment-saga.mmd](sequence/enabler-order-fulfillment-saga.mmd)
Orchestration of enabler order facilitation: order creation, enabler notification, progress tracking, and commission calculation.

### [commission-settlement-saga.mmd](sequence/commission-settlement-saga.mmd)
Orchestration of commission settlement: aggregation, approval, wallet crediting, payout processing, and record updates.

## Use Cases

### [enabler-operations.mmd](use-cases/enabler-operations.mmd)
High-level business use cases for enabler operations including onboarding, product listing, order facilitation, commission earning, and tier upgrades.

## Alignment with Code

All diagrams reflect the actual implementation in:
- `src/domain/entities/` - Entity state machines
- `src/application/sagas/` - Saga sequence diagrams
- `src/domain/` - Business use cases

Last Updated: 2026-02-07
