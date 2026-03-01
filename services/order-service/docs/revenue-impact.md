# Order Service - Revenue Impact

## Commission Revenue Model

Each order drives platform revenue through the commission calculation engine:

### Seller Commission (Primary Revenue)
- **Base Rate**: 8% of GMV
- **Quality Bonus** (up to +18% of base commission):
  - Rating ≥4.8: +5%
  - Perfect rating (5.0): +10%
  - On-time delivery: +5%
  - Customer satisfaction: +3%
- **Example**: TZS 100,000 order → TZS 8,000 base → up to TZS 9,440 with max bonus

### Enabler Commission (Collaboration Orders)
- **Task Assignment**: 15% of task value
- **Task Completion**: 20% of task value (highest margin lever)
- **Training Commission**: 15% on assignment, 20% on completion

### Customer Incentives (Growth Levers)
- **Referral**: 3% of referred order GMV (network growth flywheel)
- **Loyalty**: 1% of repeat order GMV (retention mechanic)

## COD Revenue Mechanics

### COD Reputation Scoring
- Tracks customer COD completion history
- Influences wallet pre-authorization requirements
- **Estimated Impact**: 15-20% reduction in COD fraud-driven revenue leakage
- **Mechanism**: High-reputation customers bypass wallet lock, improving conversion

### Settlement Saga Completion Rate
- **Critical Metric**: % of delivered orders that complete settlement within 24h
- **Target**: 98% completion rate
- **Revenue Impact**: Each 1% improvement = 1% faster cash flow to sellers
- **Failure Mode**: Stalled settlements → seller churn

## Unit Economics

### Revenue Per Order
- Seller commission: 8% GMV
- Delivery fee: TZS 2,000-5,000 (logistics-service)
- Enabler fee (assisted orders): 15-20% of task value
- **Blended Take Rate**: 10-12% of GMV

### Cost Per Order
- Payment gateway: 2.5% + TZS 500
- Logistics: TZS 1,500-3,000 (courier cost)
- Infrastructure: TZS 50/order (AWS, Kafka, Redis)
- **Gross Margin**: 5-7% of GMV

## Conversion Funnel Impact

### Order Completion Rate
- **Baseline**: 65% (industry standard for COD markets)
- **With COD Reputation**: 75% (+10pp improvement)
- **Revenue Multiplier**: 15% GMV increase from reduced abandonment

### Saga Failure Impact
- **StockReservation failure**: 100% revenue loss (order cancelled)
- **PaymentCapture failure**: 100% revenue loss + customer trust damage
- **LogisticsAssignment failure**: Delayed revenue, 20% cancellation risk
- **SettlementSaga failure**: Cash flow delay, seller dissatisfaction

## Competitive Moat

### Tanzania-Specific Advantage
- **COD + Wallet Pre-Auth**: No competitor offers escrow-like COD reputation scoring
- **Market Penetration**: 70% of Tanzania e-commerce is COD (vs. 30% global average)
- **Trust Barrier**: Wallet pre-auth solves the "pay-before-delivery" trust gap

### Network Effects
- More orders → better COD reputation data → lower fraud → higher margins
- Seller quality bonuses incentivize platform loyalty → exclusive inventory
