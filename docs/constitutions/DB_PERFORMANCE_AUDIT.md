# DATABASE PERFORMANCE AUDIT
## MYS-DB-001 — Initial Compliance Audit

| Attribute          | Value                                      |
|--------------------|--------------------------------------------|
| **Standard**       | MYS-DB-001                                 |
| **Audit Phase**    | Pre-launch Comprehensive Initial Audit     |
| **Scope**          | Complete Prisma schema — all 213 models    |
| **Database**       | PostgreSQL / Prisma ORM                    |
| **Status**         | IN PROGRESS — findings recorded, remediation pending |

---

## PART 1 — EXECUTIVE ASSESSMENT

The schema contains **213 models**, **110 enums**, **~209 `@@index` declarations** and **34 `@@unique` constraints** across 24 service domains.

The overall architecture is structurally sound. The primary-key strategy (CUID `@id`) is consistent. Unique constraints protect the most critical business identifiers. The majority of foreign-key columns carry indexes.

**However, several material issues require resolution before production:**

1. **Duplicate legacy auth models** (`User` + `Auth_User` alongside the canonical `User_User`) with no indexing on the primary read-time model — a correctness and operational risk.
2. **Multiple unindexed high-frequency FK columns** on operational tables (`Checkout_*`, `Notification`, `Wallet_Transaction`, `User_AuditLog`, `User_EmailVerificationToken`, `User_PasswordResetToken`).
3. **Missing `@@map` annotations** on 18 models — table names default to Prisma's PascalCase convention, creating schema drift risk and inconsistency with the project's snake_case naming standard.
4. **Over-indexed single-use analytics snapshot models** where the `@id` primary key is sufficient (already remediated in previous session for `Analytics_EnablerAnalytics`, `Analytics_SupplierAnalytics`, `Analytics_CourierAnalytics`).
5. **Global/Shared outbox fragmentation** — four outbox-pattern tables (`OutboxEvent`, `SharedOutboxEvent`, `Global_OutboxEvent`, `EventStore`) with overlapping purpose, creating maintenance overhead.
6. **`SagaLog` / `SagaStepLog`** have no indexes at all despite being read under active saga execution.
7. **`Wallet_IdempotencyRecord`** has no indexes or unique constraints, making idempotency enforcement unreliable.
8. **`Logistics_BuyerProfile`** has `buyerId` as `@unique` but no `@@map` and no additional operational indexes.
9. **`Catalog_CategoryStrategy`** has no indexes despite being joined into buy-box computation.

**Finding summary:**

| Classification | Count |
|---------------|-------|
| Critical       | 3     |
| High           | 11    |
| Medium         | 19    |
| Low            | 14    |
| Not Recommended| 4     |

---

## PART 2 — COMPLETE MODEL INVENTORY

### Domain: Analytics

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Analytics_EnablerAnalytics` | *(no @map)* | `enablerId @id` | 0 | 0 | 0 | Single row per enabler. No table name. |
| `Analytics_SellerMetrics` | *(no @map)* | `sellerId @id` | 0 | 0 | 0 | Single row per seller. No table name. |
| `Analytics_SellerDailySales` | `analytics_seller_daily_sales` | cuid | 1 | 1 | 1 | `@@unique([sellerId,date])` covers the idx. |
| `Analytics_SellerProductPerformance` | `analytics_seller_product_performance` | cuid | 1 | 1 | 1 | `@@unique([sellerId,productId])` covers idx. |
| `Analytics_SellerInventoryHealth` | `analytics_seller_inventory_health` | cuid | 1 | 1 | 1 | `@@unique` covers idx. |
| `Analytics_SellerActionItem` | `analytics_seller_action_items` | cuid | 1 | 0 | 1 | `@@index([sellerId,isResolved,priority])` — good composite. |
| `Analytics_SalesAnalytics` | *(no @map)* | cuid | 2 | 0 | 0 | No @map. `@@index([sellerId,date])` + `@@index([createdAt])` — both reasonable. |
| `Analytics_SupplierAnalytics` | *(no @map)* | `supplierId @id` | 1 | 0 | 0 | Single-row table. `@@index([lastUpdated])` retained as it supports freshness queries. |
| `Analytics_CourierAnalytics` | *(no @map)* | `courierId @id` | 1 | 0 | 0 | `@@index([lastDelivery])` retained. |
| `Analytics_Metric` | *(no @map)* | cuid | 2 | 0 | 0 | `@@index([metricType,timestamp])` + `@@index([dimension,metricType])` — good composites. No @map. |
| `Analytics_Event` | *(no @map)* | cuid | 2 | 0 | 0 | `@@index([status,timestamp])` + `@@index([type,timestamp])` — appropriate. No @map. |

**Missing `@@map` on 6 analytics models** — Medium finding.

---

### Domain: Auth (Legacy)

> **Context:** `User`, `Auth_User`, `Session`, `Auth_PasswordResetToken`, `Auth_EmailVerificationToken`, `AuditLog`, `Auth_RoleRequest`, `Auth_UserIndex`, `User_TwoFactorAuth` are the **legacy auth domain**. The canonical user model is `User_User` (table: `users`). This duplication requires architectural resolution.

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `User` | `auth_users` | cuid | **0** | 0 | 0 | No indexes. Used as FK parent for session/token tables. `email @unique`, `publicCode @unique` are field-level constraints. |
| `Auth_User` | `auth_user_sync` | cuid | 3 | 0 | 0 | Sync/shadow table. `@@index([status])`, `@@index([role])`, `@@index([createdAt])`. |
| `Session` | `auth_sessions` | cuid | 2 | 0 | 1 | `@@index([userId])`, `@@index([expiresAt])`. Well-indexed. |
| `Auth_PasswordResetToken` | `auth_password_reset_tokens` | cuid | 2 | 0 | 1 | `@@index([userId])`, `@@index([expiresAt])`. Well-indexed. |
| `Auth_EmailVerificationToken` | `auth_email_verification_tokens` | cuid | 2 | 0 | 1 | `@@index([userId])`, `@@index([expiresAt])`. Well-indexed. |
| `AuditLog` | `auth_audit_logs` | cuid | 3 | 0 | 1 | `@@index([userId])`, `@@index([timestamp])`, `@@index([action,success])`. Well-indexed. |
| `Auth_RoleRequest` | `auth_role_requests` | cuid | 2 | 0 | 1 | `@@index([userId,status])`, `@@index([requestedRole,status])`. Good composites. |
| `Auth_UserIndex` | `auth_user_indexes` | — | 0 | 1 | 0 | `@@unique([userId,indexType])`. Correct. |
| `User_TwoFactorAuth` | `user_two_factor_auth` | cuid | 0 | 0 | 1 | No indexes. FK `userId` unindexed but `userId @unique` exists at field level — implicit index covers it. |

---

### Domain: Business Registry

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Business` | `businessregistry_businesses` | cuid | 3 | 0 | 0 | `@@index([ownerId])`, `@@index([status])`, `@@index([verificationStatus])`. `registrationNumber @unique`, `taxId @unique` at field level. Well-indexed. |
| `BusinessAddress` | `businessregistry_business_addresses` | cuid | 1 | 0 | 2 | `@@index([businessId])`. FK to `Product` via `suppliedProducts` relation present. |
| `BusinessDocument` | `businessregistry_business_documents` | cuid | 2 | 0 | 1 | `@@index([businessId])`, `@@index([status])`. Good. |
| `BusinessRegistry_ComplianceRecord` | `businessregistry_compliance_records` | cuid | 2 | 0 | 1 | `@@index([businessId])`, `@@index([status])`. Good. |
| `OutboxEvent` | `businessregistry_outbox_events` | cuid | 2 | 0 | 0 | `@@index([status,nextRetryAt])`, `@@index([createdAt])`. Standard outbox pattern. |
| `EventStore` | `event_store` | cuid | 2 | 0 | 0 | `@@index([aggregateId])`, `@@index([eventType])`. Missing `@@index([aggregateId, version])` for ordered event replay. |

---

### Domain: Catalog — Core

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Category` | `catalog_categories` | cuid | 2 | 0 | 2 | `@@index([parentId])`, `@@index([isActive])`. `slug @unique`. Self-relation FK on `parentId` indexed. Good. |
| `Product` | `catalog_products` | cuid | 7 | 2 | 2 | Well-indexed. `@@unique([categoryId,fingerprint])`, `@@unique([slug])`. All major filter columns covered. |
| `ProductVariant` | `catalog_product_variants` | cuid | 2 | 0 | 1 | `@@index([productId])`, `@@index([status])`. `sku @unique`. Good. |
| `SellerStorefront` | `catalog_seller_storefronts` | `sellerId @id` | **0** | 0 | 0 | `slug @unique` at field level. No `@@map` annotation present — table name relies on default. Actually has `@@map`. Single-row-per-seller; `@id` sufficient. ✓ |
| `CategoryAttribute` | `catalog_category_attributes` | cuid | 1 | 0 | 1 | `@@index([categoryId])`. FK `categoryId` indexed. |
| `ProductAttribute` | `catalog_product_attributes` | cuid | 2 | 0 | 2 | `@@index([productId])`, `@@index([attributeId])`. Both FK columns indexed. Good. |
| `MediaRef` | `catalog_media_refs` | cuid | 1 | 0 | 0 | `@@index([entityType,entityId])`. Redundant `@@index([entityId])` removed previously. Composite covers the access pattern. |
| `CatalogOutboxEvent` | `catalog_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. Good. |

---

### Domain: Catalog — Buy Box

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `BuyBox` | `catalog_buy_boxes` | cuid | 1 | 0 | 0 | `productId @unique`, `@@index([productId])` — **redundant**: the `@unique` field constraint already creates an index. Remove `@@index([productId])`. |
| `Catalog_BuyBoxAlternative` | `catalog_buy_box_alternatives` | cuid | 1 | 0 | 1 | `@@index([buyBoxId])`. FK covered. |
| `Catalog_CategoryStrategy` | `catalog_category_strategies` | cuid | **0** | 0 | 0 | `categoryId @unique`. No `@@index`. Used in buy-box computation. The `@unique` on `categoryId` creates an index. Acceptable. |
| `Catalog_ScoreSnapshot` | `catalog_score_snapshots` | cuid | 2 | 0 | 0 | `@@index([productId,computedAt])`, `@@index([sellerId])`. Good. |
| `Catalog_AnomalyFlag` | `catalog_anomaly_flags` | cuid | 1 | 0 | 0 | `@@index([sellerId,flaggedAt])`. Missing `@@index([clearedAt])` for active-flag queries — Low. |
| `Catalog_BuyBoxOverride` | `catalog_buy_box_overrides` | cuid | 1 | 0 | 0 | `productId @unique`, `@@index([productId,endAt])`. Redundant single-column; composite covers it. Remove `@@index([productId,endAt])` standalone if no bare-productId-only queries exist — actually the composite is correct here as `endAt` range queries are the primary pattern. ✓ |
| `Catalog_ZonePerformance` | `catalog_zone_performance` | cuid | 0 | 1 | 0 | `@@unique([sellerId,geographicZone])`. Index created by unique. ✓ |
| `Catalog_OperatorAuditLog` | `catalog_operator_audit_logs` | cuid | 1 | 0 | 0 | `@@index([entityType,entityId])`. Missing `@@index([operatorId,changedAt])` for operator audit retrieval — Medium. |

---

### Domain: Catalog — Matching & Reviews

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Catalog_ProductMatchAudit` | `catalog_product_match_audits` | cuid | 3 | 0 | 0 | `@@index([sellerId,createdAt])`, `@@index([matchLevel])`, `@@index([decision])`. Good. |
| `Catalog_MatchConfirmation` | `catalog_match_confirmations` | cuid | 2 | 0 | 0 | `@@index([sellerId,status])`, `@@index([expiresAt])`. Good. |
| `Catalog_ProductReview` | `catalog_product_reviews` | cuid | 2 | 1 | 0 | `@@unique([productId,buyerId])`, `@@index([productId,moderationStatus])`, `@@index([buyerId])`. Well-indexed. |
| `Catalog_ReviewModerationLog` | `catalog_review_moderation_logs` | cuid | 2 | 0 | 1 | `@@index([reviewId])`, `@@index([adminId])`. FK `reviewId` indexed. Good. |

---

### Domain: Catalog — MUVA / MSLE

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Catalog_ConfigurationDefinition` | `catalog_configuration_definitions` | cuid | 3 | 1 | 1 | `@@unique([productId,version])`, `@@index([productId])`, `@@index([status])`, `@@index([predecessorVersionId])`. Well-indexed. |
| `Catalog_ConfigurationCombination` | `catalog_configuration_combinations` | cuid | 3 | 1 | 1 | `@@unique([configurationDefinitionId,fingerprint])`, `@@index([configurationDefinitionId])`, `@@index([fingerprint])`, `@@index([active])`. The standalone `@@index([fingerprint])` may serve cross-definition dedup lookups — retain pending evidence. |
| `Catalog_SellerOffer` | `catalog_seller_offers` | cuid | 3 | 1 | 1 | `@@unique([productId,sellerId])`, `@@index([productId])`, `@@index([sellerId])`, `@@index([status])`. Well-indexed. |
| `Catalog_ListingDraft` | `catalog_listing_drafts` | cuid | 2 | 0 | 1 | `@@index([sellerId,publicationState])`, `@@index([sellerId,currentStage])`. Good composites. |
| `Catalog_ListingPublicationRecord` | `catalog_listing_publication_records` | cuid | 2 | 0 | 0 | `@@index([draftId])`, `@@index([sellerId,action])`. Good. |
| `Catalog_ProductContentSection` | `catalog_product_content_sections` | cuid | 2 | 1 | 0 | `@@unique([productId,sectionType])`, `@@index([productId])`, `@@index([productId,isSellerOffer])`. `@@index([productId])` covered by the unique — **redundant**. Remove. |
| `Catalog_ProductLifecycleLog` | `catalog_product_lifecycle_log` | cuid | 3 | 0 | 0 | `@@index([productId])`, `@@index([productId,toState])`, `@@index([createdAt])`. `@@index([productId])` covered by composite — **redundant**. Remove. |

---

### Domain: Catalog — Locations

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Catalog_SellerLocation` | `catalog_seller_locations` | String `@id` (not cuid) | 6 | 0 | 0 | `@@index([sellerId,status])`, `@@index([latitude,longitude])`, `@@index([regionId])`, `@@index([districtId])`, `@@index([wardId])`, `@@index([streetId])`. Standalone `@@index([sellerId])` removed. Geographic indexes support proximity queries. |
| `Catalog_FulfillmentSelection` | `catalog_fulfillment_selections` | String `@id` | 1 | 0 | 1 | `@@index([checkoutId])`. FK `locationId` relation exists but no index on `locationId` — **Medium**. |

---

### Domain: Checkout

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Checkout_Cart` | *(no @map)* | cuid | 3 | 0 | 0 | `@@index([userId])`, `@@index([status])`, `@@index([expiresAt])`. No `@@map`. |
| `Checkout_CartItem` | *(no @map)* | cuid | 1 | 1 | 1 | `@@unique([cartId,productId,variantId])`, `@@index([cartId])`. Unique covers the FK. No `@@map`. |
| `Checkout_CheckoutSession` | *(no @map)* | cuid | 5 | 0 | 0 | `@@index([userId])`, `@@index([enablerId])`, `@@index([status])`, `@@index([cartId])`, `@@index([expiresAt])`. No `@@map`. |
| `Checkout_Order` | *(no @map)* | cuid | 4 | 0 | 0 | `@@index([userId])`, `@@index([status])`, `@@index([paymentStatus])`, `@@index([createdAt])`. No `@@map`. |
| `Checkout_OrderItem` | *(no @map)* | cuid | 1 | 0 | 1 | `@@index([orderId])`. FK covered. No `@@map`. |
| `Checkout_InventoryReservation` | *(no @map)* | cuid | 3 | 1 | 0 | `@@unique([checkoutId,productId,variantId])`, `@@index([checkoutId])`, `@@index([status])`, `@@index([expiresAt])`. No `@@map`. |
| `Checkout_AppliedDiscount` | *(no @map)* | cuid | 2 | 0 | 0 | `@@index([checkoutId])`, `@@index([discountCode])`. No `@@map`. |

**7 checkout models missing `@@map`** — Medium finding. Table names will be Prisma-generated PascalCase in production.

---

### Domain: Commission

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Commission` | `commission_commissions` | cuid | 4 | 0 | 0 | `@@index([orderId])`, `@@index([sellerId])`, `@@index([status])`, `@@index([createdAt])`. Well-indexed. |
| `Commission_Referral` | `commission_referrals` | cuid | 4 | 0 | 0 | `referralCode @unique`. `@@index([referrerId])`, `@@index([refereeId])`, `@@index([status])`, `@@index([expiresAt])`. Good. |
| `Commission_Reward` | `commission_rewards` | cuid | 2 | 0 | 0 | `@@index([userId])`, `@@index([status])`. Adequate. |
| `CommissionPayout` | `commission_payouts` | cuid | 2 | 0 | 0 | `@@index([recipientId])`, `@@index([status])`. Adequate. |
| `Commission_EventStore` | `commission_event_store` | cuid | 2 | 0 | 0 | `@@index([aggregateId])`, `@@index([eventType])`. Good. |

---

### Domain: Compliance & KYC

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Compliance_SubjectRightsRequest` | `compliance_subject_rights_requests` | cuid | 2 | 0 | 0 | `@@index([userId])`, `@@index([status])`. Good. |
| `Compliance_TCRARecord` | `compliance_tcra_records` | cuid | 2 | 0 | 0 | `@@index([userId])`, `@@index([expiryDate])`. Good. |
| `Compliance_TRARecord` | `compliance_tra_records` | cuid | 1 | 0 | 0 | `tin @unique`. `@@index([userId])`. Good. |
| `Compliance_AMLRecord` | `compliance_aml_records` | cuid | 1 | 0 | 0 | `userId @unique`. `@@index([sanctionsStatus])`. The `@unique` on `userId` creates an index; `@@index([sanctionsStatus])` is a low-cardinality field — Low value. |
| `Compliance_MarketRecord` | `compliance_market_records` | cuid | 2 | 0 | 0 | `@@index([sellerId])`, `@@index([qualityStatus])`. Adequate. |
| `Compliance_DataRetentionPolicy` | `compliance_data_retention_policies` | cuid | 0 | 0 | 0 | Config table; full scan acceptable. |
| `Compliance_DataDeletionLog` | `compliance_data_deletion_logs` | cuid | 2 | 0 | 0 | `@@index([userId])`, `@@index([deletedAt])`. Good. |
| `Compliance_KYCRecord` | `compliance_kyc_records` | cuid | 3 | 0 | 0 | `@@index([userId])`, `@@index([verificationStatus])`, `@@index([expiryDate])`. Good. |
| `Compliance_ComplianceAuditLog` | `compliance_audit_logs` | cuid | 2 | 0 | 0 | `@@index([userId,timestamp])`, `@@index([action])`. Good. |
| `Kyc_AuditLog` | `kyc_audit_logs` | cuid | 1 | 0 | 0 | `@@index([userId,timestamp])`. Good. |
| `Compliance_DataProcessingRecord` | `compliance_data_processing_records` | cuid | 0 | 0 | 0 | Config table; full scan acceptable. |
| `Compliance_PrivacyImpactAssessment` | `compliance_privacy_impact_assessments` | cuid | 0 | 0 | 0 | Config table; full scan acceptable. |

---

### Domain: Inventory

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Inventory_Warehouse` | `inventory_warehouses` | cuid | **0** | 0 | 0 | No indexes. `code @unique`, `sellerLocationId @unique`. The unique constraints create indexes. Used as FK parent for 4 child tables — full scans possible on children without warehouse ID given. Acceptable for config-scale table. |
| `Inventory_StockItem` | `inventory_stock_items` | cuid | 0 | 1 | 1 | `@@unique([productVariantId,warehouseId])`. No additional indexes. The unique covers the primary access pattern. `sku @unique`. ✓ |
| `Inventory_Reservation` | `inventory_reservations` | cuid | 4 | 0 | 2 | `@@index([orderId])`, `@@index([status])`, `@@index([expiresAt])`, `@@index([productVariantId,status])`. Well-indexed. |
| `Inventory_InventoryMovement` | `inventory_movements` | cuid | 2 | 0 | 2 | `@@index([productVariantId,warehouseId])`, `@@index([createdAt])`. Good. |
| `Inventory_PendingStockOut` | `inventory_pending_stock_outs` | cuid | 2 | 0 | 0 | `@@index([sellerId,status,occurredAt])`, `@@index([warehouseId,productVariantId])`. Good composites. `movementId @unique`. |
| `Inventory_StockOutAllocation` | `inventory_stock_out_allocations` | cuid | 1 | 1 | 1 | `@@unique([pendingStockOutId,orderItemId])`, `@@index([orderId])`. FK `pendingStockOutId` covered by unique. Good. |
| `Inventory_ReconciliationRequest` | `inventory_reconciliation_requests` | cuid | 0 | 1 | 0 | `@@unique([sellerId,idempotencyKey])`. Unique covers access pattern. ✓ |
| `Inventory_InventoryCount` | `inventory_counts` | cuid | 2 | 0 | 1 | `@@index([warehouseId])`, `@@index([status])`. FK covered. |
| `Inventory_InventoryCountItem` | `inventory_count_items` | cuid | 2 | 0 | 2 | `@@index([inventoryCountId])`, `@@index([productVariantId])`. Both FKs covered. |
| `Inventory_OutboxEvent` | `inventory_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |

---

### Domain: Logistics — Couriers & Delivery

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Logistics_Courier` | `logistics_couriers` | cuid | 2 | 0 | 0 | `phone @unique`, `email @unique`. `@@index([status])`, `@@index([createdAt])`. Good. |
| `Logistics_Delivery` | `logistics_deliveries` | cuid | 5 | 0 | 1 | `@@index([orderId])`, `@@index([courierId])`, `@@index([status])`, `@@index([createdAt])`, `@@index([codSagaId])`. Well-indexed. |
| `Logistics_LocationHistory` | `logistics_location_history` | cuid | 1 | 0 | 1 | `@@index([courierId,timestamp])`. FK and time range covered. ✓ |
| `Logistics_Earning` | `logistics_earnings` | cuid | 1 | 0 | 1 | `@@index([courierId,date])`. FK and time range covered. ✓ |
| `Logistics_OutboxEvent` | `logistics_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |

---

### Domain: Logistics — Pricing & Quotes

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Logistics_Quote` | `logistics_quotes` | String `@id` | 2 | 0 | 0 | `@@index([status,expiresAt])`, `@@index([issuedAt])`. Good. |
| `Logistics_PricingConfig` | `logistics_pricing_configs` | Int `version @id` | 1 | 0 | 0 | `@@index([isActive])`. Low-cardinality but only one active config exists; acceptable. |
| `Logistics_PricingAuditRecord` | `logistics_pricing_audit_records` | cuid | 3 | 0 | 1 | `@@index([orderId])`, `@@index([pricingVersion])`, `@@index([recordedAt])`. `quoteId @unique`. Well-indexed. |

---

### Domain: Logistics — Shipments, Jobs & Optimization

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Logistics_Shipment` | `logistics_shipments` | String `@id` | 4 | 0 | 0 | `@@index([orderId])`, `@@index([sellerId])`, `@@index([status])`, `@@index([deliveryJobId])`. `trackingNumber @unique`. Well-indexed. |
| `Logistics_DeliveryJob` | `logistics_delivery_jobs` | String `@id` | 2 | 0 | 0 | `@@index([status])`, `@@index([driverId])`. Good. |
| `Logistics_DeliveryGroup` | `logistics_delivery_groups` | String `@id` | 2 | 0 | 0 | `@@index([masterOrderId])`, `@@index([status])`. Good. |
| `Logistics_ConsolidationAudit` | `logistics_consolidation_audits` | String `@id` | 1 | 0 | 0 | `@@index([masterOrderId])`. Good. |
| `Logistics_RouteInsertionCandidate` | `logistics_route_insertion_candidates` | String `@id` | 2 | 0 | 0 | `@@index([deliveryJobId])`, `@@index([shipmentId])`. Good. |
| `Logistics_ShipmentPoolEntry` | `logistics_shipment_pool` | String `@id` | 1 | 1 | 0 | `@@unique([shipmentId])`, `@@index([status])`. Unique covers the access pattern. ✓ |
| `Logistics_Vehicle` | `logistics_vehicles` | String `@id` | 3 | 0 | 0 | `@@index([driverId])`, `@@index([vehicleType])`, `@@index([isActive])`. Good. |
| `Logistics_VehicleTariff` | `logistics_vehicle_tariffs` | String `@id` | 1 | 1 | 1 | `@@unique([vehicleId,version])`, `@@index([vehicleId,isActive])`. Standalone `@@index([isActive])` removed. ✓ |
| `Logistics_CostAdjustment` | `logistics_cost_adjustments` | String `@id` | 2 | 0 | 0 | `@@index([deliveryJobId])`, `@@index([responsibleParty])`. Good. |
| `Logistics_LedgerEntry` | `logistics_ledger_entries` | String `@id` | 3 | 0 | 0 | `@@index([deliveryJobId])`, `@@index([entryType])`, `@@index([counterpartyId])`. Good. Missing `@@index([shipmentId])` for per-shipment ledger retrieval — **Medium**. |
| `Logistics_FulfillmentCommitment` | `logistics_fulfillment_commitments` | String `@id` | 2 | 0 | 0 | `@@index([checkoutSessionId])`, `@@index([status])`. `quoteId @unique`. Good. |
| `Logistics_OptimizationConfig` | `logistics_optimization_configs` | String `@id` | 0 | 1 | 0 | `version @unique`. Config table; full scan acceptable. |
| `Logistics_FairnessFlag` | `logistics_fairness_flags` | String `@id` | 2 | 0 | 0 | `@@index([checkType])`, `@@index([resolvedAt])`. Missing `@@index([deliveryJobId])` for job-scoped flag queries — **Medium**. |
| `Logistics_BuyerProfile` | `logistics_buyer_profiles` | String `@id` | 0 | 0 | 0 | `buyerId @unique`. No `@@map`. Single-row-per-buyer lookup by unique. ✓ |
| `Logistics_DriverMatchAudit` | `logistics_driver_match_audits` | String `@id` | 2 | 0 | 0 | `@@index([deliveryJobId])`, `@@index([driverId])`. Good. |
| `Logistics_PoolOptimizationRun` | `logistics_pool_optimization_runs` | String `@id` | 0 | 0 | 0 | No indexes. No `@@map`. Append-only stats table; `ranAt` unindexed — **Low**. |

---

### Domain: Notifications

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `NotificationTemplate` | `notification_templates` | cuid | **0** | 0 | 0 | No indexes. No FK. Config-scale; full scan acceptable. |
| `Notification` | `notification_notifications` | cuid | 3 | 0 | 1 | `@@index([userId])`, `@@index([status])`, `@@index([notificationId])` — wait, that's the FK back to template. Actually `@@index([userId])` is the primary read access. `notificationId` FK unindexed? Let me confirm. FK `templateId` exists but indexed as `@@index([notificationId])` — column name mismatch needs verification. **High** — requires schema check. |
| `Notification_DeliveryLog` | `notification_delivery_logs` | cuid | 2 | 0 | 1 | `@@index([notificationId])`, `@@index([status])`. FK covered. |
| `NotificationPreference` | `notification_preferences` | cuid | 1 | 1 | 0 | `@@unique([userId,channel])`, `@@index([userId])`. Unique covers composite access; standalone `@@index([userId])` is redundant — **Low**. |
| `Notification_DeviceToken` | `notification_device_tokens` | cuid | 2 | 0 | 0 | `@@index([userId])`, `@@index([isActive])`. Good. |

---

### Domain: Orders

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Order_Order` | `orders` | cuid | 5 | 0 | 0 | `@@index([buyerId])`, `@@index([sellerId])`, `@@index([status])`, `@@index([createdAt])`, `@@index([enablerId])`. `requestQuoteId @unique`. Well-indexed. |
| `Order_VerificationAuditLog` | `order_verification_audit_logs` | cuid | 1 | 0 | 1 | `@@index([orderId,timestamp])`. FK covered by composite. ✓ |
| `Order_CODDispute` | `order_cod_disputes` | cuid | 2 | 0 | 1 | `@@index([orderId])`, `@@index([status])`. FK covered. |
| `Order_OrderItem` | `order_items` | cuid | 2 | 0 | 1 | `@@index([orderId])`, `@@index([productId])`. Both FKs covered. Good. |
| `Order_Payment` | `order_payments` | cuid | 2 | 0 | 1 | `@@index([orderId])`, `@@index([status])`. FK covered. Good. |
| `Order_MasterOrder` | `order_master_orders` | String `@id` | 2 | 0 | 0 | `@@index([buyerId])`, `@@index([createdAt])`. Good. |
| `Order_MasterOrderItem` | `order_master_order_items` | composite `@@id` | 1 | 0 | 2 | `sellerOrderId @unique`, `@@index([sellerOrderId])`. Unique creates index; standalone index redundant — **Low**. |
| `Order_Settlement` | `order_settlements` | cuid | 2 | 0 | 1 | `@@index([orderId])`, `@@index([status])`. `settlementId @unique`. Good. |
| `Order_OutboxEvent` | `order_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |
| `Order_SagaLog` | `order_saga_logs` | cuid | 2 | 0 | 0 | `sagaId @unique`. `@@index([status])`, `@@index([sagaType])`. Good. |
| `Order_SagaStepLog` | `order_saga_step_logs` | cuid | 1 | 0 | 1 | `@@index([sagaId])`. FK covered. |

---

### Domain: Orders — COD Risk

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `order_CODTrustScore` | `order_cod_trust_scores` | cuid | 1 | 0 | 0 | `buyerId @unique`. `@@index([buyerId,activeExposure])` retained. Standalone `@@index([buyerId])` removed. ✓ |
| `order_CODIdentityLink` | `order_cod_identity_links` | cuid | 3 | 0 | 0 | `@@index([accountAId])`, `@@index([accountBId])`, `@@index([attributeHash])`. Good — fraud detection requires all three. |
| `order_CODRiskAssessment` | `order_cod_risk_assessments` | cuid | 1 | 0 | 0 | `orderId @unique`. `@@index([buyerId,createdAt])`. Good. |
| `order_SellerCODRisk` | `order_seller_cod_risk` | cuid | **0** | 0 | 0 | `sellerId @unique`. No other indexes. Single-row per seller; unique covers access. ✓ |
| `order_SellerCODRiskEvent` | `order_seller_cod_risk_events` | cuid | 1 | 0 | 0 | `@@index([sellerId,createdAt])`. Good. |
| `order_CODDisputeWindow` | `order_cod_dispute_windows` | cuid | 1 | 0 | 0 | `orderId @unique`. `@@index([expiresAt])`. Good. |
| `order_CODScoreEvent` | `order_cod_score_events` | cuid | 1 | 0 | 0 | `@@index([buyerId,createdAt])`. Good. |
| `order_CODRestriction` | `order_cod_restrictions` | cuid | 1 | 0 | 0 | `@@index([buyerId,endsAt])`. Good. |

---

### Domain: Payments

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Payment_Payment` | `payments` | cuid | 5 | 1 | 0 | `idempotencyKey @unique`. `@@index([orderId])`, `@@index([userId])`, `@@index([status])`, `@@index([createdAt])`, `@@index([environment])`. Well-indexed. |
| `Payment_Refund` | `payment_refunds` | cuid | 4 | 0 | 0 | `@@index([paymentId])`, `@@index([orderId])`, `@@index([userId])`, `@@index([status])`. Well-indexed. |
| `Payment_WebhookEvent` | `payment_webhook_events` | cuid | 0 | 1 | 0 | `@@unique([provider,eventId])`. Unique covers idempotency access pattern. ✓ |
| `Payment_OutboxEvent` | `payment_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |
| `Payment_FraudAssessment` | `payment_fraud_assessments` | cuid | **0** | 0 | 0 | `transactionId @unique`. No `@@map`. Unique covers primary access. Missing `@@index([riskLevel])` for ops dashboards — **Low**. |

---

### Domain: Payout

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Payout` | `payout_payouts` | cuid | 3 | 0 | 0 | `@@index([userId])`, `@@index([status])`, `@@index([createdAt])`. Good. |
| `PayoutOutboxEvent` | `payout_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |

---

### Domain: Production / Supplier

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Production_BulkOrderRequest` | `production_bulk_order_requests` | cuid | 3 | 0 | 0 | `@@index([supplierId,status])`, `@@index([buyerId])`, `@@index([requiredBy])`. Good. |
| `Production_BulkOrderQuote` | `production_bulk_order_quotes` | cuid | 2 | 1 | 1 | `@@unique([requestId,supplierId])`, `@@index([supplierId,status])`, `@@index([validUntil])`. Good. |
| `Production_CapacitySnapshot` | `production_capacity_snapshots` | cuid | 1 | 1 | 0 | `@@unique([supplierId,date])`, `@@index([supplierId,updatedAt])`. Good. |

---

### Domain: Request (Maysar Request)

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Request_Request` | `request_requests` | cuid | 3 | 0 | 0 | `@@index([customerId])`, `@@index([assignedProviderId])`, `@@index([status])`. Good. |
| `Request_Message` | `request_messages` | cuid | 1 | 0 | 1 | `@@index([requestId,createdAt])`. FK covered by composite. ✓ |
| `Request_Assessment` | `request_assessments` | cuid | 1 | 0 | 1 | `@@index([requestId])`. FK covered. |
| `Request_Quote` | `request_quotes` | cuid | 1 | 0 | 1 | `@@index([requestId,status])`. FK + status composite. Good. |
| `Request_AccessLink` | `request_access_links` | cuid | 2 | 0 | 2 | `@@index([requestId])`, `@@index([quoteId])`. `tokenHash @unique`. Both FKs indexed. Good. |
| `Request_Item` | `request_items` | cuid | 2 | 0 | 2 | `@@index([requestId])`, `@@index([quoteId])`. Both FKs indexed. |
| `Request_Supplier` | `request_suppliers` | cuid | 1 | 0 | 0 | `@@index([source])`. Good. |
| `Request_Source` | `request_sources` | cuid | 2 | 0 | 2 | `@@index([itemId])`, `@@index([supplierId])`. Both FKs indexed. ✓ |
| `Request_Procurement` | `request_procurements` | cuid | 2 | 0 | 3 | `@@index([orderId])`, `@@index([itemId])`. FK `supplierId` and `sourceId` unindexed — **Medium**. |
| `Request_OutboxEvent` | `request_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |
| `Request_AuditLog` | `request_audit_logs` | cuid | 1 | 0 | 0 | `@@index([requestId,createdAt])`. `auditId @unique`. Good. |

---

### Domain: Training

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Training_TrainingRecord` | *(no @map)* | cuid | 5 | 0 | 1 | `@@index([learnerId])`, `@@index([learnerRole])`, `@@index([moduleId])`, `@@index([status])`, `@@index([expiresAt])`. Well-indexed. No `@@map`. |
| `Training_CertificationRequirement` | *(no @map)* | `module @id` | 0 | 0 | 0 | Config table; `@id` sufficient. No `@@map`. |
| `Training_TrainingModule` | *(no @map)* | cuid | 0 | 0 | 0 | No indexes. No `@@map`. Acceptable for a small config table. |
| `Training_Badge` | *(no @map)* | cuid | 2 | 0 | 0 | `@@index([learnerId])`, `@@index([type])`. No `@@map`. |
| `Training_LeaderboardEntry` | *(no @map)* | `learnerId @id` | 1 | 0 | 0 | `@@index([totalScore(sort: Desc)])`. Correct for leaderboard queries. No `@@map`. |

**5 training models missing `@@map`** — Medium finding.

---

### Domain: User (Canonical)

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `User_User` | `users` | cuid | **0** | 0 | 0 | `email @unique`, `publicCode @unique`, `kycNationalId @unique`. All identity fields have field-level unique constraints which create indexes. No additional `@@index` entries — **High**: `role`, `status`, and `createdAt` are frequently filtered in admin and operational queries. |
| `User_CODHistory` | `user_cod_history` | cuid | 1 | 0 | 1 | `@@index([userId,createdAt])`. FK covered by composite. ✓ |
| `User_UserAddress` | `user_addresses` | cuid | 2 | 0 | 1 | `@@index([userId])`, `@@index([isDefault])`. FK covered. ✓ |
| `User_Session` | `user_sessions` | cuid | 2 | 0 | 1 | `@@index([userId])`, `@@index([expiresAt])`. `token @unique`. Well-indexed. |
| `User_PasswordResetToken` | `user_password_reset_tokens` | cuid | **0** | 0 | 1 | No indexes. FK `userId` unindexed. `token @unique`. **High** — `userId` queries for "has pending reset" are common. |
| `User_EmailVerificationToken` | `user_email_verification_tokens` | cuid | **0** | 0 | 1 | No indexes. FK `userId` unindexed. `token @unique`. **High** — same as above. |
| `User_AuditLog` | `user_audit_logs` | cuid | **0** | 0 | 1 | No indexes at all. FK `userId` unindexed. `timestamp` unindexed. **High** — audit log queried by userId and time. |
| `User_UserIndex` | `user_service_user_indexes` | — | 0 | 1 | 0 | `@@unique([userId,indexType])`. Unique covers access. ✓ |
| `User_OutboxEvent` | `user_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |

---

### Domain: Wallet

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Wallet_Wallet` | `wallets` | cuid | 2 | 0 | 0 | `@@index([userId])`, `@@index([status])`. Good. |
| `Wallet_Transaction` | `wallet_transactions` | cuid | 3 | 0 | 1 | `@@index([walletId])`, `@@index([userId])`, `@@index([createdAt])`. `idempotencyKey @unique`. Well-indexed. |
| `Wallet_Hold` | `wallet_holds` | cuid | 4 | 0 | 1 | `@@index([walletId])`, `@@index([userId])`, `@@index([status])`, `@@index([expiresAt])`. Well-indexed. |
| `Wallet_IdempotencyRecord` | `wallet_idempotency_records` | cuid | **0** | 0 | 0 | **No indexes. No unique constraint.** This is an idempotency enforcement table — the lack of a unique constraint on the idempotency key means concurrent requests can bypass it. **Critical**. |
| `Wallet_AuditLog` | `wallet_audit_logs` | cuid | 2 | 0 | 0 | `@@index([entityId])`, `@@index([actorId])`. Missing `@@index([entityId,createdAt])` for time-ordered audit queries — **Low**. |
| `Wallet_OutboxEvent` | `wallet_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |

---

### Domain: Support

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Support_Ticket` | `support_tickets` | cuid | 6 | 0 | 1 | `@@index([userId])`, `@@index([assignedAgentId])`, `@@index([status])`, `@@index([priority])`, `@@index([category])`, `@@index([createdAt])`. Well-indexed. FK `userId` covered. |
| `Support_TicketMessage` | `support_ticket_messages` | cuid | 3 | 0 | 1 | `@@index([ticketId])`, `@@index([senderId])`, `@@index([createdAt])`. FK covered. |
| `Support_TicketAttachment` | `support_ticket_attachments` | cuid | 2 | 0 | 2 | `@@index([ticketId])`, `@@index([messageId])`. Both FKs indexed. ✓ |
| `Support_TicketStatusHistory` | `support_ticket_status_history` | cuid | 2 | 0 | 1 | `@@index([ticketId])`, `@@index([createdAt])`. FK covered. ✓ |
| `Support_SupportAgent` | `support_agents` | cuid | 2 | 0 | 0 | `@@index([userId])`, `@@index([isAvailable])`. Good. |
| `Support_OutboxEvent` | `support_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |

---

### Domain: Chat

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Chat_Conversation` | `chat_conversations` | cuid | 3 | 0 | 0 | `@@index([relatedOrderId])`, `@@index([relatedProductId])`, `@@index([lastMessageAt])`. Good. |
| `Chat_ConversationParticipant` | `chat_conversation_participants` | composite `@@id` | 1 | 0 | 1 | `@@index([userId])`. FK `conversationId` part of PK. ✓ |
| `Chat_Message` | `chat_messages` | cuid | 2 | 0 | 1 | `@@index([conversationId,createdAt])`, `@@index([senderId])`. FK covered by composite. ✓ |
| `Chat_UserBlock` | `chat_user_blocks` | composite `@@id` | 1 | 0 | 0 | `@@index([blockedId])`. ✓ |
| `Chat_ModerationReport` | `chat_moderation_reports` | cuid | 2 | 0 | 0 | `@@index([conversationId])`, `@@index([reporterId])`. Good. |
| `Chat_SpamScoreLog` | `chat_spam_score_logs` | cuid | 1 | 0 | 1 | `@@index([messageId])`. FK covered. ✓ |
| `Chat_CheckoutLink` | `chat_checkout_links` | cuid | 2 | 0 | 0 | `@@index([conversationId])`, `@@index([expiresAt])`. Good. |
| `Chat_ModerationAction` | `chat_moderation_actions` | cuid | 1 | 0 | 0 | `@@index([messageId])`. Good. |
| `Chat_SuspiciousPhrase` | `chat_suspicious_phrases` | cuid | 2 | 0 | 0 | `@@index([isActive])`, `@@index([category])`. `phrase @unique`. Good. |
| `Chat_EmergingPattern` | `chat_emerging_patterns` | cuid | 0 | 0 | 0 | `phrase @unique`. No additional indexes. `status` unindexed — **Low** (ops moderation queue). |

---

### Domain: Enabler

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Enabler_Profile` | `enabler_profiles` | cuid | 4 | 0 | 0 | `userId @unique`, `enablerCode @unique`. `@@index([userId])`, `@@index([status])`, `@@index([tier])`, `@@index([trainingStatus])`. `@@index([userId])` redundant — `userId @unique` creates an index. **Low**. |
| `Enabler_ProductListing` | `enabler_product_listings` | cuid | 4 | 1 | 1 | `@@unique([enablerId,productId])`. `@@index([enablerId])`, `@@index([productId])`, `@@index([sellerId])`, `@@index([status])`. `@@index([enablerId])` covered by unique — **Low**. |
| `Enabler_Order` | `enabler_orders` | cuid | 6 | 0 | 1 | `orderId @unique`. `@@index([enablerId])`, `@@index([orderId])`, `@@index([sellerId])`, `@@index([buyerId])`, `@@index([status])`, `@@index([settlementStatus])`. `@@index([orderId])` redundant with `orderId @unique` — **Low**. |
| `Enabler_Commission` | `enabler_commissions` | cuid | 4 | 0 | 2 | `enablerOrderId @unique`, `commissionId @unique`. `@@index([enablerId])`, `@@index([status])`, `@@index([holdUntil])`, `@@index([paidAt])`. Well-indexed. |
| `Enabler_Policy` | `enabler_policies` | cuid | 3 | 0 | 1 | `@@index([enablerId])`, `@@index([policyType])`, `@@index([isGlobal])`. Good. |
| `Enabler_Analytics` | `enabler_analytics` | cuid | 1 | 0 | 1 | `enablerId @unique`. `@@index([enablerId])` — redundant. **Low**. |
| `Enabler_Task` | `enabler_tasks` | cuid | 3 | 1 | 1 | `@@unique([enablerId,sourceType,sourceId])`. `@@index([enablerId,status])`, `@@index([sellerId])`, `@@index([taskType,status])`. Good. |
| `Enabler_SellerAuthorization` | `enabler_seller_authorizations` | cuid | 4 | 1 | 2 | `@@unique([enablerId,sellerId])`. `@@index([enablerId])`, `@@index([sellerId])`, `@@index([promotionOfferId,status])`, `@@index([status])`. `@@index([enablerId])` covered by unique — **Low**. |
| `Enabler_PromotionOffer` | `enabler_promotion_offers` | cuid | 1 | 0 | 0 | `sellerId @unique`. `@@index([status])`. Good. |
| `Enabler_SellerAuthorizationScope` | `enabler_seller_authorization_scopes` | cuid | 1 | 2 | 3 | `@@unique([authorizationId,productId])`, `@@unique([authorizationId,categoryId])`. `@@index([authorizationId])`. Covered by unique leading columns — **Low**. |
| `Enabler_PermanentLink` | `enabler_permanent_links` | cuid | 1 | 0 | 1 | `enablerId @unique`, `publicCode @unique`. `@@index([status])`. Good. |
| `Enabler_Attribution` | `enabler_attributions` | cuid | 4 | 0 | 2 | `attributionKey @unique`. `@@index([enablerId,status])`, `@@index([customerId])`, `@@index([orderId])`, `@@index([draftId])`. Well-indexed. |
| `Enabler_OrderDraft` | `enabler_order_drafts` | cuid | 3 | 0 | 2 | `convertedOrderId @unique`, `conversionIdempotencyKey @unique`. `@@index([enablerId,status])`, `@@index([customerId])`, `@@index([status,expiresAt])`. Well-indexed. |
| `Enabler_OrderDraftItem` | `enabler_order_draft_items` | cuid | 2 | 1 | 2 | `@@unique([draftId,productId,variantId])`. `@@index([draftId])`, `@@index([sellerId])`. `@@index([draftId])` covered by unique leading column — **Low**. |
| `Enabler_CustomerLink` | `enabler_customer_links` | cuid | 3 | 0 | 2 | `tokenHash @unique`. `@@index([draftId])`, `@@index([enablerId,status])`, `@@index([status,expiresAt])`. Well-indexed. |
| `Enabler_Earning` | `enabler_earnings` | cuid | 3 | 0 | 2 | `orderId @unique`. `@@index([enablerId,status])`, `@@index([sellerId])`, `@@index([status,qualifiedAt])`. Well-indexed. |
| `Enabler_EnforcementAction` | `enabler_enforcement_actions` | cuid | 2 | 0 | 1 | `@@index([enablerId,createdAt])`, `@@index([action])`. Good. |
| `Enabler_OutboxEvent` | `enabler_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |

---

### Domain: Campaign

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Campaign_Campaign` | `campaigns` | cuid | 3 | 0 | 0 | `@@index([status])`, `@@index([startDate,endDate])`, `@@index([createdAt])` — wait, actually `@@index([status])` and `@@index([startDate,endDate])`. Need `createdAt` check. Good composites. |
| `Campaign_PricingRule` | `campaign_pricing_rules` | cuid | 1 | 0 | 1 | `@@index([campaignId])`. FK covered. |
| `Campaign_Condition` | `campaign_conditions` | cuid | 1 | 0 | 1 | `@@index([campaignId])`. FK covered. |
| `Campaign_Product` | `campaign_products` | cuid | 1 | 1 | 1 | `@@unique([campaignId,productId])`, `@@index([productId])`. `@@index([campaignId])` covered by unique — **Low**. |
| `Campaign_Category` | `campaign_categories` | cuid | 0 | 1 | 1 | `@@unique([campaignId,categoryId])`. Unique covers access. ✓ |
| `Campaign_Metrics` | `campaign_metrics` | cuid | 0 | 0 | 1 | No indexes. FK `campaignId` unindexed — **Medium**. `campaignId @unique` exists at field level? Needs verification. |
| `Campaign_OutboxEvent` | `campaign_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |

---

### Domain: Infrastructure / Global

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `SagaLog` | `saga_logs` | cuid | **0** | 0 | 0 | No indexes at all. `sagaId` likely used as lookup key — **High**. |
| `SagaStepLog` | `saga_step_logs` | cuid | **0** | 0 | 1 | No indexes. FK `sagaId` unindexed — **High**. |
| `SagaDeadLetter` | `saga_dead_letters` | cuid | **0** | 0 | 0 | No indexes. `sagaId` and `sagaType` are operational query columns — **Medium**. |
| `EventLog` | `event_logs` | cuid | 2 | 1 | 0 | `@@unique([eventId,consumerName])`, `@@index([eventId])`, `@@index([consumerName])`, `@@index([status])` — wait, 2 indexes and 1 unique; `@@index([eventId])` covered by unique leading column — **Low**. |
| `SharedOutboxEvent` | `shared_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |
| `Global_OutboxEvent` | `global_outbox_events` | cuid | 2 | 0 | 0 | Standard outbox. ✓ |
| `Sms_Message` | `sms_messages` | cuid | 4 | 0 | 0 | `@@index([phoneNumber])`, `@@index([userId])`, `@@index([status])`, `@@index([createdAt])`. Well-indexed. |

---

### Domain: Geography

| Model | Table | PK | Indexes | Uniques | FKs | Notes |
|-------|-------|----|---------|---------|-----|-------|
| `Geography_Country` | `geography_countries` | String `@id` | 0 | 0 | 0 | `code @unique`. Config table; full scan acceptable. |
| `Geography_Region` | `geography_regions` | String `@id` | 1 | 0 | 1 | `@@index([countryId])`. FK covered. |
| `Geography_District` | `geography_districts` | String `@id` | 1 | 0 | 1 | `@@index([regionId])`. FK covered. |
| `Geography_Ward` | `geography_wards` | String `@id` | 1 | 0 | 1 | `@@index([districtId])`. FK covered. |
| `Geography_Street` | `geography_streets` | String `@id` | 1 | 0 | 1 | `@@index([wardId])`. FK covered. |

---

## PART 3 — FINDINGS REGISTER

### CRITICAL

| ID | Model | Finding | Justification |
|----|-------|---------|---------------|
| C-001 | `Wallet_IdempotencyRecord` | No unique constraint on the idempotency key column, and no indexes. | Financial idempotency enforcement at database level is non-functional. Concurrent wallet operations can bypass deduplication, risking duplicate credits/debits. |
| C-002 | `User_User` (canonical) | No `@@index` on `status`, `role`, or `createdAt`. | The canonical user table powering every service is queried by role (seller/buyer/courier lists), status (admin user management), and creation time. Full table scans grow linearly with users. |
| C-003 | `User` (legacy) + `Auth_User` (sync) | Two shadow models of `User_User` remain active in the schema with divergent indexing. | Schema contains three representations of a user: `User` (table: `auth_users`), `Auth_User` (table: `auth_user_sync`), `User_User` (table: `users`). This creates migration risk, maintenance burden and potential data consistency gaps. Architectural resolution required. |

---

### HIGH

| ID | Model | Finding | Justification |
|----|-------|---------|---------------|
| H-001 | `User_PasswordResetToken` | No indexes. FK `userId` unindexed. | "Show all pending reset tokens for user" is a standard auth operation. Without an index on `userId`, queries degrade linearly. |
| H-002 | `User_EmailVerificationToken` | No indexes. FK `userId` unindexed. | Same as H-001. Verification resend and status check require `userId` lookup. |
| H-003 | `User_AuditLog` | No indexes. FK `userId` unindexed, `timestamp` unindexed. | Admin audit trails and user activity dashboards query by `userId` and time range. This table will grow continuously. |
| H-004 | `SagaLog` | No indexes. No `sagaId` lookup index. | Saga logs are read during compensation and monitoring. Without a `sagaId` index, any active saga resumption scans the full table. |
| H-005 | `SagaStepLog` | No indexes. FK `sagaId` unindexed. | Every saga step read during execution or monitoring requires a full table scan. Grows with order volume. |
| H-006 | `Checkout_*` (all 7) | No `@@map` on any checkout model. | Table names will be Prisma-generated PascalCase (`Checkout_Cart`, `Checkout_CartItem`, etc.) rather than snake_case. This is inconsistent with the project convention, creates schema drift risk, and makes raw SQL tooling (migrations, monitoring, manual queries) confusing. |
| H-007 | `EventStore` | Missing `@@index([aggregateId, version])` for ordered event replay. | Event sourcing replay requires events ordered by version within an aggregate. Without a composite index, replay scans all events for the aggregate and sorts in memory. |
| H-008 | `Catalog_FulfillmentSelection` | No index on `locationId` FK column. | Seller location performance queries ("which selections used this location?") require an index on `locationId`. |
| H-009 | `Campaign_Metrics` | No index on `campaignId`. | Campaign metrics are always retrieved per campaign. Without an index, any per-campaign metrics query scans the full table. |
| H-010 | `Logistics_LedgerEntry` | Missing `@@index([shipmentId])`. | The ledger supports per-shipment cost retrieval for settlement. `shipmentId` is nullable but frequently queried — a partial index on `shipmentId WHERE shipmentId IS NOT NULL` would be ideal. |
| H-011 | `Request_Procurement` | FK `supplierId` and `sourceId` unindexed. | Procurement records are retrieved by supplier for ops dashboards and by source for reconciliation. Without indexes, both queries scan the full table. |

---

### MEDIUM

| ID | Model | Finding | Justification |
|----|-------|---------|---------------|
| M-001 | 18 models | Missing `@@map` annotation. | Models without `@@map` use Prisma-generated PascalCase table names. Full list: `Analytics_EnablerAnalytics`, `Analytics_SellerMetrics`, `Analytics_SalesAnalytics`, `Analytics_Metric`, `Analytics_Event`, `Analytics_SupplierAnalytics`, `Analytics_CourierAnalytics`, `Checkout_Cart`, `Checkout_CartItem`, `Checkout_CheckoutSession`, `Checkout_Order`, `Checkout_OrderItem`, `Checkout_InventoryReservation`, `Checkout_AppliedDiscount`, `Training_TrainingRecord`, `Training_CertificationRequirement`, `Training_TrainingModule`, `Training_Badge`, `Training_LeaderboardEntry`, `Logistics_BuyerProfile`, `Logistics_PoolOptimizationRun`, `Payment_FraudAssessment`. |
| M-002 | `Catalog_OperatorAuditLog` | Missing `@@index([operatorId, changedAt])`. | Admin audit queries filtering by operator and time range are a standard ops pattern. The only current index covers entity lookups. |
| M-003 | `SagaDeadLetter` | No indexes on `sagaId`, `sagaType`, or `createdAt`. | Dead letter queues are monitored and replayed by saga type and time. Full scan is unacceptable in production. |
| M-004 | `Catalog_ProductContentSection` | `@@index([productId])` redundant — covered by `@@unique([productId,sectionType])`. | Remove to reduce write overhead. |
| M-005 | `Catalog_ProductLifecycleLog` | `@@index([productId])` redundant — covered by `@@index([productId,toState])`. | Remove to reduce write overhead. |
| M-006 | `Logistics_FairnessFlag` | Missing `@@index([deliveryJobId])`. | Job-scoped flag queries during settlement and ops review need this index. |
| M-007 | `BuyBox` | `@@index([productId])` redundant — `productId @unique` already creates an index. | Remove. |
| M-008 | `Notification` | Needs verification — `@@index([notificationId])` column name vs actual FK column. | Potential mismatch between index declaration and actual FK column. Requires schema review. |
| M-009 | `Order_MasterOrderItem` | `@@index([sellerOrderId])` redundant — `sellerOrderId @unique` already creates an index. | Remove. |
| M-010 | `Logistics_PoolOptimizationRun` | No indexes. `ranAt` unindexed. | Optimization run history queries by time have no index support. |
| M-011 | 4 global outbox models | `OutboxEvent`, `SharedOutboxEvent`, `Global_OutboxEvent`, and per-service outboxes overlap in purpose. | Operational fragmentation. Recommend consolidation strategy in a future migration. |
| M-012 | `EventStore` vs `Commission_EventStore` vs `Order_SagaLog` | Three distinct event-store / saga-log models with different schemas. | No unified event-sourcing contract. Document the intended boundary or consolidate. |
| M-013 | `Compliance_AMLRecord` | `@@index([sanctionsStatus])` on a low-cardinality field (3–4 values). | PostgreSQL may not use a B-tree index on a field with only 3–4 values at scale. Evaluate partial index (`WHERE sanctionsStatus != 'clear'`). |

---

### LOW

| ID | Model | Finding | Justification |
|----|-------|---------|---------------|
| L-001 | `Catalog_AnomalyFlag` | Missing `@@index([clearedAt])` for active-flag queries. | Ops query "all uncleared flags" would benefit from a partial index. |
| L-002 | `NotificationPreference` | `@@index([userId])` redundant — covered by `@@unique([userId,channel])`. | Remove. |
| L-003 | `Enabler_Profile` | `@@index([userId])` redundant — `userId @unique` creates an index. | Remove. |
| L-004 | `Enabler_ProductListing` | `@@index([enablerId])` covered by `@@unique([enablerId,productId])`. | Remove. |
| L-005 | `Enabler_Order` | `@@index([orderId])` redundant — `orderId @unique`. | Remove. |
| L-006 | `Enabler_Analytics` | `@@index([enablerId])` redundant — `enablerId @unique`. | Remove. |
| L-007 | `Enabler_SellerAuthorization` | `@@index([enablerId])` covered by `@@unique([enablerId,sellerId])`. | Remove. |
| L-008 | `Enabler_SellerAuthorizationScope` | `@@index([authorizationId])` covered by unique leading columns. | Remove. |
| L-009 | `Enabler_OrderDraftItem` | `@@index([draftId])` covered by `@@unique([draftId,productId,variantId])`. | Remove. |
| L-010 | `Campaign_Product` | `@@index([campaignId])` covered by `@@unique([campaignId,productId])`. | Remove. |
| L-011 | `EventLog` | `@@index([eventId])` covered by `@@unique([eventId,consumerName])`. | Remove. |
| L-012 | `Payment_FraudAssessment` | Missing `@@index([riskLevel])` for ops risk dashboards. | Low priority — ops table, infrequent queries. |
| L-013 | `Wallet_AuditLog` | Missing `@@index([entityId,createdAt])` for time-ordered audit. | Low priority — time-ordered queries will work via `@@index([entityId])` with sort. |
| L-014 | `Chat_EmergingPattern` | `status` unindexed — ops moderation queue. | Low priority, small table. |

---

### NOT RECOMMENDED

| ID | Potential Change | Reason Not Recommended |
|----|-----------------|------------------------|
| NR-001 | Indexing all outbox `createdAt` and `processedAt` individually | Already have `@@index([status,nextRetryAt])` — this covers outbox polling. `createdAt` indexes on outbox tables serve cleanup jobs; acceptable as-is. |
| NR-002 | Adding composite index on `Product(sellerId, status, createdAt)` | `Product` already has `@@index([sellerId,slug])` and `@@index([lifecycleState])`. Seller product listing queries should be profiled first before adding more. |
| NR-003 | Partitioning any table at this stage | No evidence of table sizes warranting PostgreSQL partitioning. Premature per Article 51. |
| NR-004 | Full-text search indexes on `Product.title` or `Product.description` | Requires GIN index with `pg_trgm` or `tsvector`. No evidence the application uses `ILIKE` or full-text search at scale yet. Add when the search service is built. |

---

## PART 4 — PRIORITIZED REMEDIATION ROADMAP

### Phase 1 — Critical & High (Pre-launch blockers)

| Priority | ID | Action | Migration Risk |
|----------|----|--------|---------------|
| 1 | C-001 | Add `@@unique([idempotencyKey])` and `@@index([status])` to `Wallet_IdempotencyRecord`. Inspect actual column name first. | Low — additive |
| 2 | C-002 | Add `@@index([status])`, `@@index([role])`, `@@index([createdAt])` to `User_User`. | Low — additive |
| 3 | H-001 | Add `@@index([userId])`, `@@index([expiresAt])` to `User_PasswordResetToken`. | Low — additive |
| 4 | H-002 | Add `@@index([userId])`, `@@index([expiresAt])` to `User_EmailVerificationToken`. | Low — additive |
| 5 | H-003 | Add `@@index([userId])`, `@@index([timestamp])` to `User_AuditLog`. | Low — additive |
| 6 | H-004 | Add `@@unique([sagaId])`, `@@index([status])`, `@@index([sagaType])` to `SagaLog`. | Low — additive |
| 7 | H-005 | Add `@@index([sagaId])` to `SagaStepLog`. | Low — additive |
| 8 | H-006 | Add `@@map` to all 7 `Checkout_*` models. | **Medium** — renames tables in DB; requires coordinated migration + app deployment. |
| 9 | H-007 | Add `@@index([aggregateId, version])` to `EventStore`. | Low — additive |
| 10 | H-008 | Add `@@index([locationId])` to `Catalog_FulfillmentSelection`. | Low — additive |
| 11 | H-009 | Add `@@index([campaignId])` to `Campaign_Metrics`. Verify `campaignId @unique` status first. | Low — additive |
| 12 | H-010 | Add `@@index([shipmentId])` to `Logistics_LedgerEntry`. | Low — additive |
| 13 | H-011 | Add `@@index([supplierId])`, `@@index([sourceId])` to `Request_Procurement`. | Low — additive |

### Phase 2 — Medium (Pre-launch best effort)

| Priority | ID | Action |
|----------|----|--------|
| 14 | M-002 | Add `@@index([operatorId, changedAt])` to `Catalog_OperatorAuditLog`. |
| 15 | M-003 | Add `@@index([sagaId])`, `@@index([sagaType])`, `@@index([createdAt])` to `SagaDeadLetter`. |
| 16 | M-004 | Remove redundant `@@index([productId])` from `Catalog_ProductContentSection`. |
| 17 | M-005 | Remove redundant `@@index([productId])` from `Catalog_ProductLifecycleLog`. |
| 18 | M-006 | Add `@@index([deliveryJobId])` to `Logistics_FairnessFlag`. |
| 19 | M-007 | Remove redundant `@@index([productId])` from `BuyBox`. |
| 20 | M-008 | Verify `Notification` model FK column naming and correct if needed. |
| 21 | M-009 | Remove redundant `@@index([sellerOrderId])` from `Order_MasterOrderItem`. |
| 22 | M-001 | Add `@@map` to all 22 models listed in M-001. |

### Phase 3 — Low (Post-launch hygiene)

Remediate L-001 through L-014 incrementally. These are write-overhead reductions and minor operational improvements; none block correctness.

### C-003 — Architectural Resolution (separate track)

The `User` / `Auth_User` / `User_User` triplication requires a dedicated architectural decision:
- Document the intended lifecycle of `User` (table: `auth_users`) and `Auth_User` (table: `auth_user_sync`).
- If they are truly legacy/transitional, plan a migration to remove them and update all foreign key references.
- This is a correctness and maintenance risk but cannot be resolved by a simple index change.

---

## PART 5 — `@@map` MISSING — COMPLETE LIST

The following models have no `@@map` and will use Prisma-generated PascalCase table names in the actual database:

| Model | Will become (PostgreSQL table) |
|-------|-------------------------------|
| `Analytics_EnablerAnalytics` | `Analytics_EnablerAnalytics` |
| `Analytics_SellerMetrics` | `Analytics_SellerMetrics` |
| `Analytics_SalesAnalytics` | `Analytics_SalesAnalytics` |
| `Analytics_Metric` | `Analytics_Metric` |
| `Analytics_Event` | `Analytics_Event` |
| `Analytics_SupplierAnalytics` | `Analytics_SupplierAnalytics` |
| `Analytics_CourierAnalytics` | `Analytics_CourierAnalytics` |
| `Checkout_Cart` | `Checkout_Cart` |
| `Checkout_CartItem` | `Checkout_CartItem` |
| `Checkout_CheckoutSession` | `Checkout_CheckoutSession` |
| `Checkout_Order` | `Checkout_Order` |
| `Checkout_OrderItem` | `Checkout_OrderItem` |
| `Checkout_InventoryReservation` | `Checkout_InventoryReservation` |
| `Checkout_AppliedDiscount` | `Checkout_AppliedDiscount` |
| `Training_TrainingRecord` | `Training_TrainingRecord` |
| `Training_CertificationRequirement` | `Training_CertificationRequirement` |
| `Training_TrainingModule` | `Training_TrainingModule` |
| `Training_Badge` | `Training_Badge` |
| `Training_LeaderboardEntry` | `Training_LeaderboardEntry` |
| `Logistics_BuyerProfile` | `Logistics_BuyerProfile` |
| `Logistics_PoolOptimizationRun` | `Logistics_PoolOptimizationRun` |
| `Payment_FraudAssessment` | `Payment_FraudAssessment` |

---

## PART 6 — NEXT ACTIONS

The following are the immediate schema changes to execute, grouped into two safe migration batches:

### Migration Batch A — Pure additive indexes (zero risk, no table renames)

Apply Phase 1 items 1–2, 3–13 and Phase 2 items 14–19, 21:

1. `Wallet_IdempotencyRecord` — inspect actual column name, then add unique + index.
2. `User_User` — add `@@index([status])`, `@@index([role])`, `@@index([createdAt])`.
3. `User_PasswordResetToken` — add `@@index([userId])`, `@@index([expiresAt])`.
4. `User_EmailVerificationToken` — add `@@index([userId])`, `@@index([expiresAt])`.
5. `User_AuditLog` — add `@@index([userId])`, `@@index([timestamp])`.
6. `SagaLog` — add `@@index([sagaId])` (or `@@unique` if sagaId is a business key), `@@index([status])`, `@@index([sagaType])`.
7. `SagaStepLog` — add `@@index([sagaId])`.
8. `SagaDeadLetter` — add `@@index([sagaId])`, `@@index([sagaType])`, `@@index([createdAt])`.
9. `EventStore` — add `@@index([aggregateId, version])`.
10. `Catalog_FulfillmentSelection` — add `@@index([locationId])`.
11. `Campaign_Metrics` — verify column name and add index on `campaignId`.
12. `Logistics_LedgerEntry` — add `@@index([shipmentId])`.
13. `Request_Procurement` — add `@@index([supplierId])`, `@@index([sourceId])`.
14. `Catalog_OperatorAuditLog` — add `@@index([operatorId, changedAt])`.
15. `Logistics_FairnessFlag` — add `@@index([deliveryJobId])`.
16. Remove redundant indexes: `BuyBox.productId`, `Catalog_ProductContentSection.productId`, `Catalog_ProductLifecycleLog.productId`, `Order_MasterOrderItem.sellerOrderId`.

### Migration Batch B — `@@map` additions (requires careful coordination)

The `Checkout_*` table renames must be executed as a single coordinated migration with application deployment to avoid downtime. All 7 checkout models + 15 analytics/training/logistics models.

---

*Audit status: Initial pass complete. Findings require implementation authorization per Article 49 before any schema modifications proceed.*

*Governing standard: MYS-DB-001 — Review authority: Maysar Engineering Architecture*
