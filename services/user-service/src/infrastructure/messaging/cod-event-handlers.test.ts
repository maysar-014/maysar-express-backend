jest.mock('@shared/events/eventBus', () => ({
  eventBus: {
    subscribe: jest.fn()
  }
}));

jest.mock('../../infrastructure/services/logger.service', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

import { eventBus } from '@shared/events/eventBus';
import { CODEventHandler } from './cod-event-handlers';
import { CODAction } from '../../domain/engines/cod-reputation.engine';
import { logger } from '../../infrastructure/services/logger.service';

const mockedEventBus = eventBus as unknown as {
  subscribe: jest.Mock;
};

const mockedLogger = logger as unknown as {
  info: jest.Mock;
  warn: jest.Mock;
};

describe('CODEventHandler', () => {
  const updateUseCase = { execute: jest.fn().mockResolvedValue(undefined) };

  const getSubscribedHandler = (eventName: string) => {
    const call = mockedEventBus.subscribe.mock.calls.find(args => args[0] === eventName);
    return call?.[1] as ((envelope: unknown) => Promise<void>) | undefined;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers subscriptions for COD-related topics', () => {
    const handler = new CODEventHandler(updateUseCase as never);

    handler.setupSubscriptions();

    expect(mockedEventBus.subscribe).toHaveBeenCalledTimes(4);
    expect(mockedEventBus.subscribe).toHaveBeenCalledWith('Delivery.Success.v1', expect.any(Function));
    expect(mockedEventBus.subscribe).toHaveBeenCalledWith('Delivery.Failure.v1', expect.any(Function));
    expect(mockedEventBus.subscribe).toHaveBeenCalledWith('DeliveryDelivered', expect.any(Function));
    expect(mockedEventBus.subscribe).toHaveBeenCalledWith('COD_DISPUTE_RESOLVED', expect.any(Function));
  });

  it('handles COD delivery success and updates reputation', async () => {
    const handler = new CODEventHandler(updateUseCase as never);
    handler.setupSubscriptions();
    const successHandler = getSubscribedHandler('Delivery.Success.v1');

    await successHandler?.({
      data: { orderId: 'order-1', buyerId: 'buyer-1', isCOD: true }
    });

    expect(updateUseCase.execute).toHaveBeenCalledWith({
      userId: 'buyer-1',
      orderId: 'order-1',
      action: CODAction.DELIVERY_CONFIRMED
    });
  });

  it('skips delivery success events missing required fields', async () => {
    const handler = new CODEventHandler(updateUseCase as never);
    handler.setupSubscriptions();
    const successHandler = getSubscribedHandler('Delivery.Success.v1');

    await successHandler?.({
      data: { isCOD: true, buyerId: 'buyer-1' }
    });

    expect(updateUseCase.execute).not.toHaveBeenCalled();
    expect(mockedLogger.warn).toHaveBeenCalledWith(
      'Skipping COD Delivery Success event due to missing buyerId/orderId'
    );
  });

  it('handles COD refusal failures and ignores non-refusal reasons', async () => {
    const handler = new CODEventHandler(updateUseCase as never);
    handler.setupSubscriptions();
    const failureHandler = getSubscribedHandler('Delivery.Failure.v1');

    await failureHandler?.({
      data: {
        orderId: 'order-a',
        buyerId: 'buyer-a',
        paymentMethod: 'COD',
        reason: 'OUT_OF_COVERAGE'
      }
    });
    expect(updateUseCase.execute).not.toHaveBeenCalled();

    await failureHandler?.({
      data: {
        orderId: 'order-b',
        buyerId: 'buyer-b',
        paymentMethod: 'COD',
        reason: 'REFUSED_BY_BUYER'
      }
    });

    expect(updateUseCase.execute).toHaveBeenCalledWith({
      userId: 'buyer-b',
      orderId: 'order-b',
      action: CODAction.DELIVERY_REFUSED
    });
  });

  it('handles dispute decisions that require refusal penalty', async () => {
    const handler = new CODEventHandler(updateUseCase as never);
    handler.setupSubscriptions();
    const disputeHandler = getSubscribedHandler('COD_DISPUTE_RESOLVED');

    await disputeHandler?.({
      data: {
        disputeId: 'dispute-1',
        decision: 'FORFEIT_COMMITMENT',
        orderId: 'order-9',
        buyerId: 'buyer-9'
      }
    });

    expect(updateUseCase.execute).toHaveBeenCalledWith({
      userId: 'buyer-9',
      orderId: 'order-9',
      action: CODAction.DELIVERY_REFUSED
    });
  });
});
