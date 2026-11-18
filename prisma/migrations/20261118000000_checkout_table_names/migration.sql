-- Migration: checkout_table_names
-- MYS-DB-001 Article M-001 / Migration Batch B
--
-- Renames 7 Checkout_* tables from Prisma-generated PascalCase to snake_case.
-- This is a coordinated migration: deploy together with the application version
-- that uses the new @@map names.
--
-- All renames use ALTER TABLE ... RENAME TO which is atomic in PostgreSQL and
-- does not rebuild indexes, constraints, or sequences.
-- Foreign keys on these tables are preserved automatically.
--
-- Rollback: reverse each RENAME (new → old).

-- Checkout_Cart → checkout_carts
ALTER TABLE IF EXISTS "Checkout_Cart" RENAME TO "checkout_carts";

-- Checkout_CartItem → checkout_cart_items
ALTER TABLE IF EXISTS "Checkout_CartItem" RENAME TO "checkout_cart_items";

-- Checkout_CheckoutSession → checkout_sessions
ALTER TABLE IF EXISTS "Checkout_CheckoutSession" RENAME TO "checkout_sessions";

-- Checkout_Order → checkout_orders
ALTER TABLE IF EXISTS "Checkout_Order" RENAME TO "checkout_orders";

-- Checkout_OrderItem → checkout_order_items
ALTER TABLE IF EXISTS "Checkout_OrderItem" RENAME TO "checkout_order_items";

-- Checkout_InventoryReservation → checkout_inventory_reservations
ALTER TABLE IF EXISTS "Checkout_InventoryReservation" RENAME TO "checkout_inventory_reservations";

-- Checkout_AppliedDiscount → checkout_applied_discounts
ALTER TABLE IF EXISTS "Checkout_AppliedDiscount" RENAME TO "checkout_applied_discounts";
