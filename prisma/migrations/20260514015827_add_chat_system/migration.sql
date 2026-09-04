/*
  Warnings:

  - You are about to alter the column `id` on the `catalog_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `catalog_product_attributes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `catalog_product_attributes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `productId` on the `catalog_product_attributes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `attributeId` on the `catalog_product_attributes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `catalog_product_match_audits` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `catalog_product_match_audits` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `candidateProductId` on the `catalog_product_match_audits` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `matchedProductId` on the `catalog_product_match_audits` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `sellerId` on the `catalog_product_match_audits` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `catalog_product_variants` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `catalog_product_variants` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `productId` on the `catalog_product_variants` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `catalog_products` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `catalog_products` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `sellerId` on the `catalog_products` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `categoryId` on the `catalog_products` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `supplierLocationId` on the `catalog_products` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `commission_commissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `commission_commissions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `orderId` on the `commission_commissions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `sellerId` on the `commission_commissions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `payoutId` on the `commission_commissions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `commission_event_store` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `commission_event_store` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `commission_payouts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `commission_payouts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `recipientId` on the `commission_payouts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `commission_referrals` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `commission_referrals` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `referrerId` on the `commission_referrals` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `refereeId` on the `commission_referrals` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `commission_rewards` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `commission_rewards` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `commission_rewards` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `referenceId` on the `commission_rewards` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_article_reviews` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_article_reviews` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `articleId` on the `community_article_reviews` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_bookmarks` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_bookmarks` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `community_bookmarks` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `postId` on the `community_bookmarks` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_business_challenges` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_business_challenges` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_business_profiles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_business_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `community_business_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `businessId` on the `community_business_profiles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_challenge_solutions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_challenge_solutions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `challengeId` on the `community_challenge_solutions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `authorId` on the `community_challenge_solutions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_comments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_comments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `postId` on the `community_comments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `authorId` on the `community_comments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `parentId` on the `community_comments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `moderatedBy` on the `community_comments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_contribution_history` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_contribution_history` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `community_contribution_history` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_discussion_threads` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_discussion_threads` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `authorId` on the `community_discussion_threads` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_engagement_quotas` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_engagement_quotas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `community_engagement_quotas` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_follows` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_follows` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `followerId` on the `community_follows` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `followingId` on the `community_follows` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_hashtags` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_hashtags` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_knowledge_articles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_knowledge_articles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `authorId` on the `community_knowledge_articles` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_likes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_likes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `community_likes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `postId` on the `community_likes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `commentId` on the `community_likes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_peer_endorsements` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_peer_endorsements` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_posts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_posts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `authorId` on the `community_posts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `moderatedBy` on the `community_posts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_reports` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_reports` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `reporterId` on the `community_reports` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `entityId` on the `community_reports` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `reviewedBy` on the `community_reports` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_shares` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_shares` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `community_shares` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `postId` on the `community_shares` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_thread_answers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_thread_answers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `threadId` on the `community_thread_answers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `authorId` on the `community_thread_answers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_user_interactions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_user_interactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `community_user_interactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `community_users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `community_users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `compliance_aml_records` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `compliance_aml_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `compliance_aml_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `compliance_audit_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `compliance_audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `compliance_audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `compliance_data_deletion_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `compliance_data_deletion_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `compliance_data_deletion_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `compliance_data_processing_records` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `compliance_data_processing_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `compliance_data_retention_policies` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `compliance_data_retention_policies` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `compliance_kyc_records` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `compliance_kyc_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `compliance_kyc_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `compliance_market_records` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `compliance_market_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `sellerId` on the `compliance_market_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `compliance_privacy_impact_assessments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `compliance_privacy_impact_assessments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `compliance_subject_rights_requests` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `compliance_subject_rights_requests` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `compliance_subject_rights_requests` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `compliance_tcra_records` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `compliance_tcra_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `compliance_tcra_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `compliance_tra_records` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `compliance_tra_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `compliance_tra_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `enabler_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `enabler_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `event_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `event_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `event_store` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `event_store` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `global_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `global_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `inventory_count_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `inventory_count_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `inventoryCountId` on the `inventory_count_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `productVariantId` on the `inventory_count_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `warehouseId` on the `inventory_count_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `inventory_counts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `inventory_counts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `warehouseId` on the `inventory_counts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `productVariantId` on the `inventory_counts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `countedBy` on the `inventory_counts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `approvedBy` on the `inventory_counts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `inventory_movements` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `inventory_movements` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `productVariantId` on the `inventory_movements` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `warehouseId` on the `inventory_movements` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `referenceId` on the `inventory_movements` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `performedBy` on the `inventory_movements` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `inventory_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `inventory_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `inventory_reservations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `inventory_reservations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `orderId` on the `inventory_reservations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `orderItemId` on the `inventory_reservations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `productVariantId` on the `inventory_reservations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `warehouseId` on the `inventory_reservations` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `inventory_stock_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `inventory_stock_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `productVariantId` on the `inventory_stock_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `warehouseId` on the `inventory_stock_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `inventory_warehouses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `inventory_warehouses` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `logistics_couriers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `logistics_couriers` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `logistics_deliveries` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `logistics_deliveries` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `orderId` on the `logistics_deliveries` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `courierId` on the `logistics_deliveries` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `sellerId` on the `logistics_deliveries` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `logistics_earnings` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `logistics_earnings` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `courierId` on the `logistics_earnings` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `logistics_location_history` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `logistics_location_history` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `courierId` on the `logistics_location_history` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `logistics_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `logistics_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `notification_delivery_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `notification_delivery_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `notificationId` on the `notification_delivery_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `notification_device_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `notification_device_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `notification_device_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `notification_notifications` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `notification_notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `notification_notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `templateId` on the `notification_notifications` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `notification_preferences` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `notification_preferences` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `notification_preferences` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `notification_templates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `notification_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `createdBy` on the `notification_templates` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `order_cod_disputes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `order_cod_disputes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `orderId` on the `order_cod_disputes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `order_items` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `order_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `orderId` on the `order_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `productId` on the `order_items` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `order_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `order_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `order_payments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `order_payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `orderId` on the `order_payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `order_saga_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `order_saga_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `sagaId` on the `order_saga_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `order_saga_step_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `order_saga_step_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `sagaId` on the `order_saga_step_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `order_settlements` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `order_settlements` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `orderId` on the `order_settlements` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `orders` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `sellerId` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `enablerId` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `payment_fraud_assessments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `payment_fraud_assessments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `payment_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `payment_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `payment_refunds` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `payment_refunds` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `paymentId` on the `payment_refunds` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `orderId` on the `payment_refunds` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `payment_refunds` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `payment_webhook_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `payment_webhook_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `payments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `orderId` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `payout_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `payout_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `payout_payouts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `payout_payouts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `payout_payouts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `saga_dead_letters` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `saga_dead_letters` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `sagaId` on the `saga_dead_letters` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `saga_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `sagaId` on the `saga_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `saga_step_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `saga_step_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `sagaId` on the `saga_step_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `shared_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `shared_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `sms_messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `sms_messages` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `sms_messages` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `support_agents` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `support_agents` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `support_agents` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `support_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `support_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `support_ticket_attachments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `support_ticket_attachments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `ticketId` on the `support_ticket_attachments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `messageId` on the `support_ticket_attachments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `support_ticket_messages` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `support_ticket_messages` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `ticketId` on the `support_ticket_messages` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `support_ticket_status_history` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `support_ticket_status_history` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `ticketId` on the `support_ticket_status_history` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `support_tickets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `support_tickets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `support_tickets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `assignedAgentId` on the `support_tickets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `user_addresses` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_addresses` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `user_addresses` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `user_audit_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `user_audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `user_cod_history` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_cod_history` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `user_cod_history` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `orderId` on the `user_cod_history` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `user_email_verification_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_email_verification_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `user_email_verification_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `user_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `user_password_reset_tokens` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_password_reset_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `user_password_reset_tokens` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `user_service_user_indexes` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `user_sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `user_sessions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `user_two_factor_auth` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `user_two_factor_auth` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `user_two_factor_auth` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `wallet_audit_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `wallet_audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `entityId` on the `wallet_audit_logs` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `wallet_holds` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `wallet_holds` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `walletId` on the `wallet_holds` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `wallet_holds` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `wallet_idempotency_records` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `key` on the `wallet_idempotency_records` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `wallet_outbox_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `wallet_outbox_events` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `wallet_transactions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `walletId` on the `wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `referenceId` on the `wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `correlationId` on the `wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `reversalTransactionId` on the `wallet_transactions` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - The primary key for the `wallets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `wallets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.
  - You are about to alter the column `userId` on the `wallets` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(64)`.

*/
-- CreateEnum
CREATE TYPE "Chat_ConversationType" AS ENUM ('BUYER_SELLER', 'SELLER_SUPPLIER', 'BUYER_COURIER', 'SELLER_TEAM');

-- CreateEnum
CREATE TYPE "Chat_MessageType" AS ENUM ('TEXT', 'IMAGE', 'VOICE_NOTE', 'PRODUCT_CARD', 'ORDER_REFERENCE', 'LOCATION_PIN', 'QUICK_ACTION');

-- CreateEnum
CREATE TYPE "Chat_ModerationStatus" AS ENUM ('ACTIVE', 'FLAGGED', 'BLOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Chat_ParticipantRole" AS ENUM ('BUYER', 'SELLER', 'SUPPLIER', 'COURIER');

-- DropForeignKey
ALTER TABLE "Checkout_CartItem" DROP CONSTRAINT "Checkout_CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "Checkout_OrderItem" DROP CONSTRAINT "Checkout_OrderItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "Training_TrainingRecord" DROP CONSTRAINT "Training_TrainingRecord_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_seller_action_items" DROP CONSTRAINT "analytics_seller_action_items_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_seller_daily_sales" DROP CONSTRAINT "analytics_seller_daily_sales_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_seller_inventory_health" DROP CONSTRAINT "analytics_seller_inventory_health_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "analytics_seller_product_performance" DROP CONSTRAINT "analytics_seller_product_performance_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "auth_audit_logs" DROP CONSTRAINT "auth_audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "auth_role_requests" DROP CONSTRAINT IF EXISTS "auth_role_requests_userId_fkey";

-- DropForeignKey
ALTER TABLE "auth_email_verification_tokens" DROP CONSTRAINT "auth_email_verification_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "auth_password_reset_tokens" DROP CONSTRAINT "auth_password_reset_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "auth_sessions" DROP CONSTRAINT "auth_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "businessregistry_business_addresses" DROP CONSTRAINT "businessregistry_business_addresses_businessId_fkey";

-- DropForeignKey
ALTER TABLE "businessregistry_business_documents" DROP CONSTRAINT "businessregistry_business_documents_businessId_fkey";

-- DropForeignKey
ALTER TABLE "businessregistry_compliance_records" DROP CONSTRAINT "businessregistry_compliance_records_businessId_fkey";

-- DropForeignKey
ALTER TABLE "campaign_categories" DROP CONSTRAINT "campaign_categories_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "campaign_conditions" DROP CONSTRAINT "campaign_conditions_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "campaign_metrics" DROP CONSTRAINT "campaign_metrics_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "campaign_pricing_rules" DROP CONSTRAINT "campaign_pricing_rules_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "campaign_products" DROP CONSTRAINT "campaign_products_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "catalog_buy_box_alternatives" DROP CONSTRAINT "catalog_buy_box_alternatives_buyBoxId_fkey";

-- DropForeignKey
ALTER TABLE "catalog_categories" DROP CONSTRAINT "catalog_categories_parentId_fkey";

-- DropForeignKey
ALTER TABLE "catalog_category_attributes" DROP CONSTRAINT "catalog_category_attributes_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "catalog_product_attributes" DROP CONSTRAINT "catalog_product_attributes_attributeId_fkey";

-- DropForeignKey
ALTER TABLE "catalog_product_attributes" DROP CONSTRAINT "catalog_product_attributes_productId_fkey";

-- DropForeignKey
ALTER TABLE "catalog_product_variants" DROP CONSTRAINT "catalog_product_variants_productId_fkey";

-- DropForeignKey
ALTER TABLE "catalog_products" DROP CONSTRAINT "catalog_products_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "community_article_reviews" DROP CONSTRAINT "community_article_reviews_articleId_fkey";

-- DropForeignKey
ALTER TABLE "community_bookmarks" DROP CONSTRAINT "community_bookmarks_postId_fkey";

-- DropForeignKey
ALTER TABLE "community_bookmarks" DROP CONSTRAINT "community_bookmarks_userId_fkey";

-- DropForeignKey
ALTER TABLE "community_challenge_solutions" DROP CONSTRAINT "community_challenge_solutions_challengeId_fkey";

-- DropForeignKey
ALTER TABLE "community_comments" DROP CONSTRAINT "community_comments_authorId_fkey";

-- DropForeignKey
ALTER TABLE "community_comments" DROP CONSTRAINT "community_comments_parentId_fkey";

-- DropForeignKey
ALTER TABLE "community_comments" DROP CONSTRAINT "community_comments_postId_fkey";

-- DropForeignKey
ALTER TABLE "community_follows" DROP CONSTRAINT "community_follows_followerId_fkey";

-- DropForeignKey
ALTER TABLE "community_follows" DROP CONSTRAINT "community_follows_followingId_fkey";

-- DropForeignKey
ALTER TABLE "community_likes" DROP CONSTRAINT "community_likes_commentId_fkey";

-- DropForeignKey
ALTER TABLE "community_likes" DROP CONSTRAINT "community_likes_postId_fkey";

-- DropForeignKey
ALTER TABLE "community_likes" DROP CONSTRAINT "community_likes_userId_fkey";

-- DropForeignKey
ALTER TABLE "community_posts" DROP CONSTRAINT "community_posts_authorId_fkey";

-- DropForeignKey
ALTER TABLE "community_shares" DROP CONSTRAINT "community_shares_postId_fkey";

-- DropForeignKey
ALTER TABLE "community_shares" DROP CONSTRAINT "community_shares_userId_fkey";

-- DropForeignKey
ALTER TABLE "community_thread_answers" DROP CONSTRAINT "community_thread_answers_threadId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_count_items" DROP CONSTRAINT "inventory_count_items_inventoryCountId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_counts" DROP CONSTRAINT "inventory_counts_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_reservations" DROP CONSTRAINT "inventory_reservations_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "inventory_stock_items" DROP CONSTRAINT "inventory_stock_items_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "logistics_deliveries" DROP CONSTRAINT "logistics_deliveries_courierId_fkey";

-- DropForeignKey
ALTER TABLE "logistics_earnings" DROP CONSTRAINT "logistics_earnings_courierId_fkey";

-- DropForeignKey
ALTER TABLE "logistics_location_history" DROP CONSTRAINT "logistics_location_history_courierId_fkey";

-- DropForeignKey
ALTER TABLE "notification_delivery_logs" DROP CONSTRAINT "notification_delivery_logs_notificationId_fkey";

-- DropForeignKey
ALTER TABLE "notification_notifications" DROP CONSTRAINT "notification_notifications_templateId_fkey";

-- DropForeignKey
ALTER TABLE "order_cod_disputes" DROP CONSTRAINT "order_cod_disputes_orderId_fkey";

-- DropForeignKey
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_orderId_fkey";

-- DropForeignKey
ALTER TABLE "order_payments" DROP CONSTRAINT "order_payments_orderId_fkey";

-- DropForeignKey
ALTER TABLE "order_saga_step_logs" DROP CONSTRAINT "order_saga_step_logs_sagaId_fkey";

-- DropForeignKey
ALTER TABLE "order_settlements" DROP CONSTRAINT "order_settlements_orderId_fkey";

-- DropForeignKey
ALTER TABLE "saga_step_logs" DROP CONSTRAINT "saga_step_logs_sagaId_fkey";

-- DropForeignKey
ALTER TABLE "support_ticket_attachments" DROP CONSTRAINT "support_ticket_attachments_messageId_fkey";

-- DropForeignKey
ALTER TABLE "support_ticket_attachments" DROP CONSTRAINT "support_ticket_attachments_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "support_ticket_messages" DROP CONSTRAINT "support_ticket_messages_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "support_ticket_status_history" DROP CONSTRAINT "support_ticket_status_history_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_assignedAgentId_fkey";

-- DropForeignKey
ALTER TABLE "user_addresses" DROP CONSTRAINT "user_addresses_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_audit_logs" DROP CONSTRAINT "user_audit_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_cod_history" DROP CONSTRAINT "user_cod_history_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_email_verification_tokens" DROP CONSTRAINT "user_email_verification_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_password_reset_tokens" DROP CONSTRAINT "user_password_reset_tokens_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_two_factor_auth" DROP CONSTRAINT "user_two_factor_auth_userId_fkey";

-- DropForeignKey
ALTER TABLE "wallet_holds" DROP CONSTRAINT "wallet_holds_walletId_fkey";

-- DropForeignKey
ALTER TABLE "wallet_transactions" DROP CONSTRAINT "wallet_transactions_walletId_fkey";

-- DropIndex
DROP INDEX "catalog_products_supplierLocation_idx";

-- AlterTable
ALTER TABLE "Analytics_CourierAnalytics" DROP CONSTRAINT "Analytics_CourierAnalytics_pkey",
ALTER COLUMN "courierId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Analytics_CourierAnalytics_pkey" PRIMARY KEY ("courierId");

-- AlterTable
ALTER TABLE "Analytics_EnablerAnalytics" DROP CONSTRAINT "Analytics_EnablerAnalytics_pkey",
ALTER COLUMN "enablerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Analytics_EnablerAnalytics_pkey" PRIMARY KEY ("enablerId");

-- AlterTable
ALTER TABLE "Analytics_Event" DROP CONSTRAINT "Analytics_Event_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Analytics_Event_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Analytics_Metric" DROP CONSTRAINT "Analytics_Metric_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Analytics_Metric_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Analytics_SalesAnalytics" DROP CONSTRAINT "Analytics_SalesAnalytics_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Analytics_SalesAnalytics_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Analytics_SellerMetrics" DROP CONSTRAINT "Analytics_SellerMetrics_pkey",
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Analytics_SellerMetrics_pkey" PRIMARY KEY ("sellerId");

-- AlterTable
ALTER TABLE "Analytics_SupplierAnalytics" DROP CONSTRAINT "Analytics_SupplierAnalytics_pkey",
ALTER COLUMN "supplierId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Analytics_SupplierAnalytics_pkey" PRIMARY KEY ("supplierId");

-- AlterTable
ALTER TABLE "Checkout_AppliedDiscount" DROP CONSTRAINT "Checkout_AppliedDiscount_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Checkout_AppliedDiscount_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Checkout_Cart" DROP CONSTRAINT "Checkout_Cart_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Checkout_Cart_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Checkout_CartItem" DROP CONSTRAINT "Checkout_CartItem_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "cartId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "variantId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Checkout_CartItem_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Checkout_CheckoutSession" DROP CONSTRAINT "Checkout_CheckoutSession_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "cartId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "enablerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Checkout_CheckoutSession_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Checkout_InventoryReservation" DROP CONSTRAINT "Checkout_InventoryReservation_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "variantId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Checkout_InventoryReservation_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Checkout_Order" DROP CONSTRAINT "Checkout_Order_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Checkout_Order_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Checkout_OrderItem" DROP CONSTRAINT "Checkout_OrderItem_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "variantId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Checkout_OrderItem_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Training_Badge" DROP CONSTRAINT "Training_Badge_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Training_Badge_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Training_CertificationRequirement" DROP CONSTRAINT "Training_CertificationRequirement_pkey",
ALTER COLUMN "module" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Training_CertificationRequirement_pkey" PRIMARY KEY ("module");

-- AlterTable
ALTER TABLE "Training_LeaderboardEntry" DROP CONSTRAINT "Training_LeaderboardEntry_pkey",
ALTER COLUMN "learnerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Training_LeaderboardEntry_pkey" PRIMARY KEY ("learnerId");

-- AlterTable
ALTER TABLE "Training_TrainingModule" DROP CONSTRAINT "Training_TrainingModule_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Training_TrainingModule_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Training_TrainingRecord" DROP CONSTRAINT "Training_TrainingRecord_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "moduleId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "Training_TrainingRecord_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "analytics_seller_action_items" DROP CONSTRAINT "analytics_seller_action_items_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "analytics_seller_action_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "analytics_seller_daily_sales" DROP CONSTRAINT "analytics_seller_daily_sales_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "analytics_seller_daily_sales_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "analytics_seller_inventory_health" DROP CONSTRAINT "analytics_seller_inventory_health_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "analytics_seller_inventory_health_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "analytics_seller_product_performance" DROP CONSTRAINT "analytics_seller_product_performance_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "analytics_seller_product_performance_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auth_audit_logs" DROP CONSTRAINT "auth_audit_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "auth_audit_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auth_email_verification_tokens" DROP CONSTRAINT "auth_email_verification_tokens_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "auth_email_verification_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auth_password_reset_tokens" DROP CONSTRAINT "auth_password_reset_tokens_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "auth_password_reset_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auth_role_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "auth_sessions" DROP CONSTRAINT "auth_sessions_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auth_user_indexes" ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64);

-- AlterTable
ALTER TABLE "auth_user_sync" DROP CONSTRAINT "auth_user_sync_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "phoneNumber" SET DATA TYPE TEXT,
ADD CONSTRAINT "auth_user_sync_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "auth_users" DROP CONSTRAINT "auth_users_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "auth_users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "businessregistry_business_addresses" DROP CONSTRAINT "businessregistry_business_addresses_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "businessId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "businessregistry_business_addresses_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "businessregistry_business_documents" DROP CONSTRAINT "businessregistry_business_documents_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "businessId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "businessregistry_business_documents_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "businessregistry_businesses" DROP CONSTRAINT "businessregistry_businesses_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "industry" DROP DEFAULT,
ADD CONSTRAINT "businessregistry_businesses_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "businessregistry_compliance_records" DROP CONSTRAINT "businessregistry_compliance_records_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "businessId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "businessregistry_compliance_records_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "businessregistry_outbox_events" DROP CONSTRAINT "businessregistry_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "businessregistry_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "campaign_categories" DROP CONSTRAINT "campaign_categories_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "campaignId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "categoryId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "campaign_categories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "campaign_conditions" DROP CONSTRAINT "campaign_conditions_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "campaignId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "campaign_conditions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "campaign_metrics" DROP CONSTRAINT "campaign_metrics_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "campaignId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "campaign_metrics_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "campaign_outbox_events" DROP CONSTRAINT "campaign_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "campaign_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "campaign_pricing_rules" DROP CONSTRAINT "campaign_pricing_rules_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "campaignId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "campaign_pricing_rules_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "campaign_products" DROP CONSTRAINT "campaign_products_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "campaignId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "campaign_products_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "createdBy" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "catalog_buy_box_alternatives" DROP CONSTRAINT "catalog_buy_box_alternatives_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "buyBoxId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "catalog_buy_box_alternatives_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "catalog_buy_boxes" DROP CONSTRAINT "catalog_buy_boxes_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "primarySellerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "catalog_buy_boxes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "catalog_categories" DROP CONSTRAINT "catalog_categories_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "parentId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "catalog_category_attributes" DROP CONSTRAINT "catalog_category_attributes_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "categoryId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "catalog_category_attributes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "catalog_match_confirmations" DROP CONSTRAINT "catalog_match_confirmations_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "auditId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "catalog_match_confirmations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "catalog_media_refs" DROP CONSTRAINT "catalog_media_refs_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "entityId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "uploadedBy" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "catalog_media_refs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "catalog_outbox_events" DROP CONSTRAINT "catalog_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "catalog_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "catalog_product_attributes" DROP CONSTRAINT "catalog_product_attributes_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "attributeId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "catalog_product_attributes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "catalog_product_match_audits" DROP CONSTRAINT "catalog_product_match_audits_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "candidateProductId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "matchedProductId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "catalog_product_match_audits_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "catalog_product_variants" DROP CONSTRAINT "catalog_product_variants_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "catalog_product_variants_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "catalog_products" DROP CONSTRAINT "catalog_products_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "categoryId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "supplierLocationId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "commission_commissions" DROP CONSTRAINT "commission_commissions_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "payoutId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "commission_commissions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "commission_event_store" DROP CONSTRAINT "commission_event_store_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "commission_event_store_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "commission_payouts" DROP CONSTRAINT "commission_payouts_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "recipientId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "commission_payouts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "commission_referrals" DROP CONSTRAINT "commission_referrals_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "referrerId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "refereeId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "commission_referrals_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "commission_rewards" DROP CONSTRAINT "commission_rewards_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "referenceId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "commission_rewards_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_article_reviews" DROP CONSTRAINT "community_article_reviews_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "articleId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_article_reviews_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_bookmarks" DROP CONSTRAINT "community_bookmarks_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "postId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_bookmarks_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_business_challenges" DROP CONSTRAINT "community_business_challenges_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_business_challenges_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_business_profiles" DROP CONSTRAINT "community_business_profiles_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "businessId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_business_profiles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_challenge_solutions" DROP CONSTRAINT "community_challenge_solutions_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "challengeId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "authorId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_challenge_solutions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_comments" DROP CONSTRAINT "community_comments_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "postId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "authorId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "parentId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "moderatedBy" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_comments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_contribution_history" DROP CONSTRAINT "community_contribution_history_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_contribution_history_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_discussion_threads" DROP CONSTRAINT "community_discussion_threads_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "authorId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_discussion_threads_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_engagement_quotas" DROP CONSTRAINT "community_engagement_quotas_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_engagement_quotas_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_follows" DROP CONSTRAINT "community_follows_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "followerId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "followingId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_follows_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_hashtags" DROP CONSTRAINT "community_hashtags_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_hashtags_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_knowledge_articles" DROP CONSTRAINT "community_knowledge_articles_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "authorId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_knowledge_articles_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_likes" DROP CONSTRAINT "community_likes_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "postId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "commentId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_likes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_outbox_events" DROP CONSTRAINT "community_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_peer_endorsements" DROP CONSTRAINT "community_peer_endorsements_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_peer_endorsements_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_posts" DROP CONSTRAINT "community_posts_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "authorId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "moderatedBy" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_reports" DROP CONSTRAINT "community_reports_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "reporterId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "entityId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "reviewedBy" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_reports_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_shares" DROP CONSTRAINT "community_shares_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "postId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_shares_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_thread_answers" DROP CONSTRAINT "community_thread_answers_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "threadId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "authorId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_thread_answers_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_user_interactions" DROP CONSTRAINT "community_user_interactions_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_user_interactions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "community_users" DROP CONSTRAINT "community_users_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "community_users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "compliance_aml_records" DROP CONSTRAINT "compliance_aml_records_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "compliance_aml_records_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "compliance_audit_logs" DROP CONSTRAINT "compliance_audit_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "compliance_audit_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "compliance_data_deletion_logs" DROP CONSTRAINT "compliance_data_deletion_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "compliance_data_deletion_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "compliance_data_processing_records" DROP CONSTRAINT "compliance_data_processing_records_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "compliance_data_processing_records_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "compliance_data_retention_policies" DROP CONSTRAINT "compliance_data_retention_policies_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "compliance_data_retention_policies_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "compliance_kyc_records" DROP CONSTRAINT "compliance_kyc_records_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "compliance_kyc_records_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "compliance_market_records" DROP CONSTRAINT "compliance_market_records_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "compliance_market_records_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "compliance_privacy_impact_assessments" DROP CONSTRAINT "compliance_privacy_impact_assessments_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "compliance_privacy_impact_assessments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "compliance_subject_rights_requests" DROP CONSTRAINT "compliance_subject_rights_requests_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "compliance_subject_rights_requests_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "compliance_tcra_records" DROP CONSTRAINT "compliance_tcra_records_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "compliance_tcra_records_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "compliance_tra_records" DROP CONSTRAINT "compliance_tra_records_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "compliance_tra_records_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "enabler_outbox_events" DROP CONSTRAINT "enabler_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "enabler_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "enabler_tasks" ALTER COLUMN "productIds" DROP DEFAULT,
ALTER COLUMN "categoryIds" DROP DEFAULT,
ALTER COLUMN "channels" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "event_logs" DROP CONSTRAINT "event_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "event_store" DROP CONSTRAINT "event_store_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "event_store_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "global_outbox_events" DROP CONSTRAINT "global_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "global_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "inventory_count_items" DROP CONSTRAINT "inventory_count_items_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "inventoryCountId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productVariantId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "warehouseId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "inventory_count_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "inventory_counts" DROP CONSTRAINT "inventory_counts_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "warehouseId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productVariantId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "countedBy" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "approvedBy" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productVariantId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "warehouseId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "referenceId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "performedBy" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "inventory_outbox_events" DROP CONSTRAINT "inventory_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "inventory_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "inventory_reservations" DROP CONSTRAINT "inventory_reservations_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderItemId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productVariantId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "warehouseId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "inventory_stock_items" DROP CONSTRAINT "inventory_stock_items_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productVariantId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "warehouseId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "inventory_stock_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "inventory_warehouses" DROP CONSTRAINT "inventory_warehouses_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "inventory_warehouses_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "logistics_couriers" DROP CONSTRAINT "logistics_couriers_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "logistics_couriers_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "logistics_deliveries" DROP CONSTRAINT "logistics_deliveries_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "courierId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "logistics_deliveries_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "logistics_earnings" DROP CONSTRAINT "logistics_earnings_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "courierId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "logistics_earnings_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "logistics_location_history" DROP CONSTRAINT "logistics_location_history_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "courierId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "logistics_location_history_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "logistics_outbox_events" DROP CONSTRAINT "logistics_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "logistics_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notification_delivery_logs" DROP CONSTRAINT "notification_delivery_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "notificationId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "notification_delivery_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notification_device_tokens" DROP CONSTRAINT "notification_device_tokens_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "notification_device_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notification_notifications" DROP CONSTRAINT "notification_notifications_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "templateId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "notification_notifications_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notification_preferences" DROP CONSTRAINT "notification_preferences_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notification_templates" DROP CONSTRAINT "notification_templates_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "createdBy" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "order_cod_disputes" DROP CONSTRAINT "order_cod_disputes_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "order_cod_disputes_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "productId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "order_outbox_events" DROP CONSTRAINT "order_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "order_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "order_payments" DROP CONSTRAINT "order_payments_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "order_saga_logs" DROP CONSTRAINT "order_saga_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sagaId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "order_saga_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "order_saga_step_logs" DROP CONSTRAINT "order_saga_step_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sagaId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "order_saga_step_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "order_settlements" DROP CONSTRAINT "order_settlements_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "order_settlements_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "orders" DROP CONSTRAINT "orders_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sellerId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "enablerId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "enablerCode" SET DATA TYPE TEXT,
ALTER COLUMN "deliveryCodeUsedAt" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payment_fraud_assessments" DROP CONSTRAINT "payment_fraud_assessments_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "payment_fraud_assessments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payment_outbox_events" DROP CONSTRAINT "payment_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "payment_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payment_refunds" DROP CONSTRAINT "payment_refunds_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "paymentId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payment_webhook_events" DROP CONSTRAINT "payment_webhook_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payments" DROP CONSTRAINT "payments_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "payments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payout_outbox_events" DROP CONSTRAINT "payout_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "payout_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "payout_payouts" DROP CONSTRAINT "payout_payouts_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "payout_payouts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "production_bulk_order_quotes" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "production_bulk_order_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "production_capacity_snapshots" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "saga_dead_letters" DROP CONSTRAINT "saga_dead_letters_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sagaId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "saga_dead_letters_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "saga_logs" DROP CONSTRAINT "saga_logs_pkey",
ALTER COLUMN "sagaId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "saga_logs_pkey" PRIMARY KEY ("sagaId");

-- AlterTable
ALTER TABLE "saga_step_logs" DROP CONSTRAINT "saga_step_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "sagaId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "saga_step_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "shared_outbox_events" DROP CONSTRAINT "shared_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "shared_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sms_messages" DROP CONSTRAINT "sms_messages_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "support_agents" DROP CONSTRAINT "support_agents_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "support_agents_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "support_outbox_events" DROP CONSTRAINT "support_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "support_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "support_ticket_attachments" DROP CONSTRAINT "support_ticket_attachments_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "ticketId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "messageId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "support_ticket_attachments_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "support_ticket_messages" DROP CONSTRAINT "support_ticket_messages_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "ticketId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "support_ticket_messages_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "support_ticket_status_history" DROP CONSTRAINT "support_ticket_status_history_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "ticketId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "support_ticket_status_history_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "assignedAgentId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_addresses" DROP CONSTRAINT "user_addresses_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_audit_logs" DROP CONSTRAINT "user_audit_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "user_audit_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_cod_history" DROP CONSTRAINT "user_cod_history_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "orderId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "user_cod_history_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_email_verification_tokens" DROP CONSTRAINT "user_email_verification_tokens_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "user_email_verification_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_outbox_events" DROP CONSTRAINT "user_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "user_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_password_reset_tokens" DROP CONSTRAINT "user_password_reset_tokens_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "user_password_reset_tokens_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_service_user_indexes" ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64);

-- AlterTable
ALTER TABLE "user_sessions" DROP CONSTRAINT "user_sessions_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "user_two_factor_auth" DROP CONSTRAINT "user_two_factor_auth_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "user_two_factor_auth_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "wallet_audit_logs" DROP CONSTRAINT "wallet_audit_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "entityId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "wallet_audit_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "wallet_holds" DROP CONSTRAINT "wallet_holds_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "walletId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "wallet_holds_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "wallet_idempotency_records" DROP CONSTRAINT "wallet_idempotency_records_pkey",
ALTER COLUMN "key" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "wallet_idempotency_records_pkey" PRIMARY KEY ("key");

-- AlterTable
ALTER TABLE "wallet_outbox_events" DROP CONSTRAINT "wallet_outbox_events_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "wallet_outbox_events_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "wallet_transactions" DROP CONSTRAINT "wallet_transactions_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "walletId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "referenceId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "correlationId" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "reversalTransactionId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "wallets" DROP CONSTRAINT "wallets_pkey",
ALTER COLUMN "id" SET DATA TYPE VARCHAR(64),
ALTER COLUMN "userId" SET DATA TYPE VARCHAR(64),
ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" VARCHAR(64) NOT NULL,
    "type" "Chat_ConversationType" NOT NULL,
    "moderationStatus" "Chat_ModerationStatus" NOT NULL DEFAULT 'ACTIVE',
    "relatedProductId" VARCHAR(64),
    "relatedOrderId" VARCHAR(64),
    "relatedShipmentId" VARCHAR(64),
    "relatedSupplierRequestId" VARCHAR(64),
    "metadata" JSONB,
    "lastMessageAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversation_participants" (
    "conversationId" VARCHAR(64) NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "role" "Chat_ParticipantRole" NOT NULL,
    "lastReadAt" TIMESTAMP(6),
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_conversation_participants_pkey" PRIMARY KEY ("conversationId","userId")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" VARCHAR(64) NOT NULL,
    "conversationId" VARCHAR(64) NOT NULL,
    "senderId" VARCHAR(64) NOT NULL,
    "type" "Chat_MessageType" NOT NULL,
    "content" TEXT,
    "metadata" JSONB,
    "moderationStatus" "Chat_ModerationStatus" NOT NULL DEFAULT 'ACTIVE',
    "spamScore" INTEGER,
    "isDisputeEvidence" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_user_blocks" (
    "blockerId" VARCHAR(64) NOT NULL,
    "blockedId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_user_blocks_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateTable
CREATE TABLE "chat_moderation_reports" (
    "id" VARCHAR(64) NOT NULL,
    "reporterId" VARCHAR(64) NOT NULL,
    "messageId" VARCHAR(64) NOT NULL,
    "conversationId" VARCHAR(64) NOT NULL,
    "reason" TEXT NOT NULL,
    "reportedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_moderation_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_spam_score_logs" (
    "id" VARCHAR(64) NOT NULL,
    "messageId" VARCHAR(64) NOT NULL,
    "score" INTEGER NOT NULL,
    "signals" JSONB NOT NULL,
    "computedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_spam_score_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_checkout_links" (
    "id" VARCHAR(64) NOT NULL,
    "conversationId" VARCHAR(64) NOT NULL,
    "messageId" VARCHAR(64) NOT NULL,
    "checkoutUrl" TEXT NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(6) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_checkout_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_conversations_relatedOrderId_idx" ON "chat_conversations"("relatedOrderId");

-- CreateIndex
CREATE INDEX "chat_conversations_relatedProductId_idx" ON "chat_conversations"("relatedProductId");

-- CreateIndex
CREATE INDEX "chat_conversations_lastMessageAt_idx" ON "chat_conversations"("lastMessageAt");

-- CreateIndex
CREATE INDEX "chat_conversation_participants_userId_idx" ON "chat_conversation_participants"("userId");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "chat_messages_senderId_idx" ON "chat_messages"("senderId");

-- CreateIndex
CREATE INDEX "chat_user_blocks_blockedId_idx" ON "chat_user_blocks"("blockedId");

-- CreateIndex
CREATE INDEX "chat_moderation_reports_conversationId_idx" ON "chat_moderation_reports"("conversationId");

-- CreateIndex
CREATE INDEX "chat_moderation_reports_reporterId_idx" ON "chat_moderation_reports"("reporterId");

-- CreateIndex
CREATE INDEX "chat_spam_score_logs_messageId_idx" ON "chat_spam_score_logs"("messageId");

-- CreateIndex
CREATE INDEX "chat_checkout_links_conversationId_idx" ON "chat_checkout_links"("conversationId");

-- CreateIndex
CREATE INDEX "chat_checkout_links_expiresAt_idx" ON "chat_checkout_links"("expiresAt");

-- AddForeignKey
ALTER TABLE "analytics_seller_daily_sales" ADD CONSTRAINT "analytics_seller_daily_sales_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_seller_product_performance" ADD CONSTRAINT "analytics_seller_product_performance_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_seller_inventory_health" ADD CONSTRAINT "analytics_seller_inventory_health_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_seller_action_items" ADD CONSTRAINT "analytics_seller_action_items_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Analytics_SellerMetrics"("sellerId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_two_factor_auth" ADD CONSTRAINT "user_two_factor_auth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_password_reset_tokens" ADD CONSTRAINT "auth_password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_email_verification_tokens" ADD CONSTRAINT "auth_email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_audit_logs" ADD CONSTRAINT "auth_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_role_requests" ADD CONSTRAINT "auth_role_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessregistry_business_addresses" ADD CONSTRAINT "businessregistry_business_addresses_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businessregistry_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessregistry_business_documents" ADD CONSTRAINT "businessregistry_business_documents_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businessregistry_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "businessregistry_compliance_records" ADD CONSTRAINT "businessregistry_compliance_records_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businessregistry_businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "catalog_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "catalog_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_supplierLocationId_fkey" FOREIGN KEY ("supplierLocationId") REFERENCES "businessregistry_business_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_buy_box_alternatives" ADD CONSTRAINT "catalog_buy_box_alternatives_buyBoxId_fkey" FOREIGN KEY ("buyBoxId") REFERENCES "catalog_buy_boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_product_variants" ADD CONSTRAINT "catalog_product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_category_attributes" ADD CONSTRAINT "catalog_category_attributes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "catalog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_product_attributes" ADD CONSTRAINT "catalog_product_attributes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "catalog_product_attributes" ADD CONSTRAINT "catalog_product_attributes_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "catalog_category_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout_CartItem" ADD CONSTRAINT "Checkout_CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Checkout_Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkout_OrderItem" ADD CONSTRAINT "Checkout_OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Checkout_Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "community_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "community_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_likes" ADD CONSTRAINT "community_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "community_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_likes" ADD CONSTRAINT "community_likes_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_likes" ADD CONSTRAINT "community_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_shares" ADD CONSTRAINT "community_shares_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_shares" ADD CONSTRAINT "community_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_follows" ADD CONSTRAINT "community_follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_bookmarks" ADD CONSTRAINT "community_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "community_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock_items" ADD CONSTRAINT "inventory_stock_items_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "inventory_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_productVariantId_warehouseId_fkey" FOREIGN KEY ("productVariantId", "warehouseId") REFERENCES "inventory_stock_items"("productVariantId", "warehouseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "inventory_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productVariantId_warehouseId_fkey" FOREIGN KEY ("productVariantId", "warehouseId") REFERENCES "inventory_stock_items"("productVariantId", "warehouseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "inventory_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "inventory_warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_inventoryCountId_fkey" FOREIGN KEY ("inventoryCountId") REFERENCES "inventory_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_productVariantId_warehouseId_fkey" FOREIGN KEY ("productVariantId", "warehouseId") REFERENCES "inventory_stock_items"("productVariantId", "warehouseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_deliveries" ADD CONSTRAINT "logistics_deliveries_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "logistics_couriers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_location_history" ADD CONSTRAINT "logistics_location_history_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "logistics_couriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logistics_earnings" ADD CONSTRAINT "logistics_earnings_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "logistics_couriers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_notifications" ADD CONSTRAINT "notification_notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_delivery_logs" ADD CONSTRAINT "notification_delivery_logs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notification_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_cod_disputes" ADD CONSTRAINT "order_cod_disputes_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_settlements" ADD CONSTRAINT "order_settlements_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_saga_step_logs" ADD CONSTRAINT "order_saga_step_logs_sagaId_fkey" FOREIGN KEY ("sagaId") REFERENCES "order_saga_logs"("sagaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training_TrainingRecord" ADD CONSTRAINT "Training_TrainingRecord_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Training_TrainingModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_cod_history" ADD CONSTRAINT "user_cod_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_password_reset_tokens" ADD CONSTRAINT "user_password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_email_verification_tokens" ADD CONSTRAINT "user_email_verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_audit_logs" ADD CONSTRAINT "user_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_holds" ADD CONSTRAINT "wallet_holds_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "support_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_messages" ADD CONSTRAINT "support_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "support_ticket_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_attachments" ADD CONSTRAINT "support_ticket_attachments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_ticket_status_history" ADD CONSTRAINT "support_ticket_status_history_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_pricing_rules" ADD CONSTRAINT "campaign_pricing_rules_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_conditions" ADD CONSTRAINT "campaign_conditions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_products" ADD CONSTRAINT "campaign_products_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_categories" ADD CONSTRAINT "campaign_categories_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_thread_answers" ADD CONSTRAINT "community_thread_answers_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "community_discussion_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_article_reviews" ADD CONSTRAINT "community_article_reviews_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "community_knowledge_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_challenge_solutions" ADD CONSTRAINT "community_challenge_solutions_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "community_business_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saga_step_logs" ADD CONSTRAINT "saga_step_logs_sagaId_fkey" FOREIGN KEY ("sagaId") REFERENCES "saga_logs"("sagaId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_conversation_participants" ADD CONSTRAINT "chat_conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_spam_score_logs" ADD CONSTRAINT "chat_spam_score_logs_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
