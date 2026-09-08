-- Maysar Request Phase 2 — sourcing, custom items & procurement.
-- 1. request_items (first-class non-catalog items)
-- 2. request_suppliers (fulfillment-source registry, not Maysar sellers)
-- 3. request_sources (item → supplier procurement options)
-- 4. request_procurements (post-order Order → Item → Supplier map)
-- Plus: canonical MAYSAR_INVENTORY supplier row + item backfill from the
-- Phase 1 quote JSON (`request_quotes.items`).

CREATE TABLE "request_items" (
    "id" VARCHAR(64) NOT NULL,
    "requestId" VARCHAR(64) NOT NULL,
    "quoteId" VARCHAR(64),
    "description" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceTzs" INTEGER NOT NULL,
    "specifications" JSONB,
    "warranty" VARCHAR(255),
    "sourceType" VARCHAR(24) NOT NULL,
    "catalogProductId" VARCHAR(64),
    "fulfillmentNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_suppliers" (
    "id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "contact" JSONB NOT NULL,
    "source" VARCHAR(24) NOT NULL,
    "discoveredViaRequestId" VARCHAR(64),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_sources" (
    "id" VARCHAR(64) NOT NULL,
    "itemId" VARCHAR(64) NOT NULL,
    "supplierId" VARCHAR(64),
    "agreedPriceTzs" INTEGER NOT NULL,
    "availability" VARCHAR(24) NOT NULL,
    "availableUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "request_procurements" (
    "id" VARCHAR(64) NOT NULL,
    "orderId" VARCHAR(64) NOT NULL,
    "itemId" VARCHAR(64) NOT NULL,
    "supplierId" VARCHAR(64) NOT NULL,
    "sourceId" VARCHAR(64),
    "agreedPriceTzs" INTEGER NOT NULL,
    "procurementStatus" VARCHAR(24) NOT NULL,
    "orderedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_procurements_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "request_items_requestId_idx" ON "request_items"("requestId");
CREATE INDEX "request_items_quoteId_idx" ON "request_items"("quoteId");
CREATE INDEX "request_suppliers_source_idx" ON "request_suppliers"("source");
CREATE INDEX "request_sources_itemId_idx" ON "request_sources"("itemId");
CREATE INDEX "request_sources_supplierId_idx" ON "request_sources"("supplierId");
CREATE INDEX "request_procurements_orderId_idx" ON "request_procurements"("orderId");
CREATE INDEX "request_procurements_itemId_idx" ON "request_procurements"("itemId");

-- Foreign keys
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "request_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_items" ADD CONSTRAINT "request_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "request_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "request_sources" ADD CONSTRAINT "request_sources_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "request_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_sources" ADD CONSTRAINT "request_sources_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "request_suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "request_procurements" ADD CONSTRAINT "request_procurements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "request_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "request_procurements" ADD CONSTRAINT "request_procurements_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "request_suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "request_procurements" ADD CONSTRAINT "request_procurements_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "request_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Canonical MAYSAR_INVENTORY supplier (used for items sourced from Maysar's
-- own inventory — §2.2: sourceType = MAYSAR_INVENTORY has no external supplier).
INSERT INTO "request_suppliers" ("id", "name", "contact", "source", "isActive", "notes", "createdAt")
VALUES (
    'sup_maysar_inventory',
    'Maysar Own Inventory',
    '{"note": "Internal Maysar inventory — not an external supplier"}'::jsonb,
    'KNOWN',
    true,
    'Canonical supplier row for MAYSAR_INVENTORY items; referenced by Request_Procurement.supplierId.',
    CURRENT_TIMESTAMP
);

-- Backfill first-class items from the Phase 1 opaque quote JSON. Each JSON
-- entry becomes a Request_Item row bound to the quote. sourceType defaults to
-- EXTERNAL_SUPPLIER (Phase 1 quotes carried no sourcing metadata).
INSERT INTO "request_items" ("id", "requestId", "quoteId", "description", "quantity", "unitPriceTzs", "specifications", "warranty", "sourceType", "catalogProductId", "fulfillmentNote", "createdAt")
SELECT
    'rit_bf_' || substr(md5(q.id || ':' || ord::text), 1, 20),
    q."requestId",
    q.id,
    it->>'description',
    COALESCE((it->>'quantity')::int, 1),
    COALESCE((it->>'unitPriceTzs')::int, 0),
    CASE WHEN it ? 'specifications' THEN (it->'specifications')::jsonb ELSE NULL END,
    it->>'warranty',
    'EXTERNAL_SUPPLIER',
    NULL,
    NULL,
    COALESCE(q."createdAt", CURRENT_TIMESTAMP)
FROM "request_quotes" q,
     jsonb_array_elements(COALESCE(q."items", '[]'::jsonb)) WITH ORDINALITY AS t(it, ord);