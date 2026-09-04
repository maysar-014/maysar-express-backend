-- Migration: Add seller stock verification enum values
-- Alters Order_OrderStatus enum to add new values in a separate transaction

ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_SELLER_VERIFICATION';
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'SELLER_VERIFIED';
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'SELLER_DECLINED';
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'VERIFICATION_OVERDUE';
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'UNDER_ADMIN_REVIEW';
