import { PrismaClient } from '@prisma/client';
import { TransactionalOutbox, OutboxStatus } from './outboxPattern';
import { EventEnvelope } from '../events/eventBus';
import { randomUUID } from 'crypto';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Outbox Pattern Reliability Tests', () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let outbox: TransactionalOutbox;

  beforeAll(async () => {
    // Start PostgreSQL container for isolated testing
    postgresContainer = await new PostgreSqlContainer('postgres:15-alpine')
      .withDatabase('test_db')
      .withUsername('test_user')
      .withPassword('test_pass')
      .start();

    const connectionString = postgresContainer.getConnectionUri();

    // Set DATABASE_URL for Prisma
    process.env.DATABASE_URL = connectionString;

    // Run migrations
    await execAsync('npx prisma migrate deploy');

    // Initialize Prisma client
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: connectionString
        }
      }
    });

    outbox = new TransactionalOutbox(prisma);
  }, 120000); // Increased timeout for container + migrations

  afterAll(async () => {
    await prisma.$disconnect();
    await postgresContainer.stop();
  });

  beforeEach(async () => {
    // Clean up outbox events before each test
    await prisma.outboxEvent.deleteMany();
    // Clean up any test orders if they exist
    try {
      await prisma.order_Order.deleteMany();
    } catch (error) {
      // Order table might not exist in all schemas, ignore error
    }
  });

  test('should save event in same transaction as business operation', async () => {
    const eventEnvelope: EventEnvelope = {
      eventType: 'test.event.v1',
      data: { test: 'data' },
      timestamp: new Date(),
      metadata: {
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'test-service',
        version: 'v1'
      },
      eventId: randomUUID(),
      correlationId: randomUUID()
    };

    await prisma.$transaction(async (tx) => {
      // Simulate business operation
      await tx.order.create({
        data: {
          id: randomUUID(),
          orderNumber: 'TEST-001',
          buyerId: randomUUID(),
          sellerId: randomUUID(),
          status: 'pending',
          totalAmount: 1000,
          currency: 'TZS'
        }
      });

      // Save event in same transaction
      await outbox.saveEvent(eventEnvelope, tx);
    });

    // Verify event was saved
    const events = await outbox.getPendingEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventId).toBe(eventEnvelope.eventId);
    expect(events[0].status).toBe(OutboxStatus.PENDING);
    
    // Verify stored envelope shape
    const storedEvent = JSON.parse(events[0].eventData as string);
    expect(storedEvent.data).toEqual({ test: 'data' });
    expect(storedEvent.metadata.producer).toBe('test-service');
  });

  test('should handle transaction rollback correctly', async () => {
    const eventEnvelope: EventEnvelope = {
      eventType: 'test.event.v1',
      data: { test: 'data' },
      timestamp: new Date(),
      metadata: {
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'test-service',
        version: 'v1'
      },
      eventId: randomUUID(),
      correlationId: randomUUID()
    };

    try {
      await prisma.$transaction(async (tx) => {
        // Save event
        await outbox.saveEvent(eventEnvelope, tx);

        // Force transaction rollback
        throw new Error('Simulated failure');
      });
    } catch (error) {
      // Expected error
    }

    // Verify event was NOT saved due to rollback
    const events = await outbox.getPendingEvents();
    expect(events).toHaveLength(0);
  });

  test('should retry failed events with exponential backoff', async () => {
    const eventEnvelope: EventEnvelope = {
      eventType: 'test.event.v1',
      data: { test: 'data' },
      timestamp: new Date(),
      metadata: {
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'test-service',
        version: 'v1'
      },
      eventId: randomUUID(),
      correlationId: randomUUID()
    };

    await outbox.saveEvent(eventEnvelope);

    // Mark as failed with retry
    const nextRetryAt = new Date(Date.now() + 30000); // 30 seconds
    await outbox.markAsFailed(eventEnvelope.eventId!, 'Test failure', nextRetryAt);

    // Verify retry scheduling
    const events = await prisma.outboxEvent.findMany({
      where: { eventId: eventEnvelope.eventId }
    });

    expect(events[0].status).toBe(OutboxStatus.FAILED);
    expect(events[0].attempts).toBe(1);
    expect(events[0].nextRetryAt).toEqual(nextRetryAt);
    expect(events[0].lastError).toBe('Test failure');
    
    // Verify stored envelope shape preserved
    const storedEvent = JSON.parse(events[0].eventData as string);
    expect(storedEvent.data).toEqual({ test: 'data' });
    expect(storedEvent.metadata.version).toBe('v1');
  });

  test('should not return events scheduled for future retry', async () => {
    const eventEnvelope: EventEnvelope = {
      eventType: 'test.event.v1',
      data: { test: 'data' },
      timestamp: new Date(),
      metadata: {
        eventId: randomUUID(),
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'test-service',
        version: 'v1'
      },
      eventId: randomUUID(),
      correlationId: randomUUID()
    };

    await outbox.saveEvent(eventEnvelope);

    // Mark as failed with future retry
    const futureRetry = new Date(Date.now() + 60000); // 1 minute in future
    await outbox.markAsFailed(eventEnvelope.eventId!, 'Test failure', futureRetry);

    // Should not return events scheduled for future
    const pendingEvents = await outbox.getPendingEvents();
    expect(pendingEvents).toHaveLength(0);
  });

  test('should handle duplicate event IDs gracefully', async () => {
    const eventId = randomUUID();
    const eventEnvelope: EventEnvelope = {
      eventType: 'test.event.v1',
      data: { test: 'data' },
      timestamp: new Date(),
      metadata: {
        eventId,
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'test-service',
        version: 'v1'
      },
      eventId,
      correlationId: randomUUID()
    };

    // Save first event
    await outbox.saveEvent(eventEnvelope);

    // Try to save duplicate - should fail due to unique constraint
    await expect(outbox.saveEvent(eventEnvelope)).rejects.toThrow();

    // Verify only one event exists
    const events = await outbox.getPendingEvents();
    expect(events).toHaveLength(1);
  });
});