const calculateMock = jest.fn();

jest.mock('../../domain/engines/commission-calculation.engine', () => ({
  CommissionCalculationEngine: {
    calculate: (...args: unknown[]) => calculateMock(...args)
  }
}));

import { CalculateEnablerCommissionUseCase } from './calculate-enabler-commission.use-case';

describe('CalculateEnablerCommissionUseCase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws when order or enabler is missing', async () => {
    const missingOrderUseCase = new CalculateEnablerCommissionUseCase(
      { findById: jest.fn() } as never,
      { findByOrderId: jest.fn().mockResolvedValue(null) } as never
    );
    await expect(missingOrderUseCase.execute('order-1')).rejects.toThrow('Order not found');

    const missingEnablerUseCase = new CalculateEnablerCommissionUseCase(
      { findById: jest.fn().mockResolvedValue(null) } as never,
      { findByOrderId: jest.fn().mockResolvedValue({ enablerId: 'en-1', orderAmount: 1000 }) } as never
    );
    await expect(missingEnablerUseCase.execute('order-2')).rejects.toThrow('Enabler not found');
  });

  it('returns commission breakdown from calculation engine', async () => {
    const orderRepository = {
      findByOrderId: jest.fn().mockResolvedValue({
        enablerId: 'en-1',
        orderAmount: 20000
      })
    };
    const enablerRepository = {
      findById: jest.fn().mockResolvedValue({
        tier: 'GOLD',
        commissionRate: 0.08,
        conversionRate: 0.3,
        totalOrders: 50,
        toPlainObject: () => ({ customerRating: 4.6 })
      })
    };
    calculateMock.mockReturnValue({
      baseCommission: 1600,
      tierBonus: 100,
      performanceBonus: 50,
      totalCommission: 1750,
      commissionRate: 0.0875
    });
    const useCase = new CalculateEnablerCommissionUseCase(
      enablerRepository as never,
      orderRepository as never
    );

    const result = await useCase.execute('order-3');

    expect(calculateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        orderAmount: 20000,
        enablerTier: 'GOLD',
        baseCommissionRate: 0.08,
        performanceMetrics: expect.objectContaining({ customerRating: 4.6 })
      })
    );
    expect(result).toEqual({
      baseCommission: 1600,
      tierBonus: 100,
      performanceBonus: 50,
      totalCommission: 1750,
      commissionRate: 0.0875
    });
  });
});

