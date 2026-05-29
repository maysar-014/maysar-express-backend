import { FraudDetector } from '../fraud-detector';
import { RankingEngine } from '../ranking-engine';
import { CategoryStrategy, GeographicZone } from '../types';

const strategy: CategoryStrategy = {
  categoryId: 'ELECTRONICS',
  name: 'ELECTRONICS',
  explorationBudget: 0.1,
  weights: {
    priceCompetitiveness: 0.15,
    sellerTrustScore: 0.28,
    fulfillmentReliability: 0.22,
    deliverySpeed: 0.1,
    stockReliability: 0.08,
    disputeRate: 0.08,
    cancellationRate: 0.05,
    returnRate: 0.03,
    customerRetentionImpact: 0.01,
  },
  minTrustScoreThreshold: 70,
};

const buildSignalData = (overrides: Partial<any> = {}) => ({
  sellerId: 'seller-1',
  productId: 'product-1',
  offerPrice: 100,
  allOfferPrices: [100, 100],
  stockLevel: 20,
  accountStatus: 'active',
  orderCount: 10,
  disputeCount: 0,
  cancellationCount: 0,
  returnCount: 0,
  fulfillmentCount: 10,
  stockOutCancellationCount: 0,
  accountAgeDays: 365,
  isVerifiedIdentity: true,
  complianceScore: 90,
  codRefusalCount: 0,
  codOrderCount: 0,
  retentionOrderCount: 10,
  repeatBuyerCount: 8,
  commissionTier: 0.1,
  logisticsCostEstimate: 1000,
  rollingMean: {
    priceCompetitiveness: 50,
    sellerTrustScore: 50,
    fulfillmentReliability: 50,
    deliverySpeed: 50,
    stockReliability: 50,
    disputeRate: 50,
    cancellationRate: 50,
    returnRate: 50,
    customerRetentionImpact: 50,
  },
  rollingStdDev: {
    priceCompetitiveness: 100,
    sellerTrustScore: 100,
    fulfillmentReliability: 100,
    deliverySpeed: 100,
    stockReliability: 100,
    disputeRate: 100,
    cancellationRate: 100,
    returnRate: 100,
    customerRetentionImpact: 100,
  },
  platformCategoryAverages: {},
  ...overrides,
});

describe('RankingEngine', () => {
  const repository = {
    getSellerSignalData: jest.fn(),
    getCategoryStrategy: jest.fn(),
    saveScoreSnapshot: jest.fn(),
    saveBuyBoxWinner: jest.fn(),
    getActiveOverride: jest.fn(),
    getAnomalyFlags: jest.fn(),
    getZonePerformance: jest.fn(),
    getPlatformCategoryAverages: jest.fn(),
    getEligibleSellerOffers: jest.fn(),
    getRecentBuyBoxWinners: jest.fn(),
    getCurrentBuyBoxWinner: jest.fn(),
    clearBuyBox: jest.fn(),
    saveAnomalyFlag: jest.fn(),
    clearAnomalyFlag: jest.fn(),
    writeOperatorAuditLog: jest.fn(),
    upsertZonePerformance: jest.fn(),
    getScoreSnapshots: jest.fn(),
    upsertBuyBoxOverride: jest.fn(),
  };

  const engine = new RankingEngine(new FraudDetector(), repository as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes a bounded score and applies zone adjustments', async () => {
    repository.getSellerSignalData.mockResolvedValue(buildSignalData());
    repository.getAnomalyFlags.mockResolvedValue([]);
    repository.getZonePerformance.mockResolvedValue({
      deliverySuccessRate: 0.9,
      avgDeliveryDays: 2,
      orderCount: 20,
    });

    const result = await engine.computeCompositeScore(
      'seller-1',
      'product-1',
      {
        productId: 'product-1',
        buyerZone: GeographicZone.DAR_ES_SALAAM_KARIAKOO,
        paymentMethod: 'CARD',
      },
      strategy,
      [95, 100]
    );

    expect(repository.getSellerSignalData).toHaveBeenCalledWith(
      'seller-1',
      'product-1',
      GeographicZone.DAR_ES_SALAAM_KARIAKOO
    );
    expect(repository.getZonePerformance).toHaveBeenCalledWith('seller-1', GeographicZone.DAR_ES_SALAAM_KARIAKOO);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeScore).toBeLessThanOrEqual(100);
    expect(result.anomalyFlags).toHaveLength(0);
  });

  it('selects the highest scoring seller and filters disqualified offers', async () => {
    repository.getEligibleSellerOffers.mockResolvedValue([
      { sellerId: 'seller-low', price: 100, stockLevel: 5, accountStatus: 'active' },
      { sellerId: 'seller-high', price: 100, stockLevel: 5, accountStatus: 'active' },
      { sellerId: 'seller-offline', price: 100, stockLevel: 0, accountStatus: 'active' },
    ]);

    repository.getSellerSignalData.mockImplementation(async (sellerId: string) =>
      buildSignalData(
        sellerId === 'seller-high'
          ? {
              sellerId,
              isVerifiedIdentity: true,
              accountAgeDays: 500,
              disputeCount: 0,
              complianceScore: 98,
              fulfillmentCount: 10,
              orderCount: 10,
              repeatBuyerCount: 9,
            }
          : {
              sellerId,
              isVerifiedIdentity: true,
              accountAgeDays: 180,
              disputeCount: 2,
              complianceScore: 60,
              fulfillmentCount: 8,
              orderCount: 10,
              repeatBuyerCount: 4,
            }
      )
    );
    repository.getAnomalyFlags.mockResolvedValue([]);

    const result = await engine.selectBuyBoxWinner(
      'product-1',
      { productId: 'product-1', paymentMethod: 'COD' },
      strategy
    );

    expect(result.winnerId).toBe('seller-high');
    expect(result.alternatives).toHaveLength(1);
    expect(result.alternatives[0].sellerId).toBe('seller-low');
  });

  it('throws when no sellers qualify', async () => {
    repository.getEligibleSellerOffers.mockResolvedValue([]);

    await expect(
      engine.selectBuyBoxWinner(
        'product-1',
        { productId: 'product-1' },
        strategy
      )
    ).rejects.toThrow('NO_ELIGIBLE_SELLERS');
  });
});
