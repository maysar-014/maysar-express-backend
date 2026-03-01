# Catalog Service - Sagas

## ProductPublishingSaga
**Purpose**: Validates and publishes new product listings with catalog matching

**Steps**:
1. **Validate Product Data**
   - Check required fields: title, category, price, variants
   - Timeout: 2s
   - Compensation: None (read-only)

2. **Run Catalog Matching**
   - Call `CatalogMatchingEngine.findMatches(product)`
   - Timeout: 10s
   - Compensation: None (read-only)
   - **Match Confidence**:
     - ≥0.85: Auto-merge with existing product
     - 0.70-0.84: Flag for manual review
     - <0.70: Create new product

3. **Create/Update Product Record**
   - Insert into `Catalog_Product` (new) or link to existing (match)
   - Timeout: 5s
   - Compensation: Delete product record

4. **Create Listing Record**
   - Insert into `Catalog_Listing` with sellerId
   - Timeout: 5s
   - Compensation: Delete listing, delete product (if new)

5. **Trigger Buy-Box Calculation**
   - Call `BuyBoxEngine.computeWinner(productId)`
   - Timeout: 5s
   - Compensation: None (idempotent)

6. **Emit ProductPublished Event**
   - Publish to outbox
   - Timeout: 2s
   - Compensation: Delete listing, delete product

**State Persistence**: `Catalog_SagaLog` table  
**Recovery**: Saga recovery worker polls every 60s  
**Dead-Letter**: After 5 retries → `Catalog_SagaDeadLetter`

**Idempotency**: Publish keyed by `publish-{sellerId}-{productId}`

---

## CampaignLifecycleSaga
**Purpose**: Manages campaign activation, execution, and deactivation

**Steps**:
1. **Validate Campaign Configuration**
   - Check: discount percentage, eligible products, date range
   - Timeout: 2s
   - Compensation: None (read-only)

2. **Apply Campaign Pricing**
   - Update `Catalog_Listing.campaignPrice` for eligible products
   - Timeout: 30s (batch update)
   - Compensation: Revert to original prices

3. **Emit CampaignActivated Event**
   - Publish to outbox
   - Timeout: 2s
   - Compensation: Revert prices

4. **Schedule Campaign Deactivation**
   - Create scheduled job for `endDate`
   - Timeout: 5s
   - Compensation: Cancel scheduled job, revert prices

**Deactivation Steps**:
1. **Revert Campaign Pricing**
   - Update `Catalog_Listing.campaignPrice = NULL`
   - Timeout: 30s
   - Compensation: None (idempotent)

2. **Emit CampaignDeactivated Event**
   - Publish to outbox
   - Timeout: 2s

**Idempotency**: Campaign activation keyed by `campaign-{campaignId}-activate`

---

## BulkProductUpdateSaga
**Purpose**: Handles bulk price updates, stock sync, and catalog maintenance

**Steps**:
1. **Validate Bulk Update Request**
   - Check: product IDs exist, update fields valid
   - Timeout: 5s
   - Compensation: None (read-only)

2. **Batch Update Products**
   - Update `Catalog_Product` or `Catalog_Listing` in batches of 100
   - Timeout: 60s
   - Compensation: Revert to snapshot (stored before update)

3. **Trigger Buy-Box Recalculation**
   - Call `BuyBoxEngine.computeWinner` for each affected product
   - Timeout: 120s (batch processing)
   - Compensation: None (idempotent)

4. **Emit BulkUpdateCompleted Event**
   - Publish to outbox with summary: updated count, failed count
   - Timeout: 2s

**Failure Handling**: Individual product failures logged, batch continues

---

## BuyBoxRecalculationSaga
**Purpose**: Recomputes buy-box winner when listing data changes

**Steps**:
1. **Fetch Eligible Listings**
   - Query: `SELECT * FROM Catalog_Listing WHERE productId = ? AND status = 'ACTIVE'`
   - Timeout: 5s
   - Compensation: None (read-only)

2. **Filter by Availability**
   - Call `BuyBoxEngine.filterEligible(listings)` (checks inventory)
   - Timeout: 10s
   - Compensation: None (read-only)

3. **Compute Winner**
   - Call `BuyBoxEngine.computeWinner(eligibleListings)`
   - Weighted scoring: price 40%, rating, availability, recency
   - Timeout: 5s
   - Compensation: None (read-only)

4. **Update Buy-Box Cache**
   - Redis: `SET buybox:{productId} {winnerListingId} EX 60`
   - Database: `INSERT INTO Catalog_BuyBox ... ON CONFLICT UPDATE`
   - Timeout: 2s
   - Compensation: None (idempotent)

5. **Emit BuyBoxUpdated Event**
   - Publish to outbox
   - Timeout: 2s

**Idempotency**: Recalculation keyed by `buybox-{productId}-{timestamp}`

**Trigger Events**:
- `StockCommitted` (inventory change)
- `SellerRatingUpdated` (rating change)
- `PriceChanged` (price change)
- `ListingActivated` (new competitor)

---

## Common Patterns

### Idempotency Strategy (Phase 2)
- **Product Publish**: `publish-{sellerId}-{productId}`
- **Campaign Activation**: `campaign-{campaignId}-activate`
- **Buy-Box Update**: `buybox-{productId}-{timestamp}`

### Retry Policy (Phase 3)
- **Catalog Matching**: 3 retries (expensive operation)
- **Database Updates**: 5 retries with exponential backoff
- **Buy-Box Computation**: 5 retries (idempotent)

### Batch Processing
- **Bulk Updates**: Process in batches of 100
- **Campaign Pricing**: Update all eligible products in single transaction
- **Buy-Box Warm-Up**: Pre-compute top 1000 products on service start
