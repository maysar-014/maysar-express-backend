-- Migration: fix_uuid_to_text_for_ulid_support
--
-- Converts all uuid-typed ID and reference columns to TEXT so the system
-- can use ULID-format IDs consistently.
--
-- Strategy: drop FK constraints → alter columns → recreate FKs
-- All existing UUID values are preserved (uuid → text cast is lossless).

BEGIN;

-- ─── Drop FK constraints that reference uuid columns ─────────────────────────

ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS "wallet_transactions_walletId_fkey";
ALTER TABLE wallet_holds DROP CONSTRAINT IF EXISTS "wallet_holds_walletId_fkey";
ALTER TABLE notification_delivery_logs DROP CONSTRAINT IF EXISTS "notification_delivery_logs_notificationId_fkey";
ALTER TABLE notification_notifications DROP CONSTRAINT IF EXISTS "notification_notifications_templateId_fkey";
ALTER TABLE catalog_buy_box_alternatives DROP CONSTRAINT IF EXISTS "catalog_buy_box_alternatives_buyBoxId_fkey";
ALTER TABLE catalog_categories DROP CONSTRAINT IF EXISTS "catalog_categories_parentId_fkey";
ALTER TABLE catalog_category_attributes DROP CONSTRAINT IF EXISTS "catalog_category_attributes_categoryId_fkey";
ALTER TABLE catalog_product_attributes DROP CONSTRAINT IF EXISTS "catalog_product_attributes_attributeId_fkey";
ALTER TABLE catalog_product_attributes DROP CONSTRAINT IF EXISTS "catalog_product_attributes_productId_fkey";
ALTER TABLE catalog_product_variants DROP CONSTRAINT IF EXISTS "catalog_product_variants_productId_fkey";
ALTER TABLE catalog_products DROP CONSTRAINT IF EXISTS "catalog_products_categoryId_fkey";
ALTER TABLE catalog_products DROP CONSTRAINT IF EXISTS "catalog_products_supplierLocationId_fkey";
ALTER TABLE community_bookmarks DROP CONSTRAINT IF EXISTS "community_bookmarks_postId_fkey";
ALTER TABLE community_bookmarks DROP CONSTRAINT IF EXISTS "community_bookmarks_userId_fkey";
ALTER TABLE community_comments DROP CONSTRAINT IF EXISTS "community_comments_authorId_fkey";
ALTER TABLE community_comments DROP CONSTRAINT IF EXISTS "community_comments_parentId_fkey";
ALTER TABLE community_comments DROP CONSTRAINT IF EXISTS "community_comments_postId_fkey";
ALTER TABLE community_follows DROP CONSTRAINT IF EXISTS "community_follows_followerId_fkey";
ALTER TABLE community_follows DROP CONSTRAINT IF EXISTS "community_follows_followingId_fkey";
ALTER TABLE community_likes DROP CONSTRAINT IF EXISTS "community_likes_commentId_fkey";
ALTER TABLE community_likes DROP CONSTRAINT IF EXISTS "community_likes_postId_fkey";
ALTER TABLE community_likes DROP CONSTRAINT IF EXISTS "community_likes_userId_fkey";
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS "community_posts_authorId_fkey";
ALTER TABLE community_shares DROP CONSTRAINT IF EXISTS "community_shares_postId_fkey";
ALTER TABLE community_shares DROP CONSTRAINT IF EXISTS "community_shares_userId_fkey";
ALTER TABLE inventory_count_items DROP CONSTRAINT IF EXISTS "inventory_count_items_inventoryCountId_fkey";
ALTER TABLE inventory_count_items DROP CONSTRAINT IF EXISTS "inventory_count_items_productVariantId_warehouseId_fkey";
ALTER TABLE inventory_counts DROP CONSTRAINT IF EXISTS "inventory_counts_warehouseId_fkey";
ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS "inventory_movements_productVariantId_warehouseId_fkey";
ALTER TABLE inventory_movements DROP CONSTRAINT IF EXISTS "inventory_movements_warehouseId_fkey";
ALTER TABLE inventory_reservations DROP CONSTRAINT IF EXISTS "inventory_reservations_productVariantId_warehouseId_fkey";
ALTER TABLE inventory_reservations DROP CONSTRAINT IF EXISTS "inventory_reservations_warehouseId_fkey";
ALTER TABLE inventory_stock_items DROP CONSTRAINT IF EXISTS "inventory_stock_items_warehouseId_fkey";

-- ─── wallets ──────────────────────────────────────────────────────────────────
ALTER TABLE wallets ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE wallets ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;

-- ─── wallet_transactions ──────────────────────────────────────────────────────
ALTER TABLE wallet_transactions ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE wallet_transactions ALTER COLUMN "walletId" TYPE TEXT USING "walletId"::text;
ALTER TABLE wallet_transactions ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE wallet_transactions ALTER COLUMN "correlationId" TYPE TEXT USING "correlationId"::text;
ALTER TABLE wallet_transactions ALTER COLUMN "referenceId" TYPE TEXT USING "referenceId"::text;
ALTER TABLE wallet_transactions ALTER COLUMN "reversalTransactionId" TYPE TEXT USING "reversalTransactionId"::text;

-- ─── wallet_holds ─────────────────────────────────────────────────────────────
ALTER TABLE wallet_holds ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE wallet_holds ALTER COLUMN "walletId" TYPE TEXT USING "walletId"::text;
ALTER TABLE wallet_holds ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;

-- ─── wallet_audit_logs ────────────────────────────────────────────────────────
ALTER TABLE wallet_audit_logs ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE wallet_audit_logs ALTER COLUMN "entityId" TYPE TEXT USING "entityId"::text;

-- ─── wallet_outbox_events ─────────────────────────────────────────────────────
ALTER TABLE wallet_outbox_events ALTER COLUMN id TYPE TEXT USING id::text;

-- ─── payments ─────────────────────────────────────────────────────────────────
ALTER TABLE payments ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE payments ALTER COLUMN "orderId" TYPE TEXT USING "orderId"::text;
ALTER TABLE payments ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;

-- ─── payment_refunds ──────────────────────────────────────────────────────────
ALTER TABLE payment_refunds ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE payment_refunds ALTER COLUMN "orderId" TYPE TEXT USING "orderId"::text;
ALTER TABLE payment_refunds ALTER COLUMN "paymentId" TYPE TEXT USING "paymentId"::text;
ALTER TABLE payment_refunds ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;

-- ─── payment tables ───────────────────────────────────────────────────────────
ALTER TABLE payment_fraud_assessments ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE payment_outbox_events ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE payment_webhook_events ALTER COLUMN id TYPE TEXT USING id::text;

-- ─── payout tables ────────────────────────────────────────────────────────────
ALTER TABLE payout_payouts ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE payout_payouts ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE payout_outbox_events ALTER COLUMN id TYPE TEXT USING id::text;

-- ─── commission tables ────────────────────────────────────────────────────────
ALTER TABLE commission_commissions ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE commission_commissions ALTER COLUMN "orderId" TYPE TEXT USING "orderId"::text;
ALTER TABLE commission_commissions ALTER COLUMN "payoutId" TYPE TEXT USING "payoutId"::text;
ALTER TABLE commission_commissions ALTER COLUMN "sellerId" TYPE TEXT USING "sellerId"::text;
ALTER TABLE commission_payouts ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE commission_payouts ALTER COLUMN "recipientId" TYPE TEXT USING "recipientId"::text;
ALTER TABLE commission_referrals ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE commission_referrals ALTER COLUMN "refereeId" TYPE TEXT USING "refereeId"::text;
ALTER TABLE commission_referrals ALTER COLUMN "referrerId" TYPE TEXT USING "referrerId"::text;
ALTER TABLE commission_rewards ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE commission_rewards ALTER COLUMN "referenceId" TYPE TEXT USING "referenceId"::text;
ALTER TABLE commission_rewards ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE commission_event_store ALTER COLUMN id TYPE TEXT USING id::text;

-- ─── notification tables ──────────────────────────────────────────────────────
ALTER TABLE notification_notifications ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE notification_notifications ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE notification_notifications ALTER COLUMN "templateId" TYPE TEXT USING "templateId"::text;
ALTER TABLE notification_templates ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE notification_templates ALTER COLUMN "createdBy" TYPE TEXT USING "createdBy"::text;
ALTER TABLE notification_preferences ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE notification_preferences ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE notification_device_tokens ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE notification_device_tokens ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE notification_delivery_logs ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE notification_delivery_logs ALTER COLUMN "notificationId" TYPE TEXT USING "notificationId"::text;

-- ─── catalog tables ───────────────────────────────────────────────────────────
ALTER TABLE catalog_products ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE catalog_products ALTER COLUMN "sellerId" TYPE TEXT USING "sellerId"::text;
ALTER TABLE catalog_products ALTER COLUMN "categoryId" TYPE TEXT USING "categoryId"::text;
ALTER TABLE catalog_product_variants ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE catalog_product_variants ALTER COLUMN "productId" TYPE TEXT USING "productId"::text;
ALTER TABLE catalog_categories ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE catalog_categories ALTER COLUMN "parentId" TYPE TEXT USING "parentId"::text;
ALTER TABLE catalog_category_attributes ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE catalog_category_attributes ALTER COLUMN "categoryId" TYPE TEXT USING "categoryId"::text;
ALTER TABLE catalog_product_attributes ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE catalog_product_attributes ALTER COLUMN "productId" TYPE TEXT USING "productId"::text;
ALTER TABLE catalog_product_attributes ALTER COLUMN "attributeId" TYPE TEXT USING "attributeId"::text;
ALTER TABLE catalog_buy_boxes ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE catalog_buy_boxes ALTER COLUMN "productId" TYPE TEXT USING "productId"::text;
ALTER TABLE catalog_buy_boxes ALTER COLUMN "primarySellerId" TYPE TEXT USING "primarySellerId"::text;
ALTER TABLE catalog_buy_box_alternatives ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE catalog_buy_box_alternatives ALTER COLUMN "buyBoxId" TYPE TEXT USING "buyBoxId"::text;
ALTER TABLE catalog_buy_box_alternatives ALTER COLUMN "sellerId" TYPE TEXT USING "sellerId"::text;
ALTER TABLE catalog_product_match_audits ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE catalog_product_match_audits ALTER COLUMN "candidateProductId" TYPE TEXT USING "candidateProductId"::text;
ALTER TABLE catalog_product_match_audits ALTER COLUMN "matchedProductId" TYPE TEXT USING "matchedProductId"::text;
ALTER TABLE catalog_product_match_audits ALTER COLUMN "sellerId" TYPE TEXT USING "sellerId"::text;
ALTER TABLE catalog_match_confirmations ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE catalog_match_confirmations ALTER COLUMN "auditId" TYPE TEXT USING "auditId"::text;
ALTER TABLE catalog_match_confirmations ALTER COLUMN "sellerId" TYPE TEXT USING "sellerId"::text;
ALTER TABLE catalog_media_refs ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE catalog_media_refs ALTER COLUMN "entityId" TYPE TEXT USING "entityId"::text;
ALTER TABLE catalog_media_refs ALTER COLUMN "uploadedBy" TYPE TEXT USING "uploadedBy"::text;
ALTER TABLE catalog_outbox_events ALTER COLUMN id TYPE TEXT USING id::text;

-- ─── inventory tables ─────────────────────────────────────────────────────────
ALTER TABLE inventory_warehouses ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE inventory_stock_items ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE inventory_stock_items ALTER COLUMN "productVariantId" TYPE TEXT USING "productVariantId"::text;
ALTER TABLE inventory_stock_items ALTER COLUMN "warehouseId" TYPE TEXT USING "warehouseId"::text;
ALTER TABLE inventory_movements ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE inventory_movements ALTER COLUMN "productVariantId" TYPE TEXT USING "productVariantId"::text;
ALTER TABLE inventory_movements ALTER COLUMN "warehouseId" TYPE TEXT USING "warehouseId"::text;
ALTER TABLE inventory_movements ALTER COLUMN "referenceId" TYPE TEXT USING "referenceId"::text;
ALTER TABLE inventory_movements ALTER COLUMN "performedBy" TYPE TEXT USING "performedBy"::text;
ALTER TABLE inventory_reservations ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE inventory_reservations ALTER COLUMN "productVariantId" TYPE TEXT USING "productVariantId"::text;
ALTER TABLE inventory_reservations ALTER COLUMN "warehouseId" TYPE TEXT USING "warehouseId"::text;
ALTER TABLE inventory_reservations ALTER COLUMN "orderId" TYPE TEXT USING "orderId"::text;
ALTER TABLE inventory_reservations ALTER COLUMN "orderItemId" TYPE TEXT USING "orderItemId"::text;
ALTER TABLE inventory_counts ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE inventory_counts ALTER COLUMN "productVariantId" TYPE TEXT USING "productVariantId"::text;
ALTER TABLE inventory_counts ALTER COLUMN "warehouseId" TYPE TEXT USING "warehouseId"::text;
ALTER TABLE inventory_counts ALTER COLUMN "countedBy" TYPE TEXT USING "countedBy"::text;
ALTER TABLE inventory_counts ALTER COLUMN "approvedBy" TYPE TEXT USING "approvedBy"::text;
ALTER TABLE inventory_count_items ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE inventory_count_items ALTER COLUMN "inventoryCountId" TYPE TEXT USING "inventoryCountId"::text;
ALTER TABLE inventory_count_items ALTER COLUMN "productVariantId" TYPE TEXT USING "productVariantId"::text;
ALTER TABLE inventory_count_items ALTER COLUMN "warehouseId" TYPE TEXT USING "warehouseId"::text;

-- ─── community tables ─────────────────────────────────────────────────────────
ALTER TABLE community_users ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE community_posts ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE community_posts ALTER COLUMN "authorId" TYPE TEXT USING "authorId"::text;
ALTER TABLE community_posts ALTER COLUMN "moderatedBy" TYPE TEXT USING "moderatedBy"::text;
ALTER TABLE community_comments ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE community_comments ALTER COLUMN "postId" TYPE TEXT USING "postId"::text;
ALTER TABLE community_comments ALTER COLUMN "authorId" TYPE TEXT USING "authorId"::text;
ALTER TABLE community_comments ALTER COLUMN "parentId" TYPE TEXT USING "parentId"::text;
ALTER TABLE community_comments ALTER COLUMN "moderatedBy" TYPE TEXT USING "moderatedBy"::text;
ALTER TABLE community_likes ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE community_likes ALTER COLUMN "postId" TYPE TEXT USING "postId"::text;
ALTER TABLE community_likes ALTER COLUMN "commentId" TYPE TEXT USING "commentId"::text;
ALTER TABLE community_likes ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE community_bookmarks ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE community_bookmarks ALTER COLUMN "postId" TYPE TEXT USING "postId"::text;
ALTER TABLE community_bookmarks ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE community_follows ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE community_follows ALTER COLUMN "followerId" TYPE TEXT USING "followerId"::text;
ALTER TABLE community_follows ALTER COLUMN "followingId" TYPE TEXT USING "followingId"::text;
ALTER TABLE community_shares ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE community_shares ALTER COLUMN "postId" TYPE TEXT USING "postId"::text;
ALTER TABLE community_shares ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE community_reports ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE community_reports ALTER COLUMN "reporterId" TYPE TEXT USING "reporterId"::text;
ALTER TABLE community_reports ALTER COLUMN "entityId" TYPE TEXT USING "entityId"::text;
ALTER TABLE community_reports ALTER COLUMN "reviewedBy" TYPE TEXT USING "reviewedBy"::text;
ALTER TABLE community_hashtags ALTER COLUMN id TYPE TEXT USING id::text;

-- ─── Checkout tables ──────────────────────────────────────────────────────────
ALTER TABLE "Checkout_Cart" ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE "Checkout_CartItem" ALTER COLUMN "productId" TYPE TEXT USING "productId"::text;
ALTER TABLE "Checkout_CartItem" ALTER COLUMN "variantId" TYPE TEXT USING "variantId"::text;
ALTER TABLE "Checkout_CheckoutSession" ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE "Checkout_Order" ALTER COLUMN "userId" TYPE TEXT USING "userId"::text;
ALTER TABLE "Checkout_OrderItem" ALTER COLUMN "productId" TYPE TEXT USING "productId"::text;
ALTER TABLE "Checkout_OrderItem" ALTER COLUMN "variantId" TYPE TEXT USING "variantId"::text;
ALTER TABLE "Checkout_InventoryReservation" ALTER COLUMN "productId" TYPE TEXT USING "productId"::text;
ALTER TABLE "Checkout_InventoryReservation" ALTER COLUMN "variantId" TYPE TEXT USING "variantId"::text;

-- ─── Campaign tables ──────────────────────────────────────────────────────────
ALTER TABLE campaigns ALTER COLUMN "sellerId" TYPE TEXT USING "sellerId"::text;
ALTER TABLE campaigns ALTER COLUMN "createdBy" TYPE TEXT USING "createdBy"::text;
ALTER TABLE campaign_products ALTER COLUMN "productId" TYPE TEXT USING "productId"::text;
ALTER TABLE campaign_categories ALTER COLUMN "categoryId" TYPE TEXT USING "categoryId"::text;

-- ─── Enabler tables ───────────────────────────────────────────────────────────
ALTER TABLE enabler_outbox_events ALTER COLUMN id TYPE TEXT USING id::text;

-- ─── Recreate FK constraints ──────────────────────────────────────────────────

ALTER TABLE wallet_transactions
  ADD CONSTRAINT "wallet_transactions_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES wallets(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE wallet_holds
  ADD CONSTRAINT "wallet_holds_walletId_fkey"
  FOREIGN KEY ("walletId") REFERENCES wallets(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE notification_delivery_logs
  ADD CONSTRAINT "notification_delivery_logs_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES notification_notifications(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE notification_notifications
  ADD CONSTRAINT "notification_notifications_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES notification_templates(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE catalog_buy_box_alternatives
  ADD CONSTRAINT "catalog_buy_box_alternatives_buyBoxId_fkey"
  FOREIGN KEY ("buyBoxId") REFERENCES catalog_buy_boxes(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE catalog_categories
  ADD CONSTRAINT "catalog_categories_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES catalog_categories(id) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE catalog_category_attributes
  ADD CONSTRAINT "catalog_category_attributes_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES catalog_categories(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE catalog_product_attributes
  ADD CONSTRAINT "catalog_product_attributes_attributeId_fkey"
  FOREIGN KEY ("attributeId") REFERENCES catalog_category_attributes(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE catalog_product_attributes
  ADD CONSTRAINT "catalog_product_attributes_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES catalog_products(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE catalog_product_variants
  ADD CONSTRAINT "catalog_product_variants_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES catalog_products(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE catalog_products
  ADD CONSTRAINT "catalog_products_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES catalog_categories(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE community_bookmarks
  ADD CONSTRAINT "community_bookmarks_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES community_posts(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_bookmarks
  ADD CONSTRAINT "community_bookmarks_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES community_users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_comments
  ADD CONSTRAINT "community_comments_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES community_users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_comments
  ADD CONSTRAINT "community_comments_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES community_comments(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_comments
  ADD CONSTRAINT "community_comments_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES community_posts(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_follows
  ADD CONSTRAINT "community_follows_followerId_fkey"
  FOREIGN KEY ("followerId") REFERENCES community_users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_follows
  ADD CONSTRAINT "community_follows_followingId_fkey"
  FOREIGN KEY ("followingId") REFERENCES community_users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_likes
  ADD CONSTRAINT "community_likes_commentId_fkey"
  FOREIGN KEY ("commentId") REFERENCES community_comments(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_likes
  ADD CONSTRAINT "community_likes_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES community_posts(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_likes
  ADD CONSTRAINT "community_likes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES community_users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_posts
  ADD CONSTRAINT "community_posts_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES community_users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_shares
  ADD CONSTRAINT "community_shares_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES community_posts(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE community_shares
  ADD CONSTRAINT "community_shares_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES community_users(id) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE inventory_stock_items
  ADD CONSTRAINT "inventory_stock_items_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES inventory_warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE inventory_movements
  ADD CONSTRAINT "inventory_movements_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES inventory_warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE inventory_reservations
  ADD CONSTRAINT "inventory_reservations_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES inventory_warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE inventory_counts
  ADD CONSTRAINT "inventory_counts_warehouseId_fkey"
  FOREIGN KEY ("warehouseId") REFERENCES inventory_warehouses(id) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE inventory_count_items
  ADD CONSTRAINT "inventory_count_items_inventoryCountId_fkey"
  FOREIGN KEY ("inventoryCountId") REFERENCES inventory_counts(id) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
