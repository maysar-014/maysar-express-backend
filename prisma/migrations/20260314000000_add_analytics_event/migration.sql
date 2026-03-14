-- CreateTable Analytics_Event
CREATE TABLE IF NOT EXISTS "Analytics_Event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analytics_Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Analytics_Event_status_timestamp_idx" ON "Analytics_Event"("status", "timestamp");
CREATE INDEX IF NOT EXISTS "Analytics_Event_type_timestamp_idx" ON "Analytics_Event"("type", "timestamp");

