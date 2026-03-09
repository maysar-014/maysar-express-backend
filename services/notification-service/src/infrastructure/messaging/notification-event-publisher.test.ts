const loggerInfoMock = jest.fn();
const loggerErrorMock = jest.fn();

jest.mock('../services/logger.service', () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    error: (...args: unknown[]) => loggerErrorMock(...args),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

import { NotificationEventPublisher } from './notification-event-publisher';

const event = {
  eventId: 'evt-1',
  eventType: 'NotificationCreated',
  aggregateId: 'notification-1',
  aggregateType: 'Notification',
  eventVersion: 1,
  occurredAt: new Date('2026-03-09T00:00:00.000Z'),
  metadata: { requestId: 'req-1' }
};

describe('NotificationEventPublisher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes event into outbox and logs success', async () => {
    const outboxRepository = { save: jest.fn().mockResolvedValue(undefined) };
    const publisher = new NotificationEventPublisher(outboxRepository as never);
    const tx = { id: 'tx-1' };

    await publisher.publish(event, tx);

    expect(outboxRepository.save).toHaveBeenCalledWith(
      {
        eventId: 'evt-1',
        eventType: 'NotificationCreated',
        eventData: event
      },
      tx
    );
    expect(loggerInfoMock).toHaveBeenCalledWith('Event saved to Outbox', {
      eventType: 'NotificationCreated',
      aggregateId: 'notification-1'
    });
  });

  it('logs and rethrows when outbox save fails', async () => {
    const outboxRepository = { save: jest.fn().mockRejectedValue(new Error('outbox-down')) };
    const publisher = new NotificationEventPublisher(outboxRepository as never);

    await expect(publisher.publish(event)).rejects.toThrow('outbox-down');
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'Failed to save event to Outbox',
      expect.objectContaining({ eventType: 'NotificationCreated', error: expect.any(Error) })
    );
  });

  it('publishes many events concurrently', async () => {
    const outboxRepository = { save: jest.fn().mockResolvedValue(undefined) };
    const publisher = new NotificationEventPublisher(outboxRepository as never);
    const secondEvent = { ...event, eventId: 'evt-2', aggregateId: 'notification-2' };

    await publisher.publishMany([event, secondEvent]);

    expect(outboxRepository.save).toHaveBeenCalledTimes(2);
    expect(outboxRepository.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ eventId: 'evt-1' }),
      undefined
    );
    expect(outboxRepository.save).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ eventId: 'evt-2' }),
      undefined
    );
  });
});

