-- Migration: add_free_delivery_to_product
-- Adds freeDelivery boolean flag to catalog_products, mirroring codAccepted.
-- Sellers can mark a product as offering free delivery.
-- When true, the order service uses the logistics estimate as the COD commitment fee.

ALTER TABLE catalog_products ADD COLUMN IF NOT EXISTS "freeDelivery" BOOLEAN NOT NULL DEFAULT false;
