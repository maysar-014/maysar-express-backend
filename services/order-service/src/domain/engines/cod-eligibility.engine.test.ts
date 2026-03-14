import { CODEligibilityEngine } from './cod-eligibility.engine';

describe('CODEligibilityEngine', () => {
  const authService = {
    isUserVerified: jest.fn()
  };
  const userService = {
    getCODReputation: jest.fn()
  };
  const logisticsService = {
    isCODSupportedInArea: jest.fn(),
    isCrossRegionDelivery: jest.fn()
  };

  const engine = new CODEligibilityEngine(
    authService as never,
    userService as never,
    logisticsService as never
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects buyer when identity verification fails', async () => {
    authService.isUserVerified.mockResolvedValue(false);
    userService.getCODReputation.mockResolvedValue({ score: 90, successfulOrders: 10 });

    const result = await engine.checkBuyerEligibility('buyer-1');

    expect(result).toEqual({
      eligible: false,
      reason: 'Buyer must be identity verified for COD'
    });
  });

  it('rejects buyer when COD is permanently disabled', async () => {
    authService.isUserVerified.mockResolvedValue(true);
    userService.getCODReputation.mockResolvedValue({
      score: 90,
      successfulOrders: 10,
      permanentlyDisabled: true
    });

    const result = await engine.checkBuyerEligibility('buyer-2');

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('permanently disabled');
  });

  it('rejects buyer during suspension window', async () => {
    const suspendedUntil = new Date(Date.now() + 60_000);
    authService.isUserVerified.mockResolvedValue(true);
    userService.getCODReputation.mockResolvedValue({
      score: 90,
      successfulOrders: 10,
      suspendedUntil
    });

    const result = await engine.checkBuyerEligibility('buyer-3');

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain(suspendedUntil.toISOString());
  });

  it('rejects buyer with low reputation score', async () => {
    authService.isUserVerified.mockResolvedValue(true);
    userService.getCODReputation.mockResolvedValue({
      score: 49,
      successfulOrders: 10
    });

    const result = await engine.checkBuyerEligibility('buyer-4');

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('below required minimum of 50');
  });

  it('rejects buyer with insufficient successful orders', async () => {
    authService.isUserVerified.mockResolvedValue(true);
    userService.getCODReputation.mockResolvedValue({
      score: 80,
      successfulOrders: 2
    });

    const result = await engine.checkBuyerEligibility('buyer-5');

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('at least 3 successful orders');
  });

  it('accepts buyer when all eligibility conditions pass', async () => {
    authService.isUserVerified.mockResolvedValue(true);
    userService.getCODReputation.mockResolvedValue({
      score: 80,
      successfulOrders: 7
    });

    const result = await engine.checkBuyerEligibility('buyer-6');

    expect(result).toEqual({ eligible: true });
  });

  it('checks seller verification for COD acceptance', async () => {
    authService.isUserVerified.mockResolvedValue(false);
    await expect(engine.checkSellerEligibility('seller-1')).resolves.toEqual({
      eligible: false,
      reason: 'Seller must be verified to accept COD'
    });

    authService.isUserVerified.mockResolvedValue(true);
    await expect(engine.checkSellerEligibility('seller-2')).resolves.toEqual({
      eligible: true
    });
  });

  it('rejects order when amount is outside COD threshold', async () => {
    const order = {
      totalAmount: 999,
      deliveryAddress: {},
      items: []
    };

    const result = await engine.checkOrderEligibility(order as never, {});

    expect(result.eligible).toBe(false);
    expect(result.reason).toContain('between 1000 and 500000');
  });

  it('rejects order when COD is unsupported in delivery area', async () => {
    logisticsService.isCODSupportedInArea.mockResolvedValue(false);
    const order = {
      totalAmount: 1500,
      deliveryAddress: { region: 'A' },
      items: []
    };

    const result = await engine.checkOrderEligibility(order as never, { region: 'A' });

    expect(logisticsService.isCODSupportedInArea).toHaveBeenCalledWith({ region: 'A' });
    expect(result).toEqual({
      eligible: false,
      reason: 'COD is not supported in the selected delivery area'
    });
  });

  it('rejects order for cross-region delivery', async () => {
    logisticsService.isCODSupportedInArea.mockResolvedValue(true);
    logisticsService.isCrossRegionDelivery.mockResolvedValue(true);
    const order = {
      totalAmount: 2000,
      deliveryAddress: { region: 'A' },
      items: []
    };

    const result = await engine.checkOrderEligibility(order as never, { region: 'B' });

    expect(result).toEqual({
      eligible: false,
      reason: 'COD is not available for cross-region deliveries'
    });
  });

  it('rejects order containing high-risk sku items', async () => {
    logisticsService.isCODSupportedInArea.mockResolvedValue(true);
    logisticsService.isCrossRegionDelivery.mockResolvedValue(false);
    jest.spyOn(engine as any, 'isHighRiskSKU').mockImplementation(() => true);

    const result = await engine.checkOrderEligibility(
      {
        totalAmount: 5000,
        deliveryAddress: { region: 'A' },
        items: [{ productId: 'risk-1' }]
      } as never,
      { region: 'A' }
    );

    expect(result).toEqual({
      eligible: false,
      reason: 'Order contains high-risk items ineligible for COD'
    });
  });

  it('accepts order when amount, logistics, and sku checks pass', async () => {
    logisticsService.isCODSupportedInArea.mockResolvedValue(true);
    logisticsService.isCrossRegionDelivery.mockResolvedValue(false);
    jest.spyOn(engine as any, 'isHighRiskSKU').mockImplementation(() => false);

    const result = await engine.checkOrderEligibility(
      {
        totalAmount: 5000,
        deliveryAddress: { region: 'A' },
        items: [{ productId: 'safe-1' }]
      } as never,
      { region: 'A' }
    );

    expect(result).toEqual({ eligible: true });
  });

  it('calculates commitment fee with minimum floor and percentage branch', () => {
    expect(engine.calculateCommitmentFee(20_000)).toBe(5000);
    expect(engine.calculateCommitmentFee(200_000)).toBe(10_000);
  });
});
