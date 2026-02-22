# Seller Profitability Metrics Documentation

## Overview
This document explains the 14 profitability metrics calculated by the analytics service, their formulas, and business interpretation.

## Metrics by Category

### 1. Revenue Health Metrics

#### ARPS (Average Revenue Per Seller)
**Formula:** Total GMV / Number of Active Sellers

**Calculation:**
- Sum all delivered orders' total amounts
- Count distinct sellers with at least one delivered order
- Divide total by count

**Business Interpretation:**
- Indicates average revenue generated per seller
- Higher ARPS suggests sellers are performing well
- Declining ARPS may indicate market saturation or seller quality issues
- Tracked weekly and monthly for trend analysis

**Red Flag Threshold:** >10% week-over-week decline

---

#### Median Seller Revenue
**Formula:** 50th percentile of seller revenues

**Calculation:**
- Collect all seller revenues
- Sort in ascending order
- Return middle value (or average of two middle values for even count)

**Business Interpretation:**
- Represents typical seller performance
- Less affected by outliers than mean
- If median << ARPS, indicates revenue concentration among top sellers
- Healthy platform has median close to ARPS

**Red Flag Threshold:** Median < 50% of ARPS indicates concentration risk

---

#### Revenue Distribution Ratio (Top 20%)
**Formula:** (Revenue from top 20% sellers / Total platform revenue) × 100

**Calculation:**
- Sort sellers by revenue descending
- Calculate top 20% count (ceiling of 20% of total sellers)
- Sum revenue for top 20%
- Divide by total platform revenue

**Business Interpretation:**
- Measures revenue concentration
- Healthy platforms: 40-60% from top 20%
- >70% indicates over-reliance on few sellers
- <30% indicates well-distributed revenue

---

### 2. Growth Indicators

#### Revenue Growth MoM (Month-over-Month)
**Formula:** % of sellers with positive growth = (Sellers with growth / Total sellers) × 100

**Calculation:**
- Group orders by seller and month
- Calculate: (Current month revenue - Previous month revenue) / Previous month revenue
- Count sellers with positive growth
- Divide by total sellers with previous month activity

**Business Interpretation:**
- Percentage of sellers experiencing growth
- >50% indicates healthy platform growth
- <30% suggests market challenges
- Tracks seller momentum and platform health

---

#### Product Velocity
**Formula:** Average of (Total quantity sold / Days since product launch)

**Calculation:**
- For each product: quantity_sold / days_since_creation
- Average across all products
- Higher velocity = faster sales

**Business Interpretation:**
- Measures how quickly products sell
- Indicates product-market fit
- High velocity suggests strong demand
- Low velocity may indicate poor product quality or pricing

---

#### Repeat Buyer Rate
**Formula:** (Buyers with 2+ orders / Total distinct buyers) × 100

**Calculation:**
- Count distinct buyers
- Count buyers with order count > 1
- Divide and multiply by 100

**Business Interpretation:**
- Percentage of buyers making repeat purchases
- >30% indicates strong customer loyalty
- <15% suggests acquisition-focused market
- Key indicator of customer satisfaction

---

### 3. Retention Metrics

#### Seller Retention (90 Days)
**Formula:** (Active sellers at 90 days / Sellers created 90+ days ago) × 100

**Calculation:**
- Find sellers created 90+ days ago
- Check if they have orders or products in last 30 days
- Calculate percentage

**Business Interpretation:**
- Percentage of sellers still active after 90 days
- >60% is healthy
- <40% indicates high seller churn
- Critical for platform sustainability

**Red Flag Threshold:** <60% retention

---

#### Seller Churn Rate (Monthly)
**Formula:** (Sellers inactive this month / Total sellers last month) × 100

**Calculation:**
- Count sellers active in previous month
- Count sellers NOT active in current month
- Divide and multiply by 100

**Business Interpretation:**
- Monthly percentage of sellers leaving
- <7% is healthy
- >10% indicates serious retention issues
- Inverse of retention rate

**Red Flag Threshold:** >7% monthly churn

---

#### Time to First Sale
**Formula:** Average of (First order date - Seller creation date)

**Calculation:**
- For each seller: days between account creation and first order
- Average across all sellers
- Return in days

**Business Interpretation:**
- Average days for seller to make first sale
- <30 days indicates good onboarding
- >60 days suggests onboarding friction
- Affects seller satisfaction and retention

---

### 4. Financial Metrics

#### Payout Time
**Formula:** Average of (Payout completion date - Payout creation date)

**Calculation:**
- For completed payouts: hours between creation and completion
- Average across all completed payouts
- Return in hours

**Business Interpretation:**
- Average hours from order completion to seller wallet availability
- <24 hours is excellent
- 24-48 hours is acceptable
- >48 hours causes seller dissatisfaction

**Red Flag Threshold:** >24 hours

---

#### Withdrawal Processing Time
**Formula:** Same as payout time, filtered by withdrawal method

**Calculation:**
- Filter payouts by withdrawal method
- Calculate average processing time
- Return in hours

**Business Interpretation:**
- Time for sellers to access funds via withdrawal
- Should match or be faster than payout time
- Affects seller cash flow and satisfaction

---

#### Commission Dispute Rate
**Formula:** (Open/In-progress commission disputes / Total orders) × 100

**Calculation:**
- Count support tickets with category in [commission, deduction, payout]
- Filter by status in [OPEN, IN_PROGRESS]
- Divide by total orders
- Multiply by 100 to get per 100 orders

**Business Interpretation:**
- Disputes per 100 orders
- <1 is excellent
- 1-2 is acceptable
- >2 indicates commission transparency issues

**Red Flag Threshold:** >2 per 100 orders

---

### 5. Seller Happiness Signals

#### Product Expansion Rate
**Formula:** (Sellers adding products 30+ days after creation / Total sellers) × 100

**Calculation:**
- Find sellers with first product added 30+ days after account creation
- Count sellers with 2+ products
- Divide by total sellers
- Multiply by 100

**Business Interpretation:**
- Percentage of sellers expanding product catalog
- >30% indicates seller confidence
- <20% suggests sellers not growing
- Indicates platform stickiness

---

#### Seller Referrals
**Formula:** Count of completed referrals by sellers

**Calculation:**
- Count commission_referral records where referrer is a seller
- Filter by status = 'completed'
- Return total count

**Business Interpretation:**
- Number of successful seller referrals
- Indicates seller advocacy
- Higher count = stronger seller network
- Organic growth indicator

---

## Dashboard Structure

### Top Row (Quick Health Check)
- **GMV:** Gross Merchandise Value (last 30 days)
- **Active Sellers:** Sellers with orders in last 30 days
- **ARPS:** Average Revenue Per Seller
- **Repeat Buyer Rate:** Percentage of repeat buyers

### Second Row (Core Metrics)
- **Seller Retention %:** 90-day retention rate
- **Churn %:** Monthly churn rate
- **Median Revenue:** 50th percentile seller revenue
- **Payout Time:** Average hours to payout

### Third Row (Detailed Analytics)
- **Revenue Distribution:** Top 20% vs rest
- **Growth per Seller:** MoM growth distribution
- **Time to First Sale:** Average days
- **Product Velocity Heatmap:** Products by velocity ranges

## Red Flag Detection

The system automatically detects and alerts on:

1. **ARPS Decline >10% WoW** - Severity: HIGH
2. **Churn Rate >7% Monthly** - Severity: HIGH
3. **Median Revenue <50% of ARPS** - Severity: MEDIUM (concentration risk)
4. **Payout Time >24 Hours** - Severity: MEDIUM
5. **Dispute Rate >2 per 100 Orders** - Severity: MEDIUM
6. **Retention <60% at 90 Days** - Severity: CRITICAL
7. **Product Expansion <30%** - Severity: LOW

## Calculation Schedule

- **Hourly:** GMV, Active Sellers, ARPS (real-time)
- **Daily:** Retention, Churn, Time to First Sale
- **Weekly:** Product Velocity, Revenue Distribution
- **Monthly:** MoM Growth Trends, Referral Metrics

## Performance Considerations

1. **Indexing:** Ensure indexes on Order.sellerId, Order.createdAt, Order.status
2. **Aggregation:** Use database-level GROUP BY for efficiency
3. **Caching:** Metrics cached for 1 hour with TTL
4. **Batch Processing:** Calculate all sellers in single query
5. **Incremental Updates:** Only recalculate changed metrics

## API Endpoints

```
GET /analytics/seller-profitability/dashboard
GET /analytics/seller-profitability/dashboard/:sellerId
GET /analytics/seller-profitability/revenue-health?timeWindow=monthly
GET /analytics/seller-profitability/growth-indicators
GET /analytics/seller-profitability/retention
GET /analytics/seller-profitability/financial
GET /analytics/seller-profitability/happiness
GET /admin/dashboard/red-flags
```
