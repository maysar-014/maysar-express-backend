import {
  EarningsManagementEngine,
  PayoutProcessor,
  type Delivery,
  type MonthlyEarnings
} from './earnings-management.engine';

describe('EarningsManagementEngine', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calculates earnings totals and payout eligibility from deliveries', async () => {
    const engine = new EarningsManagementEngine();
    const deliveries: Delivery[] = [
      {
        deliveryId: 'd1',
        orderId: 'o1',
        value: 20000,
        distance: 10,
        duration: 20,
        completedAt: new Date(),
        rating: 5
      },
      {
        deliveryId: 'd2',
        orderId: 'o2',
        value: 30000,
        distance: 5,
        duration: 15,
        completedAt: new Date(),
        rating: 4
      }
    ];

    jest
      .spyOn(engine as unknown as { getDeliveriesForPeriod: (c: string, p: string) => Promise<Delivery[]> }, 'getDeliveriesForPeriod')
      .mockResolvedValue(deliveries);

    const result = await engine.calculateEarnings('courier-1', 'week');

    expect(result.period).toBe('week');
    expect(result.breakdown.baseEarnings).toBe(4000);
    expect(result.breakdown.distanceBonus).toBe(2250);
    expect(result.breakdown.timeBonus).toBe(1750);
    expect(result.breakdown.performanceBonus).toBe(1000);
    expect(result.breakdown.penalties).toBe(0);
    expect(result.totalAmount).toBe(9000);
    expect(result.payoutEligible).toBe(4000);
  });

  it('processes payout for invalid and valid requests', async () => {
    const engine = new EarningsManagementEngine();
    const validateSpy = jest.spyOn(PayoutProcessor.prototype, 'validatePayoutRequest');
    const processSpy = jest.spyOn(PayoutProcessor.prototype, 'processPayment');

    validateSpy.mockResolvedValueOnce({
      valid: false,
      errors: ['Courier ID required'],
      warnings: []
    });

    const invalid = await engine.processPayout({
      courierId: '',
      amount: 0,
      method: 'mobile_money'
    });

    expect(invalid.success).toBe(false);
    expect(invalid.message).toContain('Validation failed');
    expect(processSpy).not.toHaveBeenCalled();

    validateSpy.mockResolvedValueOnce({ valid: true, errors: [], warnings: [] });
    processSpy.mockResolvedValueOnce({
      success: true,
      transactionId: 'txn-1',
      message: 'ok',
      processedAt: new Date('2026-03-08T00:00:00.000Z')
    });

    const valid = await engine.processPayout({
      courierId: 'courier-7',
      amount: 12000,
      method: 'bank_transfer'
    });

    expect(valid.success).toBe(true);
    expect(valid.reference).toBe('txn-1');
    expect(valid.estimatedProcessingTime).toBe('2-4 hours');
  });

  it('builds earnings history and computes growth trend', async () => {
    const engine = new EarningsManagementEngine();
    const monthlyHistory: MonthlyEarnings[] = [
      { month: 2, year: 2026, totalEarnings: 300000, weeklyBreakdown: [], averageWeekly: 75000, growthRate: 8 },
      { month: 1, year: 2026, totalEarnings: 280000, weeklyBreakdown: [], averageWeekly: 70000, growthRate: 6 },
      { month: 0, year: 2026, totalEarnings: 260000, weeklyBreakdown: [], averageWeekly: 65000, growthRate: 5 },
      { month: 11, year: 2025, totalEarnings: 200000, weeklyBreakdown: [], averageWeekly: 50000, growthRate: 3 },
      { month: 10, year: 2025, totalEarnings: 190000, weeklyBreakdown: [], averageWeekly: 47500, growthRate: 2 },
      { month: 9, year: 2025, totalEarnings: 180000, weeklyBreakdown: [], averageWeekly: 45000, growthRate: 1 }
    ];

    jest
      .spyOn(engine as unknown as { getMonthlyEarningsHistory: (courierId: string) => Promise<MonthlyEarnings[]> }, 'getMonthlyEarningsHistory')
      .mockResolvedValue(monthlyHistory);

    const history = await engine.getEarningsHistory('courier-9');

    expect(history.courierId).toBe('courier-9');
    expect(history.totalEarnings).toBe(1410000);
    expect(history.averageMonthly).toBe(235000);
    expect(history.bestMonth.totalEarnings).toBe(300000);
    expect(history.growthTrend).toBe('increasing');
  });

  it('calculates base and bonus commissions per delivery', async () => {
    const engine = new EarningsManagementEngine();
    const commissions = await engine.calculateCommissions([
      {
        deliveryId: 'd-long-perfect',
        orderId: 'o1',
        value: 10000,
        distance: 12,
        duration: 20,
        completedAt: new Date(),
        rating: 5
      },
      {
        deliveryId: 'd-normal',
        orderId: 'o2',
        value: 10000,
        distance: 4,
        duration: 15,
        completedAt: new Date(),
        rating: 4
      }
    ]);

    expect(commissions[0]).toEqual(
      expect.objectContaining({
        baseCommission: 1500,
        bonusCommission: 800,
        totalCommission: 2300,
        commissionRate: 23
      })
    );
    expect(commissions[1]?.bonusCommission).toBe(0);
  });
});

describe('PayoutProcessor', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('validates payout request fields and warning thresholds', async () => {
    const processor = new PayoutProcessor();
    const invalid = await processor.validatePayoutRequest({
      courierId: '',
      amount: 0,
      method: 'cash'
    });
    const lowAmount = await processor.validatePayoutRequest({
      courierId: 'courier-1',
      amount: 4000,
      method: 'mobile_money'
    });

    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toEqual(
      expect.arrayContaining(['Courier ID required', 'Valid amount required'])
    );
    expect(lowAmount.valid).toBe(true);
    expect(lowAmount.warnings).toContain('Minimum payout amount is 5,000 TZS');
  });

  it('processes payment with deterministic success/failure results', async () => {
    const processor = new PayoutProcessor();

    const randomSpy = jest.spyOn(Math, 'random').mockReturnValueOnce(0.95).mockReturnValueOnce(0.01);
    const success = await processor.processPayment({
      payoutId: 'p1',
      courierId: 'c1',
      amount: 10000,
      requestedAt: new Date(),
      status: 'pending',
      method: 'cash'
    });
    const failure = await processor.processPayment({
      payoutId: 'p2',
      courierId: 'c2',
      amount: 10000,
      requestedAt: new Date(),
      status: 'pending',
      method: 'cash'
    });
    randomSpy.mockRestore();

    expect(success.success).toBe(true);
    expect(success.transactionId).toBeDefined();
    expect(failure.success).toBe(false);
    expect(failure.transactionId).toBeUndefined();
  });

  it('returns payout tracking and failure-handling payloads', async () => {
    const processor = new PayoutProcessor();
    const status = await processor.trackPayoutStatus('payout-1');
    const failureHandling = await processor.handlePayoutFailures({
      payoutId: 'payout-2',
      courierId: 'c3',
      amount: 9000,
      requestedAt: new Date(),
      status: 'failed',
      method: 'bank_transfer'
    });

    expect(status).toEqual(
      expect.objectContaining({
        payoutId: 'payout-1',
        status: 'processing',
        progress: 75
      })
    );
    expect(failureHandling).toEqual(
      expect.objectContaining({
        retryAttempted: true,
        retryCount: 1,
        escalated: false
      })
    );
  });
});
