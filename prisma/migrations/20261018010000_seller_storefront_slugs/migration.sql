CREATE TABLE "catalog_seller_storefronts" (
    "sellerId" VARCHAR(64) NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "catalog_seller_storefronts_pkey" PRIMARY KEY ("sellerId")
);

CREATE UNIQUE INDEX "catalog_seller_storefronts_slug_key"
ON "catalog_seller_storefronts"("slug");
