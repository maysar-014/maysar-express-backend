ALTER TABLE "catalog_products"
ADD COLUMN IF NOT EXISTS "supplierLocation" VARCHAR(100);

UPDATE "catalog_products"
SET "supplierLocation" = NULLIF(TRIM("seoMetadata"->>'supplierLocation'), '')
WHERE COALESCE(TRIM("supplierLocation"), '') = ''
  AND COALESCE(TRIM("seoMetadata"->>'supplierLocation'), '') <> '';

CREATE INDEX IF NOT EXISTS "catalog_products_supplierLocation_idx"
ON "catalog_products"("supplierLocation");
