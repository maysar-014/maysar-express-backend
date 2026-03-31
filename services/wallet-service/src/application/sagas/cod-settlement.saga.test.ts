import { CODSettlementSaga } from './cod-settlement.saga';

describe('CODSettlementSaga', () => {
  const sagaLogRepository = {
    save: jest.fn(),
    update: jest.fn(),
    saveStep: jest.fn(),
    updateStep: jest.fn(),
    getById: jest.fn(),
    getSteps: jest.fn()
  };

  const releaseHoldUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
  const captureHoldUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
  const creditWalletUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
  const freezeFundsUseCase = { execute: jest.fn().mockResolvedValue(undefined) };

  const makeSaga = () =>
    new CODSettlementSaga(
      sagaLogRepository as never,
      'wallet-service',
      releaseHoldUseCase as never,
      captureHoldUseCase as never,
      creditWalletUseCase as never,
      freezeFundsUseCase as never
    );

  const getStep = (saga: CODSettlementSaga, name: string) => {
    const step = saga.steps.find(s => s.name === name);
    if (!step) {
      throw new Error(`Missing saga step: ${name}`);
    }
    return step;
  };

  const basePayload = {
    orderId: 'order-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    amount: 1000,
    currency: 'TZS',
    holdId: 'hold-1',
    deliveryStatus: 'SUCCESS' as const,
    sellerAmount: 900,
    courierId: 'courier-1',
    courierAmount: 100
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('defines expected settlement steps', () => {
    const saga = makeSaga();

    expect(saga.steps.map(step => step.name)).toEqual([
      'WaitForDisputeWindow',
      'ProcessCODCommitment',
      'PayoutSellerAndCourier'
    ]);
  });

  it('wait step resolves immediately for non-success deliveries', async () => {
    const saga = makeSaga();
    const waitStep = getStep(saga, 'WaitForDisputeWindow');

    await expect(
      waitStep.execute({ ...basePayload, deliveryStatus: 'REFUSED' }, 'saga-1')
    ).resolves.toBeUndefined();
  });

  it('wait step respects timer flow for success deliveries', async () => {
    jest.useFakeTimers();
    const saga = makeSaga();
    const waitStep = getStep(saga, 'WaitForDisputeWindow');

    const promise = waitStep.execute(basePayload, 'saga-2');
    jest.advanceTimersByTime(5000);
    await promise;
    jest.useRealTimers();

    expect(console.log).toHaveBeenCalledWith(
      '[saga-2] Dispute window passed for order order-1. Proceeding to settlement.'
    );
  });

  it('processes COD commitment using capture/freeze branches', async () => {
    const saga = makeSaga();
    const step = getStep(saga, 'ProcessCODCommitment');

    await step.execute({ ...basePayload, deliveryStatus: 'SUCCESS' }, 'saga-success');
    expect(captureHoldUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        holdId: 'hold-1',
        userId: 'buyer-1',
        idempotencyKey: 'cod_delivery_charge_order-1',
        correlationId: 'saga-success'
      })
    );

    await step.execute({ ...basePayload, deliveryStatus: 'REFUSED' }, 'saga-refused');
    expect(captureHoldUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        holdId: 'hold-1',
        idempotencyKey: 'cod_capture_order-1',
        correlationId: 'saga-refused'
      })
    );

    await step.execute({ ...basePayload, deliveryStatus: 'DISPUTED' }, 'saga-disputed');
    expect(freezeFundsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'buyer-1',
        amount: 1000,
        correlationId: 'saga-disputed'
      })
    );
  });

  it('skips commitment processing when holdId is missing', async () => {
    const saga = makeSaga();
    const step = getStep(saga, 'ProcessCODCommitment');

    await step.execute({ ...basePayload, holdId: undefined }, 'saga-no-hold');

    expect(releaseHoldUseCase.execute).not.toHaveBeenCalled();
    expect(captureHoldUseCase.execute).not.toHaveBeenCalled();
    expect(freezeFundsUseCase.execute).not.toHaveBeenCalled();
  });

  it('credits seller/courier and publishes settlement command for successful delivery', async () => {
    const saga = makeSaga();
    const payoutStep = getStep(saga, 'PayoutSellerAndCourier');
    const publishSpy = jest
      .spyOn(saga as any, 'publishCommand')
      .mockResolvedValue(undefined);

    await payoutStep.execute(basePayload, 'saga-payout');

    expect(creditWalletUseCase.execute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        userId: 'seller-1',
        amount: 900,
        idempotencyKey: 'cod_seller_credit_order-1'
      })
    );
    expect(creditWalletUseCase.execute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        userId: 'courier-1',
        amount: 100,
        idempotencyKey: 'cod_courier_credit_order-1'
      })
    );
    expect(publishSpy).toHaveBeenCalledWith(
      'EventBus.Emit',
      {
        type: 'Settlement.Completed',
        payload: { orderId: 'order-1', status: 'SETTLED' }
      },
      'saga-payout',
      'saga-payout'
    );
  });

  it('does not payout when delivery status is not SUCCESS', async () => {
    const saga = makeSaga();
    const payoutStep = getStep(saga, 'PayoutSellerAndCourier');
    const publishSpy = jest
      .spyOn(saga as any, 'publishCommand')
      .mockResolvedValue(undefined);

    await payoutStep.execute({ ...basePayload, deliveryStatus: 'DISPUTED' }, 'saga-non-success');

    expect(creditWalletUseCase.execute).not.toHaveBeenCalled();
    expect(publishSpy).not.toHaveBeenCalled();
  });
});
