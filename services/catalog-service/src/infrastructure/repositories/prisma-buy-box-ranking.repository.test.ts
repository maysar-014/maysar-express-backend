import { GeographicZone, type ScoreSnapshotInput } from '../../domain/buy-box/types';
import { PrismaBuyBoxRankingRepository } from './prisma-buy-box-ranking.repository';

const buildPrismaMock = () => ({
  order_Order: {
    findMany: jest.fn(),
  },
  productVariant: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  inventory_StockItem: {
    findFirst: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  catalog_OperatorAuditLog: {
    findFirst: jest.fn(),
  },
  catalog_CategoryStrategy: {
    findUnique: jest.fn(),
  },
  catalog_ScoreSnapshot: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  buyBox: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    deleteMany: jest.fn(),
  },
  catalog_BuyBoxAlternative: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  catalog_AnomalyFlag: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  catalog_ZonePerformance: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  catalog_BuyBoxOverride: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
  },
  $transaction: jest.fn(async (callback: any) => callback({
    buyBox: {
      upsert: jest.fn().mockResolvedValue({ id: 'buy-box-1' }),
    },
    catalog_BuyBoxAlternative: {
      deleteMany: jest.fn().mockResolvedValue(undefined),
      createMany: jest.fn().mockResolvedValue(undefined),
    },
  })),
});

describe('PrismaBuyBoxRankingRepository', () => {
  it('maps seller signal data from the live schema shape', async () => {
    const prisma = buildPrismaMock();
    prisma.order_Order.findMany.mockResolvedValue([
      {
        buyerId: 'buyer-1',
        status: 'DELIVERED',
        paymentMethod: 'COD',
        codDeliveryConfirmedAt: null,
        codDisputes: [{ id: 'd1' }],
      },
      {
        buyerId: 'buyer-2',
        status: 'CANCELLED',
        paymentMethod: 'CARD',
        codDisputes: [],
      },
    ]);
    prisma.productVariant.findFirst.mockResolvedValue({ id: 'variant-1', price: '123.45' });
    prisma.productVariant.findMany.mockResolvedValue([
      { price: '123.45' },
      { price: '150.00' },
    ]);
    prisma.inventory_StockItem.findFirst.mockResolvedValue({ quantityAvailable: 8 });
    prisma.user.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      isEmailVerified: true,
    });
    prisma.catalog_OperatorAuditLog.findFirst.mockResolvedValue({
      newValue: {
        mean: { priceCompetitiveness: 80 },
        stdDev: { priceCompetitiveness: 10 },
      },
    });

    const repository = new PrismaBuyBoxRankingRepository(prisma as never);
    const result = await repository.getSellerSignalData('seller-1', 'product-1');

    expect(result).toMatchObject({
      sellerId: 'seller-1',
      productId: 'product-1',
      offerPrice: 123.45,
      allOfferPrices: [123.45, 150],
      stockLevel: 8,
      accountStatus: 'active',
      orderCount: 2,
      disputeCount: 1,
      cancellationCount: 1,
      returnCount: 1,
      fulfillmentCount: 1,
      codOrderCount: 1,
      codRefusalCount: 1,
      repeatBuyerCount: 0,
      retentionOrderCount: 2,
      isVerifiedIdentity: true,
    });
    expect(result.rollingMean).toEqual({ priceCompetitiveness: 80 });
    expect(result.rollingStdDev).toEqual({ priceCompetitiveness: 10 });
  });

  it('persists buy box state, score snapshots, and supporting records', async () => {
    const prisma = buildPrismaMock();
    prisma.catalog_CategoryStrategy.findUnique.mockResolvedValue({
      categoryId: 'ELECTRONICS',
      name: 'Electronics',
      weights: { priceCompetitiveness: 1 },
      explorationBudget: 0.1,
    });
    prisma.catalog_ScoreSnapshot.findMany.mockResolvedValue([
      {
        productId: 'product-1',
        sellerId: 'seller-1',
        compositeScore: 98,
        signalValues: {},
        signalWeights: {},
        assignmentType: 'MERIT',
        strategyName: 'ELECTRONICS',
        geographicZone: null,
        anomalyFlags: [],
        computedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    prisma.buyBox.findUnique.mockResolvedValue({ primarySellerId: 'seller-1' });
    prisma.catalog_ZonePerformance.findUnique.mockResolvedValue({
      deliverySuccessRate: 0.9,
      avgDeliveryDays: 2,
      orderCount: 9,
    });

    const repository = new PrismaBuyBoxRankingRepository(prisma as never);
    const snapshot: ScoreSnapshotInput = {
      productId: 'product-1',
      sellerId: 'seller-1',
      compositeScore: 99,
      signalValues: {} as never,
      signalWeights: {} as never,
      assignmentType: 'MERIT',
      strategyName: 'ELECTRONICS',
      computedAt: new Date('2026-01-02T00:00:00.000Z'),
    };

    await repository.saveScoreSnapshot(snapshot);
    await repository.saveBuyBoxWinner('product-1', 'seller-1', 99, 'MERIT', [
      { sellerId: 'seller-2', compositeScore: 88, rank: 2 },
    ]);
    await repository.clearBuyBox('product-1');
    await repository.saveAnomalyFlag({
      sellerId: 'seller-1',
      signalName: 'priceCompetitiveness',
      detectedValue: 10,
      expectedMin: 40,
      expectedMax: 60,
      flaggedAt: new Date('2026-01-02T00:00:00.000Z'),
    });
    await repository.clearAnomalyFlag('flag-1', 'operator-1', new Date('2026-01-03T00:00:00.000Z'));
    await repository.upsertZonePerformance('seller-1', GeographicZone.DAR_ES_SALAAM_OTHER, 0.9, 2, 9);
    await repository.upsertBuyBoxOverride({
      productId: 'product-1',
      sellerId: 'seller-1',
      operatorId: 'operator-1',
      reason: 'manual override',
      startAt: new Date('2026-01-03T00:00:00.000Z'),
    });

    expect(prisma.catalog_ScoreSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'product-1',
        sellerId: 'seller-1',
        compositeScore: 99,
      }),
    });
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.buyBox.deleteMany).toHaveBeenCalledWith({ where: { productId: 'product-1' } });
    expect(prisma.catalog_AnomalyFlag.create).toHaveBeenCalled();
    expect(prisma.catalog_AnomalyFlag.update).toHaveBeenCalledWith({
      where: { id: 'flag-1' },
      data: expect.objectContaining({ clearedByOperatorId: 'operator-1' }),
    });
    expect(prisma.catalog_ZonePerformance.upsert).toHaveBeenCalled();
    expect(prisma.catalog_BuyBoxOverride.upsert).toHaveBeenCalled();
  });

  it('reads category strategy, zone performance, anomaly flags, and score snapshots', async () => {
    const prisma = buildPrismaMock();
    prisma.catalog_CategoryStrategy.findUnique.mockResolvedValue({
      categoryId: 'ELECTRONICS',
      name: 'Electronics',
      weights: { priceCompetitiveness: 1 },
      explorationBudget: 0.1,
    });
    prisma.catalog_AnomalyFlag.findMany.mockResolvedValue([
      { signalName: 'priceCompetitiveness', flaggedAt: new Date('2026-01-02T00:00:00.000Z') },
    ]);
    prisma.catalog_ZonePerformance.findUnique.mockResolvedValue({
      deliverySuccessRate: 0.8,
      avgDeliveryDays: 3,
      orderCount: 6,
    });
    prisma.buyBox.findUnique.mockResolvedValue({ primarySellerId: 'seller-1' });
    prisma.catalog_ScoreSnapshot.findMany.mockResolvedValue([
      {
        productId: 'product-1',
        sellerId: 'seller-1',
        compositeScore: 95,
        signalValues: {},
        signalWeights: {},
        assignmentType: 'MERIT',
        strategyName: 'ELECTRONICS',
        geographicZone: 'DAR_ES_SALAAM_OTHER',
        anomalyFlags: [],
        computedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);

    const repository = new PrismaBuyBoxRankingRepository(prisma as never);

    await expect(repository.getCategoryStrategy('ELECTRONICS')).resolves.toMatchObject({
      categoryId: 'ELECTRONICS',
      name: 'Electronics',
    });
    await expect(repository.getAnomalyFlags('seller-1', 30)).resolves.toEqual([
      {
        signalName: 'priceCompetitiveness',
        flaggedAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]);
    await expect(repository.getZonePerformance('seller-1', GeographicZone.DAR_ES_SALAAM_OTHER)).resolves.toEqual({
      deliverySuccessRate: 0.8,
      avgDeliveryDays: 3,
      orderCount: 6,
    });
    await expect(repository.getCurrentBuyBoxWinner('product-1')).resolves.toBe('seller-1');
    await expect(repository.getScoreSnapshots('product-1')).resolves.toEqual([
      expect.objectContaining({
        productId: 'product-1',
        sellerId: 'seller-1',
        compositeScore: 95,
      }),
    ]);
  });
});
