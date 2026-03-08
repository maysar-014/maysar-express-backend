import type { EventEnvelope, IEventBus } from './event-bus.interface';

describe('wallet event bus interface contract', () => {
  it('supports strongly-typed publish payloads', async () => {
    const bus: IEventBus = {
      publish: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn().mockResolvedValue(undefined),
      subscribe: jest.fn().mockResolvedValue(undefined)
    };
    const metadata: EventEnvelope['metadata'] = {
      eventId: 'evt-1',
      aggregateType: 'Wallet',
      occurredAt: new Date('2026-01-01T00:00:00.000Z')
    };

    await bus.publish('wallet.credited', { walletId: 'w-1', amount: 100 }, metadata);

    expect(bus.publish).toHaveBeenCalledWith(
      'wallet.credited',
      { walletId: 'w-1', amount: 100 },
      metadata
    );
  });
});
