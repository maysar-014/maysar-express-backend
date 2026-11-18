-- Migration: training_table_names
-- Renames Training_* tables from Prisma-generated PascalCase to snake_case
-- matching the @@map annotations added in the schema.
-- Uses IF EXISTS so re-running is safe.

ALTER TABLE IF EXISTS "Training_TrainingRecord"             RENAME TO "training_records";
ALTER TABLE IF EXISTS "Training_CertificationRequirement"  RENAME TO "training_certification_requirements";
ALTER TABLE IF EXISTS "Training_TrainingModule"             RENAME TO "training_modules";
ALTER TABLE IF EXISTS "Training_Badge"                      RENAME TO "training_badges";
ALTER TABLE IF EXISTS "Training_LeaderboardEntry"           RENAME TO "training_leaderboard";

-- Analytics table renames (also had @@map added this session)
ALTER TABLE IF EXISTS "Analytics_EnablerAnalytics"    RENAME TO "analytics_enabler_analytics";
ALTER TABLE IF EXISTS "Analytics_SellerMetrics"       RENAME TO "analytics_seller_metrics";
ALTER TABLE IF EXISTS "Analytics_SalesAnalytics"      RENAME TO "analytics_sales_analytics";
ALTER TABLE IF EXISTS "Analytics_Metric"              RENAME TO "analytics_metrics";
ALTER TABLE IF EXISTS "Analytics_Event"               RENAME TO "analytics_events";
ALTER TABLE IF EXISTS "Analytics_SupplierAnalytics"   RENAME TO "analytics_supplier_analytics";
ALTER TABLE IF EXISTS "Analytics_CourierAnalytics"    RENAME TO "analytics_courier_analytics";

-- Logistics tables (Buyer profile and pool optimization runs)
ALTER TABLE IF EXISTS "Logistics_BuyerProfile"           RENAME TO "logistics_buyer_profiles";
ALTER TABLE IF EXISTS "Logistics_PoolOptimizationRun"    RENAME TO "logistics_pool_optimization_runs";

-- Payment fraud assessment
ALTER TABLE IF EXISTS "Payment_FraudAssessment"    RENAME TO "payment_fraud_assessments";
