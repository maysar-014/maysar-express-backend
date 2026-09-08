-- CreateEnum not needed: actorType/action are free-form strings (validated at domain layer)
CREATE TABLE "request_audit_logs" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "request_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "request_audit_logs_auditId_key" ON "request_audit_logs"("auditId");
CREATE INDEX "request_audit_logs_requestId_createdAt_idx" ON "request_audit_logs"("requestId" , "createdAt");
