import { EarningsCalculationEngine } from './earnings-calculation.engine';

describe('EarningsCalculationEngine', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('calculates daily earnings with performance bonus', async () => {
    const engine = new EarningsCalculationEngine();
    const result = await engine.calculateDailyEarnings('courier-1', new Date('2026-03-08T00:00:00.000Z'));

    expect(result).toEqual({
      baseEarnings: 6000,
      distanceBonus: 8050,
      timeBonus: 15000,
      performanceBonus: 2905,
      penalties: 0,
      totalEarnings: 31955,
      deliveryCount: 3,
      hoursWorked: 1.25
    });
  });

  it('wraps calculation errors from dependencies', async () => {
    const engine = new EarningsCalculationEngine();
    jest
      .spyOn(
        engine as unknown as { getDeliveriesForDate: (courierId: string, date: Date) => Promise<unknown[]> },
        'getDeliveriesForDate'
      )
      .mockRejectedValue(new Error('delivery lookup failed'));

    await expect(
      engine.calculateDailyEarnings('courier-1', new Date('2026-03-08T00:00:00.000Z'))
    ).rejects.toThrow('Failed to calculate daily earnings: Error: delivery lookup failed');
  });

  it('calculates commissions including urgent bonus commission', async () => {
    const engine = new EarningsCalculationEngine();
    const result = await engine.calculateCommissions([
      { id: 'del-1', value: 10000, priority: 'urgent' },
      { id: 'del-2', value: 20000, priority: 'normal' }
    ]);

    expect(result).toEqual([
      {
        deliveryId: 'del-1',
        baseCommission: 500,
        bonusCommission: 100,
        totalCommission: 600,
        commissionRate: 5
      },
      {
        deliveryId: 'del-2',
        baseCommission: 1000,
        bonusCommission: 0,
        totalCommission: 1000,
        commissionRate: 5
      }
    ]);
  });

  it('returns failed payout when amount exceeds pending earnings', async () => {
    const engine = new EarningsCalculationEngine();
    jest
      .spyOn(engine, 'getPendingEarnings')
      .mockResolvedValue(1000);

    const result = await engine.processPayoutRequest('courier-1', 2000);

    expect(result.status).toBe('failed');
    expect(result.amount).toBe(2000);
    expect(result.errorMessage).toBe('Insufficient pending earnings');
    expect(result.payoutId).toMatch(/^payout_/);
  });

  it('returns processing payout for valid requests', async () => {
    const engine = new EarningsCalculationEngine();
    jest
      .spyOn(engine, 'getPendingEarnings')
      .mockResolvedValue(50000);

    const result = await engine.processPayoutRequest('courier-1', 2000);

    expect(result.status).toBe('processing');
    expect(result.amount).toBe(2000);
    expect(result.payoutId).toMatch(/^payout_/);
    expect(result.transactionId).toMatch(/^txn_/);
    expect(result.estimatedCompletion).toBeInstanceOf(Date);
  });

  it('returns failed payout when processing throws', async () => {
    const engine = new EarningsCalculationEngine();
    jest
      .spyOn(engine, 'getPendingEarnings')
      .mockRejectedValue(new Error('ledger unavailable'));

    const result = await engine.processPayoutRequest('courier-1', 2000);

    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBe('Payout processing failed: Error: ledger unavailable');
  });

  it('maps today earnings response fields', async () => {
    const engine = new EarningsCalculationEngine();
    jest.spyOn(engine, 'calculateDailyEarnings').mockResolvedValue({
      baseEarnings: 2000,
      distanceBonus: 300,
      timeBonus: 400,
      performanceBonus: 50,
      penalties: 10,
      totalEarnings: 2740,
      deliveryCount: 2,
      hoursWorked: 0.5
    });

    const result = await engine.getTodayEarnings('courier-9');

    expect(result).toEqual({
      total: 2740,
      breakdown: {
        base: 2000,
        distance: 300,
        time: 400,
        performanceBonus: 50,
        penalties: 10
      },
      deliveryCount: 2,
      hoursWorked: 0.5
    });
  });

  it('aggregates pending earnings for last seven days', async () => {
    const engine = new EarningsCalculationEngine();
    const calcSpy = jest.spyOn(engine, 'calculateDailyEarnings').mockResolvedValue({
      baseEarnings: 0,
      distanceBonus: 0,
      timeBonus: 0,
      performanceBonus: 0,
      penalties: 0,
      totalEarnings: 1000,
      deliveryCount: 1,
      hoursWorked: 1
    });

    const result = await engine.getPendingEarnings('courier-7');

    expect(result).toBe(7000);
    expect(calcSpy).toHaveBeenCalledTimes(7);
  });

  it('returns payout history shape', async () => {
    const engine = new EarningsCalculationEngine();
    const history = await engine.getPayoutHistory('courier-1');

    expect(history).toHaveLength(2);
    expect(history[0]).toEqual(
      expect.objectContaining({
        period: 'Dec 29, 2025',
        amount: 156750,
        status: 'Completed',
        payoutMethod: 'Mobile Money'
      })
    );
  });
});
