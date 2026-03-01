# Enabler Service - Service Overview

## Purpose
Manages enabler network, task assignments, training, and collaboration workflows. Unique to Maysar's multi-sided marketplace model.

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
- `Enabler_Enabler`: Enabler profiles
- `Enabler_Task`: Task assignments
- `Enabler_Collaboration`: Seller-enabler partnerships
