ALTER TABLE "catalog_products"
ADD COLUMN "supplierLocationId" TEXT;

CREATE INDEX "catalog_products_supplierLocationId_idx"
ON "catalog_products"("supplierLocationId");

ALTER TABLE "catalog_products"
ADD CONSTRAINT "catalog_products_supplierLocationId_fkey"
FOREIGN KEY ("supplierLocationId")
REFERENCES "businessregistry_business_addresses"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
