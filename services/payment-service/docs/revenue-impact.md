# Payment Service - Revenue Impact

## Payment Capture Success Rate = GMV Multiplier

### Critical Metric
**Payment Capture Success Rate**: % of payment attempts that successfully capture funds

**Current Baseline**: 85% (industry average for emerging markets)  
**Target**: 92% (with fraud optimization and gateway redundancy)

### Revenue Impact
- **Every 1% improvement in capture rate ≈ 1% revenue gain**
- Example: 10,000 orders/day × TZS 50,000 avg order value × 1% = TZS 5M/day additional GMV
- Annual impact of 7pp improvement: TZS 12.8B additional GMV

## Fraud Assessment Threshold Optimization

### Risk Score Distribution (from `docs/fraud-scoring.md` - Phase 7)

| Risk Score Range | Decision | % of Orders | False Positive Rate |
|-----------------|----------|-------------|---------------------|
| 0-30 | Auto-approve | 75% | 0.5% |
| 30-70 | Manual review | 20% | 15% |
| 70-100 | Auto-reject | 5% | 40% |

### Optimization Opportunity
- **Current**: 5% auto-reject rate with 40% false positives = 2% lost GMV
- **Target**: Reduce false positive rate to 20% = 1% lost GMV
- **Revenue Recovery**: 1% of GMV = TZS 1.8B annually at 10K orders/day

### Fraud Prevention Value
- **Prevented Fraud**: 3% of GMV (industry benchmark)
- **Cost of Fraud**: 100% loss + chargeback fees (TZS 10,000/incident)
- **Net Benefit**: Fraud prevention saves TZS 5.4B annually

## COD Pre-Authorization Impact

### Tanzania Market Context
- **COD Market Share**: 70% of e-commerce transactions
- **COD Completion Rate (without pre-auth)**: 60% (industry baseline)
- **COD Completion Rate (with wallet pre-auth)**: 80% (+20pp improvement)

### Revenue Unlock
- **Baseline COD GMV**: 70% of orders × 60% completion = 42% of potential GMV
- **With Pre-Auth**: 70% of orders × 80% completion = 56% of potential GMV
- **GMV Increase**: 33% improvement on COD orders = 23% total GMV increase

### Competitive Moat
- **Unique Feature**: No competitor in Tanzania offers wallet-backed COD pre-authorization
- **Trust Barrier**: Solves "pay-before-delivery" trust gap without requiring upfront payment
- **Market Penetration**: Enables platform to capture high-value COD orders (>TZS 100,000)

## Gateway Redundancy Strategy

### Single Gateway Risk
- **Downtime Impact**: 100% payment failure during outage
- **Historical Uptime**: 99.5% (M-Pesa) = 3.6 hours/month downtime
- **Revenue Loss**: 3.6 hours × 50 orders/s × TZS 50,000 = TZS 32.4M/month

### Multi-Gateway Failover (Deferred to Phase 13)
- **Primary**: M-Pesa (70% of transactions)
- **Secondary**: Airtel Money (20%)
- **Tertiary**: Pesapal (10%, card payments)
- **Failover Logic**: Automatic retry on gateway timeout
- **Revenue Protection**: 99.9% uptime = TZS 29M/month saved

## Unit Economics

### Payment Processing Costs
- **Gateway Fee**: 2.5% + TZS 500 per transaction
- **Fraud Service**: TZS 100 per assessment
- **Infrastructure**: TZS 20 per payment (AWS, Kafka, Redis)
- **Total Cost**: ~3% of GMV + TZS 620 per order

### Revenue Contribution
- **Platform Commission**: 8-12% of GMV (from order-service)
- **Payment Margin**: 5-9% of GMV (after gateway fees)
- **Break-Even Order Value**: TZS 12,400 (below this, payment costs exceed commission)

### Optimization Levers
1. **Negotiate gateway fees**: 2.5% → 2.0% = 20% cost reduction
2. **Reduce fraud false positives**: 2% → 1% lost GMV = TZS 1.8B/year
3. **Increase capture rate**: 85% → 92% = 8% GMV increase
