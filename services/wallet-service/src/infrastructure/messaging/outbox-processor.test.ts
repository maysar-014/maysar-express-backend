const observeMock = jest.fn();
const publishedIncMock = jest.fn();
const failedIncMock = jest.fn();

const delayLabelsMock = jest.fn(() => ({ observe: observeMock }));
const publishedLabelsMock = jest.fn(() => ({ inc: publishedIncMock }));
const failedLabelsMock = jest.fn(() => ({ inc: failedIncMock }));

jest.mock('../../../../../shared/outbox/outbox.processor', () => ({
  outboxDelay: { labels: delayLabelsMock },
  outboxPublished: { labels: publishedLabelsMock },
  outboxFailed: { labels: failedLabelsMock }
}));

import { OutboxProcessor } from './outbox-processor';
import type { IEventBus } from './event-bus.interface';
import type { OutboxRepository } from './outbox.repository';

describe('wallet OutboxProcessor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes pending events and marks them as processed', async () => {
    const repository = {
      findUnprocessed: jest.fn().mockResolvedValue([
        {
          id: 'entry-1',
          eventId: 'evt-1',
          eventType: 'wallet.credited',
          eventData: { walletId: 'w-1' },
          createdAt: new Date('2026-01-01T00:00:00.000Z')
        }
      ]),
      markAsProcessed: jest.fn().mockResolvedValue(undefined)
    } as unknown as OutboxRepository;
    const eventBus: IEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined)
    };
    const processor = new OutboxProcessor(repository, eventBus);

    await processor.process();

    expect(eventBus.publish).toHaveBeenCalledWith(
      'wallet.credited',
      { walletId: 'w-1' },
      expect.objectContaining({
        eventId: 'evt-1',
        aggregateType: 'Outbox'
      })
    );
    expect(repository.markAsProcessed).toHaveBeenCalledWith('entry-1');
    expect(delayLabelsMock).toHaveBeenCalledWith('wallet-service');
    expect(observeMock).toHaveBeenCalled();
    expect(publishedLabelsMock).toHaveBeenCalledWith('wallet-service');
    expect(publishedIncMock).toHaveBeenCalled();
  });

  it('records failure metrics when publish fails', async () => {
    const repository = {
      findUnprocessed: jest.fn().mockResolvedValue([
        {
          id: 'entry-1',
          eventId: 'evt-1',
          eventType: 'wallet.credited',
          eventData: { walletId: 'w-1' },
          createdAt: new Date('2026-01-01T00:00:00.000Z')
        }
      ]),
      markAsProcessed: jest.fn().mockResolvedValue(undefined)
    } as unknown as OutboxRepository;
    const eventBus: IEventBus = {
      publish: jest.fn().mockRejectedValue(new Error('publish failed')),
      emit: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined)
    };
    const processor = new OutboxProcessor(repository, eventBus);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await processor.process();

    expect(repository.markAsProcessed).not.toHaveBeenCalled();
    expect(failedLabelsMock).toHaveBeenCalledWith('wallet-service', 'false');
    expect(failedIncMock).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('starts and stops interval processing', () => {
    jest.useFakeTimers();

    const repository = {
      findUnprocessed: jest.fn().mockResolvedValue([]),
      markAsProcessed: jest.fn().mockResolvedValue(undefined)
    } as unknown as OutboxRepository;
    const eventBus: IEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined)
    };
    const processor = new OutboxProcessor(repository, eventBus);
    const processSpy = jest.spyOn(processor, 'process').mockResolvedValue(undefined);

    processor.start(1000);
    jest.advanceTimersByTime(2500);
    expect(processSpy).toHaveBeenCalledTimes(2);

    processor.stop();
    jest.advanceTimersByTime(2000);
    expect(processSpy).toHaveBeenCalledTimes(2);

    jest.useRealTimers();
  });
});
