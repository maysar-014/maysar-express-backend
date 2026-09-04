-- Migration: Add independent order workflows (Cart vs Direct) & seller verification chat fields

-- Create new ENUM types if not exists
DO $$ BEGIN
    CREATE TYPE "Order_OrderSource" AS ENUM ('CART', 'DIRECT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Order_OrderCompletionMethod" AS ENUM ('WALLET', 'DIRECT_PAYMENT', 'SELLER_VERIFICATION', 'COD', 'MOBILE_MONEY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alter Order_OrderStatus enum to add new values
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'DRAFT';
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'SELLER_REVIEWING';
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'SELLER_CONFIRMED';
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'SELLER_REJECTED';
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_PENDING';
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'ORDER_PLACED';
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "Order_OrderStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

-- Alter Order_PaymentMethod enum to add new values
ALTER TYPE "Order_PaymentMethod" ADD VALUE IF NOT EXISTS 'DIRECT_PAYMENT';
ALTER TYPE "Order_PaymentMethod" ADD VALUE IF NOT EXISTS 'SELLER_VERIFICATION';

-- Add new columns to orders table
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "orderSource" "Order_OrderSource" NOT NULL DEFAULT 'CART',
  ADD COLUMN IF NOT EXISTS "orderCompletionMethod" "Order_OrderCompletionMethod",
  ADD COLUMN IF NOT EXISTS "chatConversationId" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "declineReason" TEXT;
