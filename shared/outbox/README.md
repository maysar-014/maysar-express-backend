# Outbox Pattern Implementation

Transactional outbox pattern for guaranteed event publishing in distributed systems.

## 🎯 Purpose

- **Guaranteed Delivery**: Events published atomically with business operations
- **Consistency**: No lost events due to database/message broker failures  
- **Reliability**: Automatic retry with exponential backoff
- **Monitoring**: Track event publishing status and failures

## 🏗️ Architecture

```
Business Operation + Event → Database Transaction → Outbox Publisher → Event Bus
                                     ↓
                              [Order Created]     →     [Event Published]
                              [Outbox Entry]            [Status: SENT]
```

## 📁 Components

### TransactionalOutbox
Core outbox implementation with database operations.

```typescript
const outbox = new TransactionalOutbox(prisma);

// Save event in same transaction as business operation
await prisma.$transaction(async (tx) => {
  await tx.order.create({ data: orderData });
  await outbox.saveEvent(eventEnvelope, tx);
});
```

### OutboxPublisher
Background worker that publishes pending events.

```typescript
const publisher = new OutboxPublisher(outbox, eventBus);
publisher.start(); // Polls every 5 seconds
```

### Event States
- **PENDING**: Ready for publishing
- **PROCESSING**: Currently being published
- **SENT**: Successfully published
- **FAILED**: Failed with retry scheduled

## 🚀 Implementation

### 1. Add Outbox Table
```sql
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
```

### 2. Update Service Code
```typescript
export class OrderService {
  private outbox: TransactionalOutbox;

  constructor(private prisma: PrismaClient) {
    this.outbox = new TransactionalOutbox(prisma);
  }

  async createOrder(data: OrderData) {
    return await this.prisma.$transaction(async (tx) => {
      // Business operation
      const order = await tx.order.create({ data });
      
      // Event creation
      const envelope = createOrderCreatedEvent(order);
      await this.outbox.saveEvent(envelope, tx);
      
      return order;
    });
  }
}
```

### 3. Start Outbox Worker
```typescript
// outboxWorker.ts
const publisher = new OutboxPublisher(outbox, eventBus);
publisher.start();
```

## ⚙️ Configuration

```typescript
const publisher = new OutboxPublisher(outbox, eventBus, {
  pollInterval: 5000,    // Poll every 5 seconds
  batchSize: 50,         // Process 50 events per batch
  maxRetries: 5,         // Max retry attempts
  retryDelayMs: 30000    // 30 second retry delay
});
```

## 🔄 Retry Logic

- **Exponential Backoff**: 30s, 60s, 120s, 240s, 480s
- **Max Retries**: 5 attempts before permanent failure
- **Dead Letter Queue**: Failed events stored for manual investigation

## 📊 Monitoring

### Health Check
```typescript
const stats = await publisher.getStats();
// { pending: 5, processing: 2, sent: 1000, failed: 3 }
```

### Metrics to Track
- Pending events count
- Processing latency
- Failure rate
- Retry queue size

## 🧪 Testing

### Reliability Tests
```typescript
// Test transaction rollback
await expect(
  prisma.$transaction(async (tx) => {
    await outbox.saveEvent(event, tx);
    throw new Error('Rollback');
  })
).rejects.toThrow();

// Event should not exist
const events = await outbox.getPendingEvents();
expect(events).toHaveLength(0);
```

### Failure Scenarios
- Database connection loss
- Message broker unavailability  
- Service crashes during processing
- Network partitions

## 🚀 Deployment

### Automated Deployment
```bash
./scripts/deploy-outbox.sh
```

### Manual Steps
1. Add outbox table to each service database
2. Update service code to use TransactionalOutbox
3. Deploy outbox workers
4. Monitor event publishing

## ✅ Services Implemented

- ✅ **order-service**: Order creation events
- ✅ **payment-service**: Payment success/failure events  
- ✅ **inventory-service**: Reservation/release events
- 🔄 **seller-service**: KYC approval events
- 🔄 **logistics-service**: Delivery events

## 🎯 Benefits Achieved

1. **Zero Event Loss**: Guaranteed delivery through database transactions
2. **Consistency**: Business operations and events always in sync
3. **Reliability**: Automatic retry with failure handling
4. **Observability**: Complete visibility into event publishing
5. **Scalability**: Horizontal scaling of outbox workers

---

**Status**: ✅ COMPLETE - Outbox Pattern Implementation  
**Next Priority**: Idempotency Infrastructure