import { WalletEventPublisher } from './wallet-event-publisher';

describe('WalletEventPublisher', () => {
  it('publishes all wallet events with expected names', async () => {
    const eventBus = { publish: jest.fn().mockResolvedValue(undefined) };
    const publisher = new WalletEventPublisher(eventBus as never);

    await publisher.publishWalletCredited({ id: 1 });
    await publisher.publishWalletDebited({ id: 2 });
    await publisher.publishHoldPlaced({ id: 3 });
    await publisher.publishHoldReleased({ id: 4 });
    await publisher.publishHoldCaptured({ id: 5 });
    await publisher.publishHoldExpired({ id: 6 });
    await publisher.publishWalletPayoutInitiated({ id: 7 });
    await publisher.publishWalletPaymentProcessed({ id: 8 });
    await publisher.publishWalletPaymentFailed({ id: 9 });

    expect(eventBus.publish.mock.calls.map((c: unknown[]) => c[0])).toEqual([
      'WalletCredited',
      'WalletDebited',
      'HoldPlaced',
      'HoldReleased',
      'HoldCaptured',
      'HoldExpired',
      'WalletPayoutInitiated',
      'WalletPaymentProcessed',
      'WalletPaymentFailed'
    ]);
  });
});
