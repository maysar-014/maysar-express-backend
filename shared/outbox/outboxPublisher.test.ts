import type { EventEnvelope, IEventBus } from '../events/eventBus';
import type { TransactionalOutbox } from './outboxPattern';
import { OutboxPublisher } from './outboxPublisher';

describe('OutboxPublisher', () => {
  let outbox: jest.Mocked<
    Pick<TransactionalOutbox, 'getPendingEvents' | 'markAsProcessing' | 'markAsSent' | 'markAsFailed'>
  >;
  let eventBus: IEventBus;
  let publishMock: jest.Mock<Promise<void>, [EventEnvelope]>;
  let publisher: OutboxPublisher;
  const fixedNow = new Date('2026-03-07T12:00:00.000Z');

  const buildEvent = (overrides: Record<string, unknown> = {}) => ({
    eventId: 'evt-1',
    eventType: 'OrderCreated',
    eventData: { eventId: 'evt-1', eventType: 'OrderCreated', data: { orderId: 'order-1' } },
    createdAt: new Date('2026-03-07T11:59:00.000Z'),
    attempts: 0,
    ...overrides
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    jest.restoreAllMocks();

    outbox = {
      getPendingEvents: jest.fn(),
      markAsProcessing: jest.fn(),
      markAsSent: jest.fn(),
      markAsFailed: jest.fn()
    };
    publishMock = jest.fn(async (_envelope: EventEnvelope) => undefined);
    eventBus = {
      publish: publishMock,
      emit: jest.fn(async (_eventTypeOrEnvelope: string | EventEnvelope, _data?: unknown, _metadata?: Record<string, unknown>) => undefined),
      subscribe: jest.fn(async (_eventType: string, _handlerOrOptions: unknown) => undefined)
    } as IEventBus;

    publisher = new OutboxPublisher(outbox as unknown as TransactionalOutbox, eventBus, {
      pollInterval: 1000,
      batchSize: 20,
      maxRetries: 2,
      retryDelayMs: 30_000
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('publishes pending events and marks them as sent', async () => {
    const event = buildEvent();
    outbox.getPendingEvents.mockResolvedValue([event] as never);

    await (publisher as unknown as { processOutboxEvents: () => Promise<void> }).processOutboxEvents();

    expect(outbox.getPendingEvents).toHaveBeenCalledWith(20);
    expect(outbox.markAsProcessing).toHaveBeenCalledWith('evt-1');
    expect(eventBus.publish).toHaveBeenCalledWith(event.eventData as EventEnvelope);
    expect(outbox.markAsSent).toHaveBeenCalledWith('evt-1');
    expect(outbox.markAsFailed).not.toHaveBeenCalled();
  });

  it('marks event as permanently failed after max retries', async () => {
    const event = buildEvent({ attempts: 2 });
    outbox.getPendingEvents.mockResolvedValue([event] as never);
    publishMock.mockRejectedValue(new Error('permanent failure'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await (publisher as unknown as { processOutboxEvents: () => Promise<void> }).processOutboxEvents();

    expect(outbox.markAsFailed).toHaveBeenCalledWith('evt-1', 'permanent failure');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('schedules retry for transient publish failures', async () => {
    const event = buildEvent({ attempts: 1 });
    outbox.getPendingEvents.mockResolvedValue([event] as never);
    publishMock.mockRejectedValue(new Error('temporary outage'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    await (publisher as unknown as { processOutboxEvents: () => Promise<void> }).processOutboxEvents();

    expect(outbox.markAsFailed).toHaveBeenCalledTimes(1);
    const [, errorMessage, nextRetryAt] = outbox.markAsFailed.mock.calls[0];
    expect(errorMessage).toBe('temporary outage');
    expect(nextRetryAt).toBeInstanceOf(Date);
    expect((nextRetryAt as Date).getTime()).toBe(fixedNow.getTime() + 30_000);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('starts and stops polling without duplicate intervals', async () => {
    const processSpy = jest
      .spyOn(publisher as unknown as { processOutboxEvents: () => Promise<void> }, 'processOutboxEvents')
      .mockResolvedValue();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);

    publisher.start();
    publisher.start();

    jest.advanceTimersByTime(2_500);
    await Promise.resolve();
    expect(processSpy).toHaveBeenCalledTimes(2);

    publisher.stop();
    jest.advanceTimersByTime(2_500);
    await Promise.resolve();
    expect(processSpy).toHaveBeenCalledTimes(2);
  });
});
