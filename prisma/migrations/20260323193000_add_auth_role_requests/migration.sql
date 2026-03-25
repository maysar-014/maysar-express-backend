CREATE TABLE "auth_role_requests" (
    "id" VARCHAR(64) NOT NULL,
    "userId" VARCHAR(64) NOT NULL,
    "requestedRole" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "justification" TEXT,
    "metadata" JSONB,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" VARCHAR(64),
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_role_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_role_requests_userId_status_idx" ON "auth_role_requests"("userId", "status");
CREATE INDEX "auth_role_requests_requestedRole_status_idx" ON "auth_role_requests"("requestedRole", "status");

ALTER TABLE "auth_role_requests"
ADD CONSTRAINT "auth_role_requests_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "auth_users"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "orders"
ADD COLUMN "cancelledAt" TIMESTAMP(3),
ADD COLUMN "cancellationReason" TEXT;
