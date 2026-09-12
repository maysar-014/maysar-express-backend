-- Chat moderation overhaul:
--  1. Persist WHY a message was flagged/blocked (human-readable reason + engine signals)
--  2. Admin review trail for flagged/blocked messages
--  3. Admin-managed suspicious phrase/pattern registry (dynamic, incl. Tanzanian Swahili)
--  4. Emerging-pattern mining (dynamic detection beyond the predefined list)
--
-- Prisma enum types must exist before the tables that reference them.

CREATE TYPE "Chat_AdminReviewAction" AS ENUM ('APPROVE', 'CONFIRM_BLOCK', 'DELETE');

CREATE TYPE "Chat_PhraseMatchType" AS ENUM ('SUBSTRING', 'REGEX');
CREATE TYPE "Chat_PhraseLanguage" AS ENUM ('EN', 'SW', 'OTHER');
CREATE TYPE "Chat_PhraseAction" AS ENUM ('FLAG', 'BLOCK');
CREATE TYPE "Chat_PhraseSource" AS ENUM ('SEED', 'ADMIN', 'AUTO');

CREATE TYPE "Chat_EmergingPatternStatus" AS ENUM ('PENDING', 'PROMOTED', 'DISMISSED');

ALTER TABLE "chat_messages" ADD COLUMN "moderationReason" VARCHAR(1000);
ALTER TABLE "chat_messages" ADD COLUMN "moderationSignals" JSONB;

CREATE TABLE "chat_moderation_actions" (
    "id" VARCHAR(64) NOT NULL,
    "messageId" VARCHAR(64) NOT NULL,
    "adminId" VARCHAR(64) NOT NULL,
    "action" "Chat_AdminReviewAction" NOT NULL,
    "notes" VARCHAR(500),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_moderation_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "chat_moderation_actions_messageId_idx" ON "chat_moderation_actions"("messageId");

CREATE TABLE "chat_suspicious_phrases" (
    "id" VARCHAR(64) NOT NULL,
    "phrase" VARCHAR(300) NOT NULL,
    "matchType" "Chat_PhraseMatchType" NOT NULL DEFAULT 'SUBSTRING',
    "language" "Chat_PhraseLanguage" NOT NULL DEFAULT 'EN',
    "category" VARCHAR(64) NOT NULL,
    "description" VARCHAR(500),
    "weight" INTEGER NOT NULL DEFAULT 70,
    "action" "Chat_PhraseAction" NOT NULL DEFAULT 'FLAG',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" "Chat_PhraseSource" NOT NULL DEFAULT 'ADMIN',
    "timesMatched" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "chat_suspicious_phrases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_suspicious_phrases_phrase_key" ON "chat_suspicious_phrases"("phrase");
CREATE INDEX "chat_suspicious_phrases_isActive_idx" ON "chat_suspicious_phrases"("isActive");
CREATE INDEX "chat_suspicious_phrases_category_idx" ON "chat_suspicious_phrases"("category");

CREATE TABLE "chat_emerging_patterns" (
    "id" VARCHAR(64) NOT NULL,
    "phrase" VARCHAR(300) NOT NULL,
    "occurrences" INTEGER NOT NULL DEFAULT 0,
    "conversationCount" INTEGER NOT NULL DEFAULT 0,
    "sampleMessageIds" JSONB,
    "status" "Chat_EmergingPatternStatus" NOT NULL DEFAULT 'PENDING',
    "firstSeenAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_emerging_patterns_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "chat_emerging_patterns_phrase_key" ON "chat_emerging_patterns"("phrase");