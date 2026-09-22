# Enabler Service - Service Overview

## Purpose
Manages enabler network, task assignments, training, collaboration workflows, and the **capability lifecycle** (terms/training-gated activation, admin enforcement). Unique to Maysar's multi-sided marketplace model.

## Capability Lifecycle (server-enforced)
- Status machine: `PENDING → APPROVED → ACTIVE ⇄ RESTRICTED → SUSPENDED` (+ `REJECTED`, terminal `DEACTIVATED`), governed by `EnablerLifecyclePolicy`
- Activation requires the accepted terms version + completed mandatory training (read from the shared training domain; fails closed)
- Only `ACTIVE` may build order drafts, generate customer links, access the permanent link or qualify earnings; `RESTRICTED` keeps attribution-only sharing
- Enforcement is capability-scoped and fully audited (immutable enforcement trail + lifecycle events)

## Key Domain Concepts

### Enabler Roles
- Product photography
- Listing optimization
- Inventory management
- Customer service support

### Task Lifecycle
- POSTED → ASSIGNED → IN_PROGRESS → COMPLETED → PAID

### Commission Structure
- Assignment: 15% of task value
- Completion: 20% of task value

## Primary Dependencies
- **order-service**: Task creation from seller requests
- **commission-service**: Commission calculation
- **wallet-service**: Enabler payouts
- **training-service**: Enabler onboarding

## Entry Point
`services/enabler-service/src/index.ts`

## Database Schema
- `Enabler_Enabler`: Enabler profiles (lifecycle status, terms/training/activation timestamps, restriction/suspension/deactivation reason stamps)
- `Enabler_EnforcementAction`: Immutable admin enforcement audit trail (action, previous/new status, reason, actor)
- `Enabler_Task`: Task assignments
- `Enabler_Collaboration`: Seller-enabler partnerships
