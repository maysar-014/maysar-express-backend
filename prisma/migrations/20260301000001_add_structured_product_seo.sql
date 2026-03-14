-- CreateTable CategoryAttribute
CREATE TABLE IF NOT EXISTS "catalog_category_attributes" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "displayLabel" VARCHAR(150) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "options" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "placeholder" VARCHAR(200),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_category_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable ProductAttribute
CREATE TABLE IF NOT EXISTS "catalog_product_attributes" (
    "id" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "attributeId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "catalog_product_attributes_pkey" PRIMARY KEY ("id")
);

-- Add slug column (nullable initially)
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(300);

-- Add SEO fields
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "seoTitle" VARCHAR(160);
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "shortSeoDescription" VARCHAR(160);
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "generatedDescription" TEXT;
ALTER TABLE "catalog_products" ADD COLUMN IF NOT EXISTS "qualityScore" INTEGER NOT NULL DEFAULT 0;

-- Backfill slug with collision-safe deterministic suffix, reserving space for suffix before truncation
WITH slug_data AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY 
        LOWER(COALESCE(brand, 'product')),
        LOWER(COALESCE(title, 'item'))
      ORDER BY "createdAt" ASC
    ) as rn,
    CONCAT(
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(brand, 'product'), ' ', '-', 'g'), '[^a-z0-9-]', '', 'g'), '-+', '-', 'g')),
      '-',
      LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(title, 'item'), ' ', '-', 'g'), '[^a-z0-9-]', '', 'g'), '-+', '-', 'g'))
    ) as base_slug
  FROM "catalog_products"
  WHERE "slug" IS NULL
)
UPDATE "catalog_products" p
SET "slug" = CASE 
  WHEN sd.rn = 1 THEN SUBSTRING(sd.base_slug, 1, 290)
  ELSE SUBSTRING(CONCAT(sd.base_slug, '-', LPAD(sd.rn::text, 5, '0')), 1, 300)
END
FROM slug_data sd
WHERE p.id = sd.id;

-- Ensure all products have a slug (fallback for any missed)
UPDATE "catalog_products"
SET "slug" = SUBSTRING(CONCAT('product-', id), 1, 300)
WHERE "slug" IS NULL;

-- Make slug NOT NULL and add unique constraint
ALTER TABLE "catalog_products" ALTER COLUMN "slug" SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_slug_unique" UNIQUE ("slug");
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "catalog_category_attributes_categoryId_idx" ON "catalog_category_attributes"("categoryId");
CREATE INDEX IF NOT EXISTS "catalog_product_attributes_productId_idx" ON "catalog_product_attributes"("productId");
CREATE INDEX IF NOT EXISTS "catalog_product_attributes_attributeId_idx" ON "catalog_product_attributes"("attributeId");
CREATE INDEX IF NOT EXISTS "catalog_products_slug_idx" ON "catalog_products"("slug");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "catalog_category_attributes" ADD CONSTRAINT "catalog_category_attributes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "catalog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "catalog_product_attributes" ADD CONSTRAINT "catalog_product_attributes_productId_fkey" FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  ALTER TABLE "catalog_product_attributes" ADD CONSTRAINT "catalog_product_attributes_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "catalog_category_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
