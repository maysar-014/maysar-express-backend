jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-correlation-id')
}));

import { SagaEventHandler } from './saga.event-handler';

describe('SagaEventHandler', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('subscribes to all required event topics', async () => {
    const saga = {
      start: jest.fn(),
      handleWalletPaymentProcessed: jest.fn(),
      handleWalletPaymentFailed: jest.fn()
    };
    const eventBus = { subscribe: jest.fn().mockResolvedValue(undefined) };
    const handler = new SagaEventHandler(saga as never, eventBus as never);

    await handler.setupSubscriptions();

    expect(eventBus.subscribe).toHaveBeenNthCalledWith(
      1,
      'OrderCreated',
      expect.any(Function)
    );
    expect(eventBus.subscribe).toHaveBeenNthCalledWith(
      2,
      'PaymentRetryRequested',
      expect.any(Function)
    );
    expect(eventBus.subscribe).toHaveBeenNthCalledWith(
      3,
      'WalletPaymentProcessed',
      expect.any(Function)
    );
    expect(eventBus.subscribe).toHaveBeenNthCalledWith(
      4,
      'WalletPaymentFailed',
      expect.any(Function)
    );
  });

  it('starts saga from order created payload', async () => {
    const saga = {
      start: jest.fn().mockResolvedValue(undefined),
      handleWalletPaymentProcessed: jest.fn(),
      handleWalletPaymentFailed: jest.fn()
    };
    const handler = new SagaEventHandler(saga as never, { subscribe: jest.fn() } as never);
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await (handler as any).handleOrderCreated({
      data: {
        orderId: 'order-1',
        userId: 'user-1',
        totalAmount: 5000,
        currency: 'TZS',
        paymentMethod: 'CARD'
      },
      metadata: {}
    });

    expect(logSpy).toHaveBeenCalledWith(
      'SagaEventHandler: Handling OrderCreated event',
      expect.any(Object)
    );
    expect(saga.start).toHaveBeenCalledWith(
      {
        paymentId: expect.stringMatching(/^pay_/),
        orderId: 'order-1',
        userId: 'user-1',
        amount: 5000,
        currency: 'TZS',
        method: 'CARD'
      },
      'generated-correlation-id'
    );
  });

  it('handles wallet payment processed with and without saga id', async () => {
    const saga = {
      start: jest.fn(),
      handleWalletPaymentProcessed: jest.fn().mockResolvedValue(undefined),
      handleWalletPaymentFailed: jest.fn()
    };
    const handler = new SagaEventHandler(saga as never, { subscribe: jest.fn() } as never);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await (handler as any).handleWalletPaymentProcessed({
      data: {},
      metadata: { sagaId: 'saga-1' }
    });
    await (handler as any).handleWalletPaymentProcessed({
      data: {},
      metadata: {}
    });

    expect(saga.handleWalletPaymentProcessed).toHaveBeenCalledWith('saga-1');
    expect(errorSpy).toHaveBeenCalledWith(
      'Missing sagaId/correlationId in WalletPaymentProcessed event'
    );
  });

  it('handles wallet payment failure with fallback error and guard clause', async () => {
    const saga = {
      start: jest.fn(),
      handleWalletPaymentProcessed: jest.fn(),
      handleWalletPaymentFailed: jest.fn().mockResolvedValue(undefined)
    };
    const handler = new SagaEventHandler(saga as never, { subscribe: jest.fn() } as never);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await (handler as any).handleWalletPaymentFailed({
      data: { message: 'wallet timeout' },
      metadata: { correlationId: 'saga-2' }
    });
    await (handler as any).handleWalletPaymentFailed({
      data: {},
      metadata: {}
    });

    expect(saga.handleWalletPaymentFailed).toHaveBeenCalledWith('saga-2', 'wallet timeout');
    expect(errorSpy).toHaveBeenCalledWith(
      'Missing sagaId/correlationId in WalletPaymentFailed event'
    );
  });
});
