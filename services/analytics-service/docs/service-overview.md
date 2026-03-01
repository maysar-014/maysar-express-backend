# Analytics Service - Service Overview

## Purpose
Aggregates business metrics, generates reports, and provides data insights for decision-making.

## Key Domain Concepts

### Metrics Tracked
- GMV, order volume, conversion rates
- Seller performance, enabler productivity
- COD completion rates, fraud rates
- Commission revenue, platform margins

### Reporting
- Real-time dashboards
- Daily/weekly/monthly reports
- Cohort analysis
- Funnel analysis

## Primary Dependencies
- All services (consumes events for analytics)
- Data warehouse (for historical analysis)

## Entry Point
`services/analytics-service/src/index.ts`

## Database Schema
- `Analytics_Metric`: Aggregated metrics
- `Analytics_Report`: Generated reports
- `Analytics_Event`: Raw event log
