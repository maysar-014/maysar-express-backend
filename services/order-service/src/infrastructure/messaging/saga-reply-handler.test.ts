jest.mock('../monitoring/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn()
  }
}));

import { logger } from '../monitoring/logger';
import { SagaReplyHandler } from './saga-reply-handler';

describe('SagaReplyHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles stock reserved success', async () => {
    const saga = {
      handleStockReserved: jest.fn().mockResolvedValue(undefined),
      handleFailure: jest.fn(),
      handlePaymentSuccess: jest.fn(),
      handleDeliverySuccess: jest.fn()
    };
    const handler = new SagaReplyHandler(saga as never);

    await handler.handleStockReserved({
      data: { sagaId: 'saga-1' },
      metadata: {}
    } as never);

    expect(logger.info).toHaveBeenCalledWith('Received StockReservedSuccess for saga saga-1');
    expect(saga.handleStockReserved).toHaveBeenCalledWith('saga-1');
  });

  it('handles stock failure using error from payload', async () => {
    const saga = {
      handleStockReserved: jest.fn(),
      handleFailure: jest.fn().mockResolvedValue(undefined),
      handlePaymentSuccess: jest.fn(),
      handleDeliverySuccess: jest.fn()
    };
    const handler = new SagaReplyHandler(saga as never);

    await handler.handleStockFailed({
      data: { sagaId: 'saga-2', reason: 'stock-unavailable' },
      metadata: {}
    } as never);

    expect(logger.error).toHaveBeenCalledWith(
      'Received StockReservationFailure for saga saga-2: stock-unavailable'
    );
    expect(saga.handleFailure).toHaveBeenCalledWith('saga-2', 'StockReservation', 'stock-unavailable');
  });

  it('falls back to metadata and default error values', async () => {
    const saga = {
      handleStockReserved: jest.fn(),
      handleFailure: jest.fn().mockResolvedValue(undefined),
      handlePaymentSuccess: jest.fn().mockResolvedValue(undefined),
      handleDeliverySuccess: jest.fn().mockResolvedValue(undefined)
    };
    const handler = new SagaReplyHandler(saga as never);

    await handler.handlePaymentSuccess({
      data: {},
      metadata: { sagaId: 'saga-3' }
    } as never);
    await handler.handlePaymentFailed({
      data: {},
      metadata: { sagaId: 'saga-3' }
    } as never);
    await handler.handleDeliveryFailed({
      data: {},
      metadata: {}
    } as never);

    expect(saga.handlePaymentSuccess).toHaveBeenCalledWith('saga-3');
    expect(saga.handleFailure).toHaveBeenNthCalledWith(1, 'saga-3', 'Payment', 'unknown-error');
    expect(saga.handleFailure).toHaveBeenNthCalledWith(2, 'unknown-saga', 'Delivery', 'unknown-error');
  });
});
