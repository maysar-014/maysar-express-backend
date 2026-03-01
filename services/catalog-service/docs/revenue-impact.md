# Catalog Service - Revenue Impact

## Buy Box Conversion Uplift

### The Buy-Box Advantage
**Definition**: The `BuyBoxEngine` selects a single winning seller from competing listings using weighted scoring.

**Scoring Algorithm** (from `BuyBoxEngine`):
- **Price**: 40% weight (±5% of median = perfect score)
- **Seller Rating**: 25% weight
- **Stock Availability**: 20% weight
- **Recency**: 10% weight (new listings boost)
- **Fulfillment Speed**: 5% weight

### Conversion Rate Impact
**Industry Research**: Surfacing a single winner increases add-to-cart rate by 15-25% vs. an unranked list.

**Conservative Assumption**: 15% uplift at launch

**Revenue Impact**:
- **Baseline**: 100 product views → 3 add-to-cart (3% conversion)
- **With Buy-Box**: 100 product views → 3.45 add-to-cart (3.45% conversion)
- **Uplift**: 0.45pp = 15% relative improvement

**Annual GMV Impact** (at 10K orders/day):
- 10,000 orders/day × TZS 50,000 avg order × 15% uplift = TZS 75M/day additional GMV
- Annual: TZS 27.4B additional GMV

### Buy-Box Optimization Levers

#### 1. New Seller Boost (`NEW_SELLER_BOOST`)
- **Purpose**: Incentivize new supply, increase marketplace liquidity
- **Mechanism**: +10% score for sellers with <30 days tenure
- **Impact**: 20% more new sellers list products (from Phase 10 testing)
- **GMV Impact**: More supply → more buyer choice → higher conversion

#### 2. Recency Boost (`RECENCY_BOOST`)
- **Purpose**: Surface fresh inventory, reduce stale listings
- **Mechanism**: +5% score for listings <7 days old
- **Impact**: Encourages sellers to refresh listings
- **GMV Impact**: Fresher catalog → higher buyer trust → higher conversion

#### 3. Price Deviation Scoring
- **Mechanism**: ±5% of median price = perfect score; >10% deviation = 50% penalty
- **Purpose**: Keep prices competitive, reduce buyer price-sensitivity churn
- **Impact**: Prevents outlier pricing (too high or suspiciously low)
- **GMV Impact**: Competitive pricing → higher conversion → lower cart abandonment

## Commission Revenue Model

### Commission Rates (from `CommissionCalculationEngine`)

| Recipient | Event | Base Rate | Quality Bonus Max | Notes |
|-----------|-------|-----------|-------------------|-------|
| **Seller** | Sale | 8% of GMV | +18% of base | Rating ≥4.8 +5%, perfect +10%, on-time +5%, satisfaction +3% |
| **Enabler** | Task Assignment | 15% of task value | — | Collaboration setup fee |
| **Enabler** | Task Completion | 20% of task value | — | Highest margin lever |
| **Customer** | Referral | 3% of referred order GMV | — | Network growth flywheel |
| **Customer** | Loyalty | 1% of repeat order GMV | — | Retention mechanic |

### Seller Commission Example
- **Order Value**: TZS 100,000
- **Base Commission**: TZS 8,000 (8%)
- **Quality Bonus** (max):
  - Perfect rating (5.0): +TZS 800 (10% of base)
  - On-time delivery: +TZS 400 (5% of base)
  - Customer satisfaction: +TZS 240 (3% of base)
- **Total Commission**: Up to TZS 9,440 (9.44% of GMV)

### Enabler Commission (Collaboration Orders)
- **Task Assignment**: 15% of task value (e.g., product photography, listing optimization)
- **Task Completion**: 20% of task value (highest margin)
- **Example**: TZS 10,000 task → TZS 1,500 on assignment + TZS 2,000 on completion = TZS 3,500 total

### Customer Incentives
- **Referral**: 3% of referred order GMV (e.g., TZS 50,000 order → TZS 1,500 referral bonus)
- **Loyalty**: 1% of repeat order GMV (e.g., TZS 50,000 repeat order → TZS 500 loyalty bonus)

## Unit Economics

### Revenue Per Order
- **Seller Commission**: 8% of GMV (base)
- **Delivery Fee**: TZS 2,000-5,000 (logistics-service)
- **Enabler Fee** (assisted orders): 15-20% of task value
- **Blended Take Rate**: 10-12% of GMV

### Cost Per Order
- **Payment Gateway**: 2.5% + TZS 500
- **Logistics**: TZS 1,500-3,000 (courier cost)
- **Infrastructure**: TZS 50/order (AWS, Kafka, Redis)
- **Gross Margin**: 5-7% of GMV

### Break-Even Analysis
- **Revenue**: 10% of TZS 50,000 = TZS 5,000
- **Cost**: 2.5% + TZS 500 (gateway) + TZS 2,000 (logistics) + TZS 50 (infra) = TZS 3,800
- **Gross Profit**: TZS 1,200 per order (24% margin)

## Network Effect & Competitive Moat

### Two-Sided Flywheel
1. **More Sellers** → Better buy-box competition → Lower prices → More buyers
2. **More Buyers** → Higher GMV → More sellers attracted
3. **More Listings** → Better catalog matching data → Fewer duplicates → Better search relevance
4. **Better Search** → Higher conversion → More GMV → More sellers

### COD + Wallet Pre-Auth Moat (Tanzania-Specific)
- **Unique Feature**: No competitor offers escrow-like COD reputation scoring
- **Market Penetration**: 70% of Tanzania e-commerce is COD
- **Trust Barrier**: Wallet pre-auth solves "pay-before-delivery" trust gap
- **Revenue Impact**: 23% total GMV increase (from wallet-service revenue-impact.md)

### Catalog Matching Data Moat
- **Definition**: `CatalogMatchingEngine` deduplicates listings, improving search relevance
- **Data Advantage**: Matching accuracy improves with each listing added
- **Competitive Barrier**: Requires 6-12 months of listing data to replicate
- **Revenue Impact**: Fewer duplicates → better search → higher conversion

## CAC vs. LTV

### Customer Acquisition Cost (CAC)
- **Referral Commission**: 3% of first order GMV (e.g., TZS 1,500 for TZS 50,000 order)
- **Paid Ads** (deferred): TZS 5,000 per customer (industry benchmark)
- **Blended CAC**: TZS 3,000 (mix of referral and paid)

### Customer Lifetime Value (LTV)
- **Average Order Value**: TZS 50,000
- **Orders Per Year**: 12 (monthly repeat)
- **Gross Margin**: 5% of GMV = TZS 2,500 per order
- **Annual LTV**: TZS 30,000
- **3-Year LTV**: TZS 90,000

### LTV/CAC Ratio
- **Ratio**: TZS 90,000 / TZS 3,000 = 30:1
- **Target**: >3:1 (healthy SaaS benchmark)
- **Status**: Excellent unit economics

## Optimization Levers

### 1. Increase Buy-Box Conversion Rate
- **Current**: 15% uplift (conservative)
- **Target**: 25% uplift (industry best-in-class)
- **Mechanism**: Optimize scoring weights, A/B test buy-box UI
- **Revenue Impact**: 10pp improvement × TZS 27.4B = TZS 18.3B additional GMV/year

### 2. Reduce Catalog Duplicate Rate
- **Current**: 10% of listings are duplicates (from Phase 10 testing)
- **Target**: 5% duplicate rate
- **Mechanism**: Improve `CatalogMatchingEngine` confidence threshold
- **Revenue Impact**: Better search relevance → 5% conversion improvement → TZS 9.1B GMV/year

### 3. Increase Seller Quality Bonus Adoption
- **Current**: 20% of sellers qualify for quality bonus
- **Target**: 40% of sellers qualify
- **Mechanism**: Seller education, quality incentives
- **Revenue Impact**: Higher seller retention → more supply → more GMV

### 4. Expand Enabler Network
- **Current**: 10% of orders are enabler-assisted
- **Target**: 25% of orders are enabler-assisted
- **Mechanism**: Recruit more enablers, expand task types
- **Revenue Impact**: 15pp × 20% enabler commission × TZS 182B GMV = TZS 5.5B additional revenue/year
