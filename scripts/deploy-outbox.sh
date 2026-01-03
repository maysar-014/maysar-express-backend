#!/bin/bash

# Deploy outbox tables to all services
# Run this script to add outbox pattern to existing services

SERVICES=("order-service" "payment-service" "inventory-service")

echo "🚀 Deploying Outbox Pattern to all services..."

for service in "${SERVICES[@]}"; do
  echo "📦 Processing $service..."
  
  SERVICE_DIR="./services/$service"
  
  if [ ! -d "$SERVICE_DIR" ]; then
    echo "❌ Service directory not found: $SERVICE_DIR"
    continue
  fi
  
  # Create migrations directory if it doesn't exist
  mkdir -p "$SERVICE_DIR/migrations"
  
  # Copy outbox migration
  cat > "$SERVICE_DIR/migrations/001_create_outbox.sql" << 'EOF'
-- CreateOutboxTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outbox_events_eventId_key" ON "outbox_events"("eventId");
CREATE INDEX "outbox_events_status_nextRetryAt_idx" ON "outbox_events"("status", "nextRetryAt");
CREATE INDEX "outbox_events_createdAt_idx" ON "outbox_events"("createdAt");
EOF

  # Create outbox worker
  mkdir -p "$SERVICE_DIR/src"
  cat > "$SERVICE_DIR/src/outboxWorker.ts" << 'EOF'
import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox } from '../../../shared/outbox/outboxPattern';
import { OutboxPublisher } from '../../../shared/outbox/outboxPublisher';
import { enhancedEventBus } from '../../../src/events/eventBus';

const prisma = new PrismaClient();
const outbox = new TransactionalOutbox(prisma);
const publisher = new OutboxPublisher(outbox, enhancedEventBus);

publisher.start();

process.on('SIGTERM', () => {
  publisher.stop();
  prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', () => {
  publisher.stop();
  prisma.$disconnect();
  process.exit(0);
});

console.log(`${process.env.SERVICE_NAME || 'service'} outbox publisher started`);
EOF

  echo "✅ $service outbox pattern deployed"
done

echo "🎉 Outbox pattern deployment complete!"
echo ""
echo "Next steps:"
echo "1. Run migrations: npx prisma migrate dev"
echo "2. Start outbox workers: npm run start:outbox"
echo "3. Update service code to use TransactionalOutbox"