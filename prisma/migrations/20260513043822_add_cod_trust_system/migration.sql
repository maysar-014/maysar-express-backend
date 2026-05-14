-- CreateTable
CREATE TABLE "order_cod_trust_scores" (
    "id" VARCHAR(64) NOT NULL,
    "buyerId" VARCHAR(64) NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "tier" VARCHAR(32) NOT NULL DEFAULT 'NEW_BUYER',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_cod_trust_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_cod_score_events" (
    "id" VARCHAR(64) NOT NULL,
    "buyerId" VARCHAR(64) NOT NULL,
    "signalType" VARCHAR(64) NOT NULL,
    "delta" INTEGER NOT NULL,
    "scoreBefore" INTEGER NOT NULL,
    "scoreAfter" INTEGER NOT NULL,
    "sourceService" VARCHAR(64) NOT NULL,
    "sourceEntityId" VARCHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_cod_score_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_cod_restrictions" (
    "id" VARCHAR(64) NOT NULL,
    "buyerId" VARCHAR(64) NOT NULL,
    "reason" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "permanent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_cod_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_cod_trust_scores_buyerId_key" ON "order_cod_trust_scores"("buyerId");

-- CreateIndex
CREATE INDEX "order_cod_trust_scores_buyerId_idx" ON "order_cod_trust_scores"("buyerId");

-- CreateIndex
CREATE INDEX "order_cod_score_events_buyerId_createdAt_idx" ON "order_cod_score_events"("buyerId", "createdAt");

-- CreateIndex
CREATE INDEX "order_cod_restrictions_buyerId_endsAt_idx" ON "order_cod_restrictions"("buyerId", "endsAt");
