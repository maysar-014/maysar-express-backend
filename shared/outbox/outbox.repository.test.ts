import type { PrismaClient } from '@prisma/client';
import { EventEnvelope } from '../events/eventBus';
import { OutboxRepository, OutboxStatus } from './outbox.repository';

interface MockOutboxRecord {
  id: string;
  eventId: string;
  eventType: string;
  eventData: unknown;
  status: OutboxStatus;
  createdAt: Date;
  processedAt: Date | null;
  attempts: number;
  lastError: string | null;
  nextRetryAt: Date | null;
}

interface CreateArgs {
  data: Record<string, unknown>;
}

interface FindManyArgs {
  where: Record<string, unknown>;
  orderBy: { createdAt: 'asc' | 'desc' };
  take: number;
}

interface UpdateArgs {
  where: { eventId: string };
  data: Record<string, unknown>;
}

interface MockOutboxDelegate {
  create: jest.Mock<Promise<MockOutboxRecord>, [CreateArgs]>;
  findMany: jest.Mock<Promise<MockOutboxRecord[]>, [FindManyArgs]>;
  update: jest.Mock<Promise<MockOutboxRecord>, [UpdateArgs]>;
}

interface MockPrismaClient {
  sharedOutboxEvent: MockOutboxDelegate;
  outboxEvent?: MockOutboxDelegate;
}

const toOutboxStatus = (value: unknown): OutboxStatus =>
  value === OutboxStatus.PENDING || value === OutboxStatus.PROCESSED || value === OutboxStatus.FAILED
    ? value
    : OutboxStatus.PENDING;

const toDate = (value: unknown, fallback: Date): Date => (value instanceof Date ? value : fallback);
const FIXED_NOW = new Date('2026-03-07T10:00:00.000Z');

const buildEnvelope = (overrides: Partial<EventEnvelope> = {}): EventEnvelope => ({
  eventId: 'evt-1',
  eventType: 'OrderCreated',
  data: { orderId: 'order-1' },
  timestamp: new Date('2026-03-07T09:59:00.000Z'),
  metadata: { source: 'order-service', correlationId: 'corr-1' },
  ...overrides
});

const buildRecord = (overrides: Partial<MockOutboxRecord> = {}): MockOutboxRecord => ({
  id: 'outbox-1',
  eventId: 'evt-1',
  eventType: 'OrderCreated',
  eventData: buildEnvelope(),
  status: OutboxStatus.PENDING,
  createdAt: new Date('2026-03-07T09:59:00.000Z'),
  processedAt: null,
  attempts: 0,
  lastError: null,
  nextRetryAt: null,
  ...overrides
});

const toRetryableFilter = (where: Record<string, unknown>, now: Date): ((record: MockOutboxRecord) => boolean) => {
  const clauses = Array.isArray(where.OR) ? (where.OR as Record<string, unknown>[]) : [];
  if (clauses.length === 0) {
    return () => true;
  }

  return (record: MockOutboxRecord) =>
    clauses.some(clause => {
      if (Object.prototype.hasOwnProperty.call(clause, 'nextRetryAt') && clause.nextRetryAt === null) {
        return record.nextRetryAt === null;
      }

      if (
        typeof clause.nextRetryAt === 'object' &&
        clause.nextRetryAt !== null &&
        Object.prototype.hasOwnProperty.call(clause.nextRetryAt, 'lte')
      ) {
        const lte = (clause.nextRetryAt as { lte?: unknown }).lte;
        return record.nextRetryAt !== null && lte instanceof Date && record.nextRetryAt <= lte && record.nextRetryAt <= now;
      }

      return false;
    });
};

describe('OutboxRepository', () => {
  let records: MockOutboxRecord[];
  let delegate: MockOutboxDelegate;
  let prisma: MockPrismaClient;
  let repository: OutboxRepository;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);

    records = [];

    delegate = {
      create: jest.fn(async ({ data }) => {
        const now = new Date();
        const record: MockOutboxRecord = {
          id: `outbox-${records.length + 1}`,
          eventId: typeof data.eventId === 'string' ? data.eventId : `event-${records.length + 1}`,
          eventType: typeof data.eventType === 'string' ? data.eventType : 'unknown',
          eventData: data.eventData,
          status: toOutboxStatus(data.status),
          createdAt: toDate(data.createdAt, now),
          processedAt: null,
          attempts: typeof data.attempts === 'number' ? data.attempts : 0,
          lastError: null,
          nextRetryAt: null
        };
        records.push(record);
        return record;
      }),
      findMany: jest.fn(async ({ where, orderBy, take }) => {
        const requiredStatus = toOutboxStatus(where.status);
        const retryableFilter = toRetryableFilter(where, new Date());
        let filtered = records.filter(record => record.status === requiredStatus && retryableFilter(record));

        if (orderBy.createdAt === 'asc') {
          filtered = filtered.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
        }

        return filtered.slice(0, take);
      }),
      update: jest.fn(async ({ where, data }) => {
        const record = records.find(item => item.eventId === where.eventId);
        if (!record) {
          throw new Error(`Outbox event ${where.eventId} not found`);
        }

        if (Object.prototype.hasOwnProperty.call(data, 'status')) {
          record.status = toOutboxStatus(data.status);
        }
        if (Object.prototype.hasOwnProperty.call(data, 'processedAt')) {
          record.processedAt =
            data.processedAt instanceof Date || data.processedAt === null ? data.processedAt : record.processedAt;
        }
        if (Object.prototype.hasOwnProperty.call(data, 'attempts') && typeof data.attempts === 'number') {
          record.attempts = data.attempts;
        }
        if (
          Object.prototype.hasOwnProperty.call(data, 'lastError') &&
          (typeof data.lastError === 'string' || data.lastError === null)
        ) {
          record.lastError = data.lastError;
        }
        if (
          Object.prototype.hasOwnProperty.call(data, 'nextRetryAt') &&
          (data.nextRetryAt instanceof Date || data.nextRetryAt === null)
        ) {
          record.nextRetryAt = data.nextRetryAt;
        }
        if (Object.prototype.hasOwnProperty.call(data, 'eventData')) {
          record.eventData = data.eventData;
        }

        return record;
      })
    };

    prisma = { sharedOutboxEvent: delegate };
    repository = new OutboxRepository(prisma as unknown as PrismaClient);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('persists pending envelope with infrastructure defaults', async () => {
    const envelope = buildEnvelope();

    await repository.save(envelope);

    expect(delegate.create).toHaveBeenCalledWith({
      data: {
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        eventData: envelope,
        status: OutboxStatus.PENDING,
        createdAt: envelope.timestamp,
        attempts: 0
      }
    });
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe(OutboxStatus.PENDING);
    expect(records[0].attempts).toBe(0);
    expect(records[0].eventData).toEqual(envelope);
  });

  it('uses current time when envelope timestamp is absent', async () => {
    const envelope = buildEnvelope({ timestamp: undefined });

    await repository.save(envelope);

    expect(delegate.create).toHaveBeenCalledTimes(1);
    const [{ data }] = delegate.create.mock.calls[0];
    expect(data.createdAt).toEqual(FIXED_NOW);
  });

  it('writes using provided transaction model instead of default client', async () => {
    const transactionDelegate: MockOutboxDelegate = {
      create: jest.fn(async ({ data }) => buildRecord({ eventId: data.eventId as string, eventData: data.eventData })),
      findMany: jest.fn(async (_args: FindManyArgs) => []),
      update: jest.fn(async (_args: UpdateArgs) => buildRecord())
    };
    const transactionClient = { sharedOutboxEvent: transactionDelegate };
    const envelope = buildEnvelope({ eventId: 'evt-tx' });

    await repository.save(envelope, transactionClient as unknown as PrismaClient);

    expect(transactionDelegate.create).toHaveBeenCalledTimes(1);
    expect(delegate.create).not.toHaveBeenCalled();
  });

  it('returns only retryable pending events in chronological order and respects limit', async () => {
    records.push(
      buildRecord({
        id: '1',
        eventId: 'pending-older',
        createdAt: new Date('2026-03-07T09:50:00.000Z'),
        nextRetryAt: new Date('2026-03-07T09:55:00.000Z')
      }),
      buildRecord({
        id: '2',
        eventId: 'pending-newer',
        createdAt: new Date('2026-03-07T09:58:00.000Z'),
        nextRetryAt: null
      }),
      buildRecord({
        id: '3',
        eventId: 'pending-future-retry',
        createdAt: new Date('2026-03-07T09:40:00.000Z'),
        nextRetryAt: new Date('2026-03-07T10:30:00.000Z')
      }),
      buildRecord({
        id: '4',
        eventId: 'processed-event',
        status: OutboxStatus.PROCESSED,
        createdAt: new Date('2026-03-07T09:30:00.000Z'),
        processedAt: new Date('2026-03-07T09:31:00.000Z')
      })
    );

    const pending = await repository.getPending(2);

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: {
        status: OutboxStatus.PENDING,
        OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: FIXED_NOW } }]
      },
      orderBy: { createdAt: 'asc' },
      take: 2
    });
    expect(pending.map(event => event.eventId)).toEqual(['pending-older', 'pending-newer']);
  });

  it('maps nullable persistence fields to undefined in domain contract', async () => {
    records.push(
      buildRecord({
        id: 'nullable-fields',
        eventId: 'evt-nullable',
        processedAt: null,
        lastError: null,
        nextRetryAt: null
      })
    );

    const [pending] = await repository.getPending(1);

    expect(pending.processedAt).toBeUndefined();
    expect(pending.lastError).toBeUndefined();
    expect(pending.nextRetryAt).toBeUndefined();
  });

  it('marks an event as processed with a timestamp', async () => {
    records.push(buildRecord({ eventId: 'evt-processed' }));

    await repository.markProcessed('evt-processed');

    expect(delegate.update).toHaveBeenCalledWith({
      where: { eventId: 'evt-processed' },
      data: {
        status: OutboxStatus.PROCESSED,
        processedAt: FIXED_NOW
      }
    });
    expect(records[0].status).toBe(OutboxStatus.PROCESSED);
    expect(records[0].processedAt).toEqual(FIXED_NOW);
  });

  it('propagates persistence errors when marking unknown event as processed', async () => {
    await expect(repository.markProcessed('missing-event')).rejects.toThrow('Outbox event missing-event not found');
  });

  it('falls back to outboxEvent model when sharedOutboxEvent is unavailable', async () => {
    const fallbackDelegate: MockOutboxDelegate = {
      create: jest.fn(async ({ data }) => buildRecord({ eventId: data.eventId as string })),
      findMany: jest.fn(async (_args: FindManyArgs) => [buildRecord({ eventId: 'fallback-pending' })]),
      update: jest.fn(async (_args: UpdateArgs) => buildRecord())
    };
    const fallbackPrisma = { outboxEvent: fallbackDelegate };
    const fallbackRepository = new OutboxRepository(fallbackPrisma as unknown as PrismaClient);

    const events = await fallbackRepository.getPending(1);

    expect(fallbackDelegate.findMany).toHaveBeenCalledTimes(1);
    expect(events).toHaveLength(1);
    expect(events[0].eventId).toBe('fallback-pending');
  });

  it('throws a clear error when configured Prisma outbox model does not exist', async () => {
    const brokenRepository = new OutboxRepository({} as PrismaClient, 'missingOutboxModel');

    await expect(brokenRepository.getPending()).rejects.toThrow(
      'Prisma outbox model "missingOutboxModel" was not found. Expected missingOutboxModel, sharedOutboxEvent, or outboxEvent.'
    );
  });
});
