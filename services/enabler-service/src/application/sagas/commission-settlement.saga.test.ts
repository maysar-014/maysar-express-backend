import { CommissionSettlementSaga } from './commission-settlement.saga';

describe('CommissionSettlementSaga', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('executes settlement then sends commission paid notification', async () => {
    const settlePaymentUseCase = {
      execute: jest.fn().mockResolvedValue(undefined)
    };
    const notificationService = {
      sendCommissionPaidNotification: jest.fn().mockResolvedValue(undefined)
    };
    const saga = new CommissionSettlementSaga(settlePaymentUseCase as never, notificationService);

    await saga.execute('order-1');

    expect(settlePaymentUseCase.execute).toHaveBeenCalledWith('order-1');
    expect(notificationService.sendCommissionPaidNotification).toHaveBeenCalledWith('mock-id', 100);
  });

  it('swallows errors and logs when settlement fails', async () => {
    const settlePaymentUseCase = {
      execute: jest.fn().mockRejectedValue(new Error('settlement-failed'))
    };
    const notificationService = {
      sendCommissionPaidNotification: jest.fn()
    };
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const saga = new CommissionSettlementSaga(settlePaymentUseCase as never, notificationService);

    await expect(saga.execute('order-2')).resolves.toBeUndefined();

    expect(notificationService.sendCommissionPaidNotification).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('Commission Settlement Failed:', expect.any(Error));
  });
});

