-- CreateTable
CREATE TABLE "event_logs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "consumerName" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_logs_eventId_idx" ON "event_logs"("eventId");

-- CreateIndex
CREATE INDEX "event_logs_consumerName_idx" ON "event_logs"("consumerName");

-- CreateIndex
CREATE UNIQUE INDEX "event_logs_eventId_consumerName_key" ON "event_logs"("eventId", "consumerName");
