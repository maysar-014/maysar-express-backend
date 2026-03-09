jest.mock('@shared-events/eventBus', () => ({}), { virtual: true });

import { BuyBoxTriggerHandler } from './buy-box-trigger-handler';

type Handler = (event: any) => Promise<void> | void;

describe('BuyBoxTriggerHandler', () => {
  it('registers handlers and recomputes buy box on relevant events', async () => {
    const computeUseCase = {
      execute: jest.fn().mockResolvedValue(undefined)
    };
    const listingQueryService = {
      getListingsForProduct: jest.fn().mockResolvedValue([{ sellerId: 's1' }])
    };
    const subscriptions = new Map<string, Handler>();
    const eventBus = {
      subscribe: jest.fn().mockImplementation((eventType: string, handler: Handler) => {
        subscriptions.set(eventType, handler);
      })
    };
    const handler = new BuyBoxTriggerHandler(computeUseCase as never, listingQueryService as never);

    handler.register(eventBus as never);

    expect(eventBus.subscribe).toHaveBeenCalledTimes(3);
    expect(subscriptions.has('ProductMatchConfirmed')).toBe(true);
    expect(subscriptions.has('SellerListingUpdated')).toBe(true);
    expect(subscriptions.has('SellerSuspended')).toBe(true);

    await subscriptions.get('ProductMatchConfirmed')?.({ confirmedProductId: 'p1' });
    expect(listingQueryService.getListingsForProduct).toHaveBeenCalledWith('p1');
    expect(computeUseCase.execute).toHaveBeenCalledWith({ productId: 'p1', listings: [{ sellerId: 's1' }] });

    await subscriptions.get('SellerListingUpdated')?.({ productId: 'p2' });
    expect(listingQueryService.getListingsForProduct).toHaveBeenCalledWith('p2');
    expect(computeUseCase.execute).toHaveBeenCalledWith({ productId: 'p2', listings: [{ sellerId: 's1' }] });
  });

  it('logs and swallows runtime errors inside handlers', async () => {
    const computeUseCase = {
      execute: jest.fn().mockRejectedValue(new Error('compute-failed'))
    };
    const listingQueryService = {
      getListingsForProduct: jest.fn().mockResolvedValue([{ sellerId: 's1' }])
    };
    const subscriptions = new Map<string, Handler>();
    const eventBus = {
      subscribe: jest.fn().mockImplementation((eventType: string, handler: Handler) => {
        subscriptions.set(eventType, handler);
      })
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const handler = new BuyBoxTriggerHandler(computeUseCase as never, listingQueryService as never);
    handler.register(eventBus as never);

    await expect(subscriptions.get('ProductMatchConfirmed')?.({ confirmedProductId: 'p3' })).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith('Error computing Buy Box for ProductMatchConfirmed:', expect.any(Error));

    await expect(subscriptions.get('SellerSuspended')?.({ sellerId: 'seller-1' })).resolves.toBeUndefined();
    expect(logSpy).toHaveBeenCalledWith('Seller seller-1 suspended, Buy Box recomputation needed');
  });
});

