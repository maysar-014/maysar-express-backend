# Commission Service - Service Overview

## Purpose
Calculates and tracks commission distribution for sellers, enablers, and customers. Implements quality bonus structure.

## Key Domain Concepts

### Commission Types
- Seller: 8% base + up to 18% quality bonus
- Enabler: 15% assignment, 20% completion
- Customer: 3% referral, 1% loyalty

### Quality Bonus Calculation
- Rating ≥4.8: +5%
- Perfect rating: +10%
- On-time delivery: +5%
- Customer satisfaction: +3%

## Primary Dependencies
- **order-service**: Order completion triggers
- **wallet-service**: Commission payout
- **analytics-service**: Performance metrics

## Entry Point
`services/commission-service/src/index.ts`

## Database Schema
- `Commission_Commission`: Commission records
- `Commission_QualityMetrics`: Seller/enabler performance
