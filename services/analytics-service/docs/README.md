# Analytics Service - Documentation Index

## Quick Navigation

### 📋 Start Here
- **[Feature Inventory](./FEATURE_INVENTORY.md)** - Complete list of all 50+ implemented features
- **[Analytics Module Complete](./ANALYTICS_MODULE_COMPLETE.md)** - Full feature overview and data flow

### 🏗️ Architecture & Design
- **[Architecture & Data Modeling](./ARCHITECTURE_AND_DATA_MODELING.md)** - System design with diagrams
- **[Seller Dashboard API](./seller-dashboard-api.md)** - API specifications and examples

### 🔧 Implementation Details
- **[Verification Phase 1](./VERIFICATION_IMPLEMENTATION.md)** - Schema and DTO updates
- **[Verification Phase 2](./VERIFICATION_PHASE2_IMPLEMENTATION.md)** - Authentication and scheduling
- **[Verification Phase 2 Quick Reference](./VERIFICATION_PHASE2_QUICK_REFERENCE.md)** - Quick lookup

---

## Module Overview

The Analytics Service provides comprehensive seller profitability metrics, dashboard insights, and automated metric calculations through:

- **6 Domain Engines** - Business logic for metrics calculation
- **8 Use Cases** - Application layer orchestration
- **6 API Endpoints** - RESTful dashboard interface
- **8 Dashboard Sections** - Complete seller insights
- **5 Database Models** - Optimized data storage
- **3 Scheduled Jobs** - Automated metric computation
- **7 Notification Templates** - Event-driven alerts

---

## Key Features

### 1. Seller Dashboard (8 Sections)
```
✅ Money Snapshot          - Real-time balance & today's sales
✅ Performance Insights    - Sales trend, repeat customers, best product
✅ Action Center           - Restock, conversion, inquiry alerts
✅ Orders                  - Status breakdown
✅ Payout Transparency     - Earnings & commission breakdown
✅ Inventory Health        - Stock status & alerts
✅ Reputation              - Rating, response rate, delivery time
✅ Profitability Score     - 5-component health score (0-100)
```

### 2. Profitability Score (5 Components)
```
✅ Sales Growth (30 pts)        - Month-over-month revenue
✅ Repeat Buyers (20 pts)       - Monthly repeat rate
✅ Response Time (15 pts)       - Support ticket resolution
✅ Order Completion (20 pts)    - Delivered/total ratio
✅ Inventory Stability (15 pts) - In-stock/total ratio
```

### 3. Automated Metrics
```
✅ Every 15 minutes:
   - Calculate repeat customers
   - Identify best performing product
   - Generate sales trend
   - Calculate inventory health
   - Calculate profitability score

✅ Every 30 minutes:
   - Generate action center items
   - Trigger HIGH priority notifications
```

### 4. Security & Authorization
```
✅ JWT Authentication      - Token-based access control
✅ Seller Role Verification - Only sellers can access
✅ Ownership Verification   - Sellers can only access their data
✅ Error Handling          - 401/403 responses for auth failures
```

---

## Architecture Layers

```
┌─────────────────────────────────────────┐
│ API Layer (6 endpoints)                 │
│ - Authentication middleware             │
│ - Authorization middleware              │
│ - SellerDashboardController             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Application Layer (8 use cases)         │
│ - Dashboard orchestration               │
│ - Metric calculations                   │
│ - Data aggregation                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Domain Layer (6 engines)                │
│ - Business logic                        │
│ - Metric formulas                       │
│ - Alert detection                       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Infrastructure Layer                    │
│ - Scheduled jobs (3)                    │
│ - Caching service                       │
│ - Notification service                  │
│ - Database models (5)                   │
└─────────────────────────────────────────┘
```

---

## Data Flow

### Dashboard Request
```
GET /sellers/:sellerId/dashboard
  ↓
authMiddleware (JWT verify)
  ↓
sellerAuthMiddleware (ownership verify)
  ↓
GetSellerDashboardEnhanced (orchestrator)
  ├─ Money Snapshot (real-time)
  ├─ Performance Insights (cached 15 min)
  ├─ Action Center (cached 15 min)
  ├─ Orders (real-time)
  ├─ Payout Transparency (real-time)
  ├─ Inventory Health (cached 15 min)
  ├─ Reputation (real-time)
  └─ Profitability Score (real-time calculation)
  ↓
SellerDashboardDTO (cached 15 min)
```

### Metrics Calculation
```
MetricsScheduler (every 15 min)
  ↓
SellerMetricsCalculationJob
  ├─ CalculateRepeatCustomers
  ├─ IdentifyBestPerformingProduct
  ├─ GenerateSalesTrend
  ├─ CalculateInventoryHealth
  └─ CalculateProfitabilityScore
  ↓
Analytics_SellerMetrics (updated)
Analytics_SellerDailySales (upserted)
Analytics_SellerProductPerformance (upserted)
Analytics_SellerInventoryHealth (upserted)
```

---

## Database Schema

### Core Model
```
Analytics_SellerMetrics
├─ sellerId (PK)
├─ todaySales, thisMonthRevenue, lastMonthRevenue
├─ repeatCustomerRate, bestPerformingProductId
├─ profitabilityScore, averageRating, responseRate
└─ averageDeliveryTime, lastUpdated
```

### Supporting Models
```
Analytics_SellerDailySales
├─ Unique: (sellerId, date)
└─ Index: (sellerId, date)

Analytics_SellerProductPerformance
├─ Unique: (sellerId, productId)
└─ Index: (sellerId, revenue)

Analytics_SellerInventoryHealth
├─ Unique: (sellerId, productId)
└─ Index: (sellerId, stockStatus)

Analytics_SellerActionItem
└─ Index: (sellerId, isResolved, priority)
```

---

## API Endpoints

| Endpoint | Method | Purpose | Auth | Cache |
|----------|--------|---------|------|-------|
| /sellers/:sellerId/dashboard | GET | Complete dashboard | JWT+Seller | 15 min |
| /sellers/:sellerId/dashboard/money-snapshot | GET | Real-time balance | JWT+Seller | 5 min |
| /sellers/:sellerId/dashboard/action-center | GET | Action items | JWT+Seller | 15 min |
| /sellers/:sellerId/dashboard/sales-trend | GET | 7-day sales | JWT+Seller | 15 min |
| /sellers/:sellerId/dashboard/profitability-score | GET | Health score | JWT+Seller | None |
| /action-items/:actionId/resolve | PATCH | Resolve action | JWT | None |

---

## Caching Strategy

| Section | TTL | Invalidation |
|---------|-----|--------------|
| Money Snapshot | 5 min | Order delivery, payout |
| Dashboard (other 7) | 15 min | Order delivery, inventory |
| Profitability Score | None | Real-time calculation |

---

## Notification System

### Templates (7 Total)
```
✅ seller_daily_revenue_update       - Daily earnings
✅ seller_restock_alert              - Low stock
✅ seller_low_conversion_warning     - Poor performance
✅ seller_pending_inquiries          - Customer questions
✅ seller_repeat_customer_milestone  - Loyalty
✅ seller_payout_scheduled           - Payout confirmation
✅ seller_profitability_score_update - Health score
```

### Triggers
```
✅ Order delivery
✅ Payout processing
✅ Inventory updates
✅ Action center generation
✅ Profitability score calculation
```

---

## Performance Optimization

### Database Indexes
```
✅ (sellerId, date) - Daily sales queries
✅ (sellerId, revenue) - Top product queries
✅ (sellerId, stockStatus) - Inventory summaries
✅ (sellerId, isResolved, priority) - Action center
```

### Caching
```
✅ In-memory cache with TTL
✅ Event-driven invalidation
✅ 5-15 minute TTL by section
```

### Query Optimization
```
✅ Database-level aggregations (GROUP BY)
✅ Batch processing for all sellers
✅ Composite unique constraints for upserts
```

---

## Testing Coverage

### Unit Tests
```
✅ IdentifyBestPerformingProduct (5 test cases)
✅ GetSellerDashboardEnhanced (6 test cases)
✅ CalculateProfitabilityScore (component calculations)
```

### Integration Tests
```
✅ Dashboard endpoint with auth
✅ Metrics scheduler execution
✅ Notification template seeding
```

---

## Deployment Checklist

- [x] Prisma migrations applied
- [x] Prisma client regenerated
- [x] JWT middleware configured
- [x] MetricsScheduler started on app startup
- [x] Notification templates seeded
- [x] Cache TTL configured
- [x] Monitoring set up
- [x] Auth middleware tested
- [x] Cross-seller access prevention verified
- [x] Metrics calculation accuracy validated

---

## File Structure

```
services/analytics-service/
├── src/
│   ├── api/
│   │   ├── controllers/SellerDashboardController.ts
│   │   └── routes/sellerDashboardRoutes.ts
│   ├── application/
│   │   ├── dto/seller-dashboard.dto.ts
│   │   └── use-cases/ (8 files)
│   ├── domain/
│   │   └── engines/ (6 files)
│   └── infrastructure/ (6 files)
├── docs/
│   ├── FEATURE_INVENTORY.md (this index)
│   ├── ANALYTICS_MODULE_COMPLETE.md
│   ├── ARCHITECTURE_AND_DATA_MODELING.md
│   ├── seller-dashboard-api.md
│   ├── VERIFICATION_IMPLEMENTATION.md
│   ├── VERIFICATION_PHASE2_IMPLEMENTATION.md
│   └── VERIFICATION_PHASE2_QUICK_REFERENCE.md
└── prisma/
    ├── schema.prisma
    └── migrations/
```

---

## Documentation Map

### For Different Audiences

**Product Managers:**
- Start with [Feature Inventory](./FEATURE_INVENTORY.md)
- Review [Analytics Module Complete](./ANALYTICS_MODULE_COMPLETE.md)

**Backend Developers:**
- Review [Architecture & Data Modeling](./ARCHITECTURE_AND_DATA_MODELING.md)
- Check [Seller Dashboard API](./seller-dashboard-api.md)
- Reference implementation docs for details

**Frontend Developers:**
- Read [Seller Dashboard API](./seller-dashboard-api.md)
- Review response examples
- Check authentication requirements

**DevOps/Infrastructure:**
- Review deployment checklist
- Check database schema
- Monitor scheduled jobs

**QA/Testing:**
- Review test coverage in implementation docs
- Check error handling scenarios
- Validate auth flows

---

## Key Metrics

### Implementation Status
- **Total Features:** 50+
- **Completion:** 100%
- **Test Coverage:** 11+ test cases
- **Documentation:** 7 comprehensive guides

### Performance Targets
- Dashboard response: < 500ms (with caching)
- Metrics job: < 5 minutes
- Cache hit rate: > 80%
- Database queries: Indexed

---

## Common Tasks

### Add a New Dashboard Section
1. Create use case in `src/application/use-cases/`
2. Add to `GetSellerDashboardEnhanced.execute()`
3. Update `SellerDashboardDTO`
4. Add API endpoint if needed
5. Update documentation

### Add a New Metric
1. Create calculation logic in domain engine
2. Create use case in `src/application/use-cases/`
3. Add to `SellerMetricsCalculationJob`
4. Update `Analytics_SellerMetrics` schema
5. Add tests and documentation

### Add a New Notification
1. Create template in `SellerNotificationTemplates.ts`
2. Add trigger in `SellerNotificationTrigger.ts`
3. Update notification service
4. Test template rendering
5. Document in notification system

---

## Troubleshooting

### Metrics Not Calculating
- Verify MetricsScheduler is running
- Check active sellers exist
- Review job execution logs

### Dashboard Showing Stale Data
- Check cache TTL configuration
- Verify cache invalidation triggers
- Monitor database query performance

### Auth Failures
- Verify JWT middleware configuration
- Check token contains `id` and `role`
- Ensure seller ownership verification

---

## Related Services

### Dependencies
- **order-service** - Order data for metrics
- **wallet-service** - Balance and payout data
- **support-service** - Ticket data for response time
- **inventory-service** - Stock data
- **notification-service** - Notification delivery
- **catalog-service** - Product information

### Dependent Services
- **seller-service** - Uses dashboard data
- **mobile-app** - Consumes dashboard API
- **admin-dashboard** - Views seller metrics

---

## Support & Escalation

### For Questions
1. Check relevant documentation
2. Review test files for examples
3. Check implementation files for details

### For Issues
1. Check troubleshooting section
2. Review error logs
3. Verify configuration
4. Contact development team

### For Enhancements
1. Review feature inventory
2. Check future enhancements section
3. Propose new features
4. Follow implementation guidelines

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial implementation |
| 1.1 | 2024-01-15 | Phase 2: Auth & Scheduling |
| 1.2 | 2024-01-15 | Complete documentation |

---

## Last Updated
2024-01-15

## Maintained By
Analytics Service Team

## Contact
For questions or issues, refer to the relevant documentation or contact the development team.
