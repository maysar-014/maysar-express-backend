import type { PrismaClient } from '@prisma/client';
import type { IEventPublisher } from '../events/eventBus';
import type { OutboxEntry, TransactionalOutbox } from './outboxPattern';
import { OutboxProcessor } from './outbox.processor';

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.mock('../logger/logger', () => ({
  createLogger: jest.fn(() => logger)
}));

describe('OutboxProcessor', () => {
  const fixedNow = new Date('2026-03-07T12:00:00.000Z');
  let outbox: jest.Mocked<
    Pick<
      TransactionalOutbox,
      'getPendingEvents' | 'markAsProcessing' | 'markAsSent' | 'markAsFailed' | 'markAsDeadLetter'
    >
  >;
  let publisher: jest.Mocked<Pick<IEventPublisher, 'publish'>>;
  let processor: OutboxProcessor;

  const buildOutboxEvent = (overrides: Partial<OutboxEntry> = {}): OutboxEntry => ({
    id: 'outbox-1',
    eventId: 'evt-1',
    eventType: 'OrderCreated',
    eventData: { eventId: 'evt-1', eventType: 'OrderCreated', data: { orderId: 'order-1' }, timestamp: fixedNow },
    status: 'PENDING' as OutboxEntry['status'],
    createdAt: new Date('2026-03-07T11:59:00.000Z'),
    attempts: 0,
    ...overrides
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    jest.clearAllMocks();
    delete process.env.ENABLE_OUTBOX_PROCESSOR;

    outbox = {
      getPendingEvents: jest.fn(),
      markAsProcessing: jest.fn(),
      markAsSent: jest.fn(),
      markAsFailed: jest.fn(),
      markAsDeadLetter: jest.fn()
    };

    publisher = {
      publish: jest.fn()
    };

    processor = new OutboxProcessor(
      {} as PrismaClient,
      outbox as unknown as TransactionalOutbox,
      publisher as unknown as IEventPublisher,
      'shared',
      {
        pollInterval: 1_000,
        batchSize: 50,
        maxRetries: 2,
        retryDelayMs: 30_000,
        infrastructureBackoffMs: 60_000
      }
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('processes pending events and marks them as sent', async () => {
    const event = buildOutboxEvent();
    outbox.getPendingEvents.mockResolvedValue([event]);

    await (processor as unknown as { processOutboxEvents: () => Promise<void> }).processOutboxEvents();

    expect(outbox.getPendingEvents).toHaveBeenCalledWith(50);
    expect(outbox.markAsProcessing).toHaveBeenCalledWith(event.eventId);
    expect(publisher.publish).toHaveBeenCalledWith(event.eventData);
    expect(outbox.markAsSent).toHaveBeenCalledWith(event.eventId);
    expect(outbox.markAsFailed).not.toHaveBeenCalled();
    expect(outbox.markAsDeadLetter).not.toHaveBeenCalled();
  });

  it('marks event for retry when publish fails before max retries', async () => {
    const event = buildOutboxEvent({ attempts: 1 });
    outbox.getPendingEvents.mockResolvedValue([event]);
    publisher.publish.mockRejectedValue(new Error('broker unavailable'));

    await (processor as unknown as { processOutboxEvents: () => Promise<void> }).processOutboxEvents();

    expect(outbox.markAsFailed).toHaveBeenCalledTimes(1);
    const [eventId, message, retryAt] = outbox.markAsFailed.mock.calls[0];
    expect(eventId).toBe(event.eventId);
    expect(message).toBe('broker unavailable');
    expect(retryAt).toBeInstanceOf(Date);
    expect((retryAt as Date).getTime()).toBe(fixedNow.getTime() + 30_000);
    expect(outbox.markAsDeadLetter).not.toHaveBeenCalled();
  });

  it('moves event to dead letter when retries are exhausted', async () => {
    const event = buildOutboxEvent({ attempts: 2 });
    outbox.getPendingEvents.mockResolvedValue([event]);
    publisher.publish.mockRejectedValue(new Error('permanent failure'));

    await (processor as unknown as { processOutboxEvents: () => Promise<void> }).processOutboxEvents();

    expect(outbox.markAsDeadLetter).toHaveBeenCalledWith(event.eventId, 'permanent failure');
    expect(outbox.markAsFailed).not.toHaveBeenCalled();
  });

  it('treats invalid payload as a failure and schedules retry', async () => {
    const event = buildOutboxEvent({ eventData: 'not-an-envelope', attempts: 0 });
    outbox.getPendingEvents.mockResolvedValue([event]);

    await (processor as unknown as { processOutboxEvents: () => Promise<void> }).processOutboxEvents();

    expect(outbox.markAsFailed).toHaveBeenCalledTimes(1);
    expect(outbox.markAsFailed.mock.calls[0][1]).toContain('invalid payload');
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it('starts polling once and stops cleanly', async () => {
    const runSpy = jest
      .spyOn(processor as unknown as { processOutboxEvents: () => Promise<void> }, 'processOutboxEvents')
      .mockResolvedValue();

    processor.start();
    processor.start();

    jest.advanceTimersByTime(1_000);
    await Promise.resolve();
    jest.advanceTimersByTime(1_000);
    await Promise.resolve();

    expect(runSpy).toHaveBeenCalledTimes(2);

    processor.stop();
    jest.advanceTimersByTime(2_500);
    await Promise.resolve();

    expect(runSpy).toHaveBeenCalledTimes(2);
  });

  it('does not start when disabled via configuration', () => {
    process.env.ENABLE_OUTBOX_PROCESSOR = 'false';
    const runSpy = jest
      .spyOn(processor as unknown as { runProcessingLoop: () => Promise<void> }, 'runProcessingLoop')
      .mockResolvedValue();

    processor.start();
    jest.advanceTimersByTime(2_500);

    expect(runSpy).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('Outbox processor disabled via configuration');
  });

  it('pauses polling after infrastructure errors', async () => {
    outbox.getPendingEvents.mockRejectedValue(Object.assign(new Error("Can't reach database server"), {
      name: 'PrismaClientInitializationError'
    }));

    processor.start();
    jest.advanceTimersByTime(1_000);
    await Promise.resolve();
    expect(outbox.getPendingEvents).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5_000);
    await Promise.resolve();
    expect(outbox.getPendingEvents).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(outbox.getPendingEvents).toHaveBeenCalledTimes(2);
  });

  it('stops polling after Prisma schema errors', async () => {
    outbox.getPendingEvents.mockRejectedValue(Object.assign(new Error('The table `order_outbox_events` does not exist in the current database.'), {
      name: 'PrismaClientKnownRequestError',
      code: 'P2021'
    }));
    const stopSpy = jest.spyOn(processor, 'stop');

    processor.start();
    jest.advanceTimersByTime(1_000);
    await Promise.resolve();
    await Promise.resolve();
    expect(outbox.getPendingEvents).toHaveBeenCalledTimes(1);
    expect(stopSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5_000);
    await Promise.resolve();
    await Promise.resolve();
    expect(outbox.getPendingEvents).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60_000);
    await Promise.resolve();
    await Promise.resolve();
    expect(outbox.getPendingEvents).toHaveBeenCalledTimes(1);
  });
});
