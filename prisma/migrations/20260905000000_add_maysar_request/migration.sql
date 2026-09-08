-- Maysar Request — Phase 1 MVP (docs/requests/MAYSAR_REQUEST_BACKLOG.md)
-- Request lifecycle, conversation, assessment, quotes, secure access links
-- + Order_Order.requestQuoteId idempotency anchor (§1.6).

-- ── Request_Request ─────────────────────────────────────────────────────────
CREATE TABLE "request_requests" (
    "id" VARCHAR(64) NOT NULL,
    "customerId" VARCHAR(64) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" TEXT NOT NULL,
    "deliveryAddress" JSONB NOT NULL,
    "preferredDeliveryDate" TIMESTAMP(3),
    "budgetTzs" INTEGER,
    "attachments" JSONB,
    "status" VARCHAR(32) NOT NULL,
    "assignedProviderId" VARCHAR(64),
    "unfulfillableReason" TEXT,
    "orderId" VARCHAR(64),
    "convertedQuoteId" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_requests_customerId_idx" ON "request_requests"("customerId");
CREATE INDEX "request_requests_assignedProviderId_idx" ON "request_requests"("assignedProviderId");
CREATE INDEX "request_requests_status_idx" ON "request_requests"("status");

-- ── Request_Message ─────────────────────────────────────────────────────────
CREATE TABLE "request_messages" (
    "id" VARCHAR(64) NOT NULL,
    "requestId" VARCHAR(64) NOT NULL,
    "authorType" VARCHAR(32) NOT NULL,
    "authorId" VARCHAR(64),
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_messages_requestId_createdAt_idx" ON "request_messages"("requestId", "createdAt");

ALTER TABLE "request_messages" ADD CONSTRAINT "request_messages_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "request_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Request_Assessment ──────────────────────────────────────────────────────
CREATE TABLE "request_assessments" (
    "id" VARCHAR(64) NOT NULL,
    "requestId" VARCHAR(64) NOT NULL,
    "providerId" VARCHAR(64) NOT NULL,
    "decision" VARCHAR(32) NOT NULL,
    "unfulfillableReason" TEXT,
    "internalNotes" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_assessments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_assessments_requestId_idx" ON "request_assessments"("requestId");

ALTER TABLE "request_assessments" ADD CONSTRAINT "request_assessments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "request_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Request_Quote ───────────────────────────────────────────────────────────
CREATE TABLE "request_quotes" (
    "id" VARCHAR(64) NOT NULL,
    "requestId" VARCHAR(64) NOT NULL,
    "createdByProviderId" VARCHAR(64) NOT NULL,
    "label" VARCHAR(40) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "items" JSONB NOT NULL,
    "procurementCostTzs" INTEGER NOT NULL,
    "logisticsCostTzs" INTEGER NOT NULL,
    "sellingPriceTzs" INTEGER NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL,
    "warrantyNote" TEXT,
    "explanation" TEXT,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_quotes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "request_quotes_requestId_status_idx" ON "request_quotes"("requestId", "status");

ALTER TABLE "request_quotes" ADD CONSTRAINT "request_quotes_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "request_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Request_AccessLink ──────────────────────────────────────────────────────
CREATE TABLE "request_access_links" (
    "id" VARCHAR(64) NOT NULL,
    "requestId" VARCHAR(64) NOT NULL,
    "quoteId" VARCHAR(64) NOT NULL,
    "customerId" VARCHAR(64) NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "status" VARCHAR(16) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_access_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "request_access_links_tokenHash_key" ON "request_access_links"("tokenHash");
CREATE INDEX "request_access_links_requestId_idx" ON "request_access_links"("requestId");
CREATE INDEX "request_access_links_quoteId_idx" ON "request_access_links"("quoteId");

ALTER TABLE "request_access_links" ADD CONSTRAINT "request_access_links_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "request_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "request_access_links" ADD CONSTRAINT "request_access_links_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "request_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Request_OutboxEvent ─────────────────────────────────────────────────────
CREATE TABLE "request_outbox_events" (
    "id" VARCHAR(64) NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),

    CONSTRAINT "request_outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "request_outbox_events_eventId_key" ON "request_outbox_events"("eventId");
CREATE INDEX "request_outbox_events_status_nextRetryAt_idx" ON "request_outbox_events"("status", "nextRetryAt");
CREATE INDEX "request_outbox_events_createdAt_idx" ON "request_outbox_events"("createdAt");

-- ── Order_Order.requestQuoteId (idempotency anchor, §1.6) ───────────────────
ALTER TABLE "orders" ADD COLUMN "requestQuoteId" VARCHAR(64);
CREATE UNIQUE INDEX "orders_requestQuoteId_key" ON "orders"("requestQuoteId");
