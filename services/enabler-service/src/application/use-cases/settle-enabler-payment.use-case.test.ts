import { SettlementEngine } from '../../domain/engines/settlement.engine';
import { SettleEnablerPaymentUseCase } from './settle-enabler-payment.use-case';

describe('SettleEnablerPaymentUseCase', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('settles a completed order and schedules both payouts', async () => {
    const payoutDate = new Date('2026-01-01T00:00:00.000Z');
    const settlement = {
      sellerPayout: 800,
      enablerPayout: 200,
      platformRevenue: 0,
      taxRemittance: 0,
      shippingRemittance: 0,
      holdPeriodDays: 7,
      payoutDate
    };
    const settlementSpy = jest
      .spyOn(SettlementEngine, 'calculateSettlement')
      .mockReturnValue(settlement);

    const order = {
      id: 'row-1',
      orderAmount: 1000,
      enablerCommission: 200,
      commissionRate: 0.2,
      sellerId: 'seller-1',
      enablerId: 'enabler-1',
      toPlainObject: jest.fn().mockReturnValue({ status: 'COMPLETED', commissionRate: 0.2 }),
      markEnablerPaid: jest.fn(),
      markSellerPaid: jest.fn()
    };
    const orderRepository = {
      findByOrderId: jest.fn().mockResolvedValue(order),
      update: jest.fn().mockResolvedValue(undefined)
    };
    const payoutService = {
      initiatePayout: jest.fn().mockResolvedValue(undefined)
    };
    const eventPublisher = { publish: jest.fn() };
    const commissionRepository = { upsert: jest.fn().mockResolvedValue(undefined) };
    const useCase = new SettleEnablerPaymentUseCase(
      orderRepository as never,
      payoutService,
      eventPublisher,
      commissionRepository as never
    );

    await useCase.execute('order-1');

    expect(orderRepository.findByOrderId).toHaveBeenCalledWith('order-1');
    expect(settlementSpy).toHaveBeenCalledWith({
      orderAmount: 1000,
      commissionAmount: 200,
      platformFee: 0,
      sellerId: 'seller-1',
      enablerId: 'enabler-1'
    });
    expect(payoutService.initiatePayout).toHaveBeenNthCalledWith(1, {
      recipientId: 'enabler-1',
      amount: 200,
      scheduledDate: payoutDate,
      referenceId: 'row-1',
      type: 'COMMISSION'
    });
    expect(payoutService.initiatePayout).toHaveBeenNthCalledWith(2, {
      recipientId: 'seller-1',
      amount: 800,
      scheduledDate: payoutDate,
      referenceId: 'row-1',
      type: 'SALE_PROCEED'
    });
    expect(order.markEnablerPaid).toHaveBeenCalledTimes(1);
    expect(order.markSellerPaid).toHaveBeenCalledTimes(1);
    expect(orderRepository.update).toHaveBeenCalledWith(order);
    expect(commissionRepository.upsert).toHaveBeenCalledTimes(1);
  });

  it('throws when order is not found', async () => {
    const useCase = new SettleEnablerPaymentUseCase(
      { findByOrderId: jest.fn().mockResolvedValue(null), update: jest.fn() } as never,
      { initiatePayout: jest.fn() },
      { publish: jest.fn() },
      { upsert: jest.fn() } as never
    );

    await expect(useCase.execute('missing')).rejects.toThrow('Order not found');
  });

  it('throws when order status is not completed', async () => {
    const orderRepository = {
      findByOrderId: jest.fn().mockResolvedValue({
        toPlainObject: () => ({ status: 'PROCESSING' })
      })
    };
    const payoutService = { initiatePayout: jest.fn() };
    const useCase = new SettleEnablerPaymentUseCase(
      orderRepository as never,
      payoutService,
      { publish: jest.fn() },
      { upsert: jest.fn() } as never
    );

    await expect(useCase.execute('order-1')).rejects.toThrow(
      'Order must be completed before settlement'
    );
    expect(payoutService.initiatePayout).not.toHaveBeenCalled();
  });
});
