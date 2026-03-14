const mockSagaLogRepository = {
  save: jest.fn(),
  update: jest.fn(),
  getById: jest.fn(),
  saveStep: jest.fn(),
  updateStep: jest.fn(),
  getSteps: jest.fn(),
  findStuck: jest.fn()
};

jest.mock('prom-client', () => {
  class MockMetric {
    labels() {
      return {
        observe: jest.fn(),
        inc: jest.fn(),
        dec: jest.fn()
      };
    }
  }

  class MockRegistry {
    registerMetric = jest.fn();
  }

  return {
    Registry: MockRegistry,
    collectDefaultMetrics: jest.fn(),
    Gauge: MockMetric,
    Counter: MockMetric,
    Histogram: MockMetric
  };
});

jest.mock('../../infrastructure/repositories/saga.repository', () => ({
  sagaLogRepository: mockSagaLogRepository
}));

import { SettlementSaga } from './settlement.saga';

describe('SettlementSaga', () => {
  const baseRequest = {
    orderId: 'ord-1',
    buyerId: 'buyer-1',
    sellerId: 'seller-1',
    courierId: 'courier-1',
    totalAmount: 50000,
    paymentMethod: 'WALLET' as const,
    commissionRate: 0.1
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defines expected settlement steps in sequence', () => {
    const saga = new SettlementSaga({} as any);
    const steps = (saga as any).defineSteps();

    expect(steps.map((step: { name: string }) => step.name)).toEqual([
      'ComplianceCheck',
      'PaymentProcessing',
      'CommissionDistribution',
      'PayoutProcessing'
    ]);
  });

  it('runs compliance check only for high-value requests', async () => {
    const saga = new SettlementSaga({} as any);
    const steps = (saga as any).defineSteps();
    const complianceSpy = jest
      .spyOn(saga as any, 'checkBOTCompliance')
      .mockResolvedValue({ approved: true });

    await steps[0].execute({ request: baseRequest }, 'saga-1');
    expect(complianceSpy).not.toHaveBeenCalled();

    await steps[0].execute(
      {
        request: {
          ...baseRequest,
          totalAmount: 200000
        }
      },
      'saga-2'
    );
    expect(complianceSpy).toHaveBeenCalledTimes(1);
  });

  it('throws when high-value compliance is rejected', async () => {
    const saga = new SettlementSaga({} as any);
    const steps = (saga as any).defineSteps();
    jest.spyOn(saga as any, 'checkBOTCompliance').mockResolvedValue({
      approved: false,
      reason: 'AML review failed'
    });

    await expect(
      steps[0].execute(
        { request: { ...baseRequest, totalAmount: 150000 } },
        'saga-3'
      )
    ).rejects.toThrow('Compliance failed: AML review failed');
  });

  it('skips digital payment processing for COD', async () => {
    const saga = new SettlementSaga({} as any);
    const steps = (saga as any).defineSteps();
    const paymentSpy = jest.spyOn(saga as any, 'processDigitalPayment');

    await steps[1].execute(
      {
        request: {
          ...baseRequest,
          paymentMethod: 'COD'
        }
      },
      'saga-4'
    );

    expect(paymentSpy).not.toHaveBeenCalled();
  });

  it('throws when digital payment fails and compensates via refund command', async () => {
    const saga = new SettlementSaga({} as any);
    const steps = (saga as any).defineSteps();
    jest.spyOn(saga as any, 'processDigitalPayment').mockResolvedValue({
      success: false,
      error: 'provider timeout'
    });
    const publishSpy = jest.spyOn(saga as any, 'publishCommand').mockResolvedValue(undefined);

    await expect(
      steps[1].execute({ request: baseRequest }, 'saga-5')
    ).rejects.toThrow('Digital payment failed: provider timeout');

    await steps[1].compensate({ request: baseRequest }, 'saga-5');
    expect(publishSpy).toHaveBeenCalledWith(
      'PaymentRefund.Command',
      {
        orderId: 'ord-1',
        amount: 50000
      },
      'saga-5'
    );
  });

  it('records commission and courier earnings during distribution step', async () => {
    const saga = new SettlementSaga({} as any);
    const steps = (saga as any).defineSteps();
    const platformSpy = jest.spyOn(saga as any, 'recordPlatformCommission').mockResolvedValue(undefined);
    const courierSpy = jest.spyOn(saga as any, 'recordCourierEarnings').mockResolvedValue(undefined);

    await steps[2].execute({ request: baseRequest }, 'saga-6');

    expect(platformSpy).toHaveBeenCalledWith(baseRequest);
    expect(courierSpy).toHaveBeenCalledWith(baseRequest);
  });

  it('throws when seller payout processing fails', async () => {
    const saga = new SettlementSaga({} as any);
    const steps = (saga as any).defineSteps();
    jest.spyOn(saga as any, 'processSellerPayout').mockResolvedValue({
      success: false,
      error: 'bank unavailable'
    });

    await expect(
      steps[3].execute({ request: baseRequest }, 'saga-7')
    ).rejects.toThrow('Seller payout failed: bank unavailable');
  });
});
