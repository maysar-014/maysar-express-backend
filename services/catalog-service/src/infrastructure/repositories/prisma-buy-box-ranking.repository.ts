// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { BuyBoxRankingRepository } from '../../domain/buy-box/repositories/buy-box-ranking.repository.interface';
import {
  CategoryStrategy,
  GeographicZone,
  ScoreSnapshotInput,
  SellerOffer,
  SellerSignalData,
  SignalValues,
} from '../../domain/buy-box/types';

export class PrismaBuyBoxRankingRepository implements BuyBoxRankingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSellerSignalData(
    sellerId: string,
    productId: string,
    zone?: GeographicZone
  ): Promise<SellerSignalData> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Query orders for this seller within the 90-day window
    const orders = await this.prisma.order_Order.findMany({
      where: {
        sellerId,
        createdAt: { gte: ninetyDaysAgo },
      },
      include: {
        codDisputes: true,
      },
    });

    const orderCount = orders.length;
    const disputeCount = orders.reduce(
      (sum, o) => sum + (o.codDisputes?.length ?? 0),
      0
    );
    const cancellationCount = orders.filter(
      (o) => o.status === 'CANCELLED'
    ).length;
    const fulfillmentCount = orders.filter(
      (o) => o.status === 'DELIVERED'
    ).length;
    // Use cancellations as a proxy for returns (no dedicated return status)
    const returnCount = cancellationCount;

    // Stock-out cancellations: cancelled orders (proxy)
    const stockOutCancellationCount = cancellationCount;

    // COD-specific: orders where COD delivery was not confirmed (refusal proxy)
    const codOrders = orders.filter((o) => o.paymentMethod === 'COD');
    const codOrderCount = codOrders.length;
    const codRefusalCount = codOrders.filter(
      (o) =>
        o.codDeliveryConfirmedAt === null && o.status === 'DELIVERED'
    ).length;

    // Get current stock level for the product variant
    let stockLevel = 0;
    let offerPrice = 0;
    const variant = await this.prisma.productVariant.findFirst({
      where: { productId },
    });
    if (variant) {
      offerPrice = variant.price ? Number(variant.price) : 0;
      const stockItem = await this.prisma.inventory_StockItem.findFirst({
        where: { productVariantId: variant.id },
      });
      stockLevel = stockItem?.quantityAvailable ?? 0;
    }

    // Get all offer prices for the product (all variants of this product)
    const allVariants = await this.prisma.productVariant.findMany({
      where: { productId },
    });
    const allOfferPrices = allVariants.map((v) => Number(v.price)).filter((p) => p > 0);

    // Get account status and creation date from auth_users
    let accountStatus = 'active';
    let accountAgeDays = 0;
    let isVerifiedIdentity = false;
    const user = await this.prisma.user.findUnique({
      where: { id: sellerId },
    });
    if (user) {
      accountStatus = user.status?.toLowerCase() ?? 'active';
      const createdAt = user.createdAt ?? new Date();
      accountAgeDays = Math.floor(
        (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      isVerifiedIdentity = user.isEmailVerified ?? false;
    }

    // Zone performance
    let zonePerformance: {
      deliverySuccessRate: number;
      avgDeliveryDays: number;
      orderCount: number;
    } | null = null;
    if (zone) {
      zonePerformance = await this.getZonePerformance(sellerId, zone);
    }

    // Retention: repeat buyers (simplified — count orders from same buyer)
    const buyerCounts: Record<string, number> = {};
    for (const o of orders) {
      buyerCounts[o.buyerId] = (buyerCounts[o.buyerId] ?? 0) + 1;
    }
    const repeatBuyerCount = Object.values(buyerCounts).filter((c) => c > 1).length;
    const retentionOrderCount = orderCount;

    // Load the most recent rolling stats computed by RollingAverageJob
    const rollingStatsRecord = await this.prisma.catalog_OperatorAuditLog.findFirst({
      where: {
        entityType: 'SellerRollingStats',
        entityId: sellerId,
        field: 'stats',
      },
      orderBy: { changedAt: 'desc' },
    });

    let rollingMean: Partial<SignalValues> = {};
    let rollingStdDev: Partial<SignalValues> = {};

    if (rollingStatsRecord?.newValue) {
      const stats = rollingStatsRecord.newValue as any;
      if (stats.mean) rollingMean = stats.mean;
      if (stats.stdDev) rollingStdDev = stats.stdDev;
    }

    return {
      sellerId,
      productId,
      offerPrice,
      allOfferPrices,
      stockLevel,
      accountStatus,
      orderCount,
      disputeCount,
      cancellationCount,
      returnCount,
      fulfillmentCount,
      stockOutCancellationCount,
      accountAgeDays,
      isVerifiedIdentity,
      complianceScore: 80, // default — no compliance table available
      codRefusalCount,
      codOrderCount,
      retentionOrderCount,
      repeatBuyerCount,
      commissionTier: 0.08, // default 8%
      logisticsCostEstimate: 0,
      rollingMean,
      rollingStdDev,
      platformCategoryAverages: {
        disputeRate: 90,
        cancellationRate: 92,
        returnRate: 88,
      },
    };
  }

  async getCategoryStrategy(categoryId: string): Promise<CategoryStrategy | null> {
    const record = await this.prisma.catalog_CategoryStrategy.findUnique({
      where: { categoryId },
    });
    if (!record) return null;

    return {
      categoryId: record.categoryId,
      name: record.name,
      weights: record.weights as any,
      explorationBudget: record.explorationBudget,
    };
  }

  async saveScoreSnapshot(snapshot: ScoreSnapshotInput): Promise<void> {
    await this.prisma.catalog_ScoreSnapshot.create({
      data: {
        productId: snapshot.productId,
        sellerId: snapshot.sellerId,
        compositeScore: snapshot.compositeScore,
        signalValues: snapshot.signalValues as any,
        signalWeights: snapshot.signalWeights as any,
        assignmentType: snapshot.assignmentType,
        strategyName: snapshot.strategyName,
        geographicZone: snapshot.geographicZone ?? null,
        anomalyFlags: snapshot.anomalyFlags as any,
        computedAt: snapshot.computedAt,
      },
    });
  }

  async saveBuyBoxWinner(
    productId: string,
    winnerId: string,
    compositeScore: number,
    assignmentType: 'MERIT' | 'EXPLORATION',
    alternatives: Array<{ sellerId: string; compositeScore: number; rank: number }>
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Upsert the buy box record
      const buyBox = await tx.buyBox.upsert({
        where: { productId },
        update: {
          primarySellerId: winnerId,
          primaryScore: compositeScore,
          compositeScore,
          assignmentType,
          lastComputedAt: new Date(),
        },
        create: {
          productId,
          primarySellerId: winnerId,
          primaryScore: compositeScore,
          compositeScore,
          assignmentType,
          lastComputedAt: new Date(),
        },
      });

      // Delete existing alternatives
      await tx.catalog_BuyBoxAlternative.deleteMany({
        where: { buyBoxId: buyBox.id },
      });

      // Create new alternatives
      if (alternatives.length > 0) {
        await tx.catalog_BuyBoxAlternative.createMany({
          data: alternatives.map((alt) => ({
            buyBoxId: buyBox.id,
            sellerId: alt.sellerId,
            score: alt.compositeScore,
            compositeScore: alt.compositeScore,
            rank: alt.rank,
          })),
        });
      }
    });
  }

  async getActiveOverride(
    productId: string
  ): Promise<{ sellerId: string; operatorId: string; reason: string } | null> {
    const now = new Date();
    const override = await this.prisma.catalog_BuyBoxOverride.findFirst({
      where: {
        productId,
        startAt: { lte: now },
        OR: [{ endAt: null }, { endAt: { gt: now } }],
      },
    });
    if (!override) return null;
    return {
      sellerId: override.sellerId,
      operatorId: override.operatorId,
      reason: override.reason,
    };
  }

  async getAnomalyFlags(
    sellerId: string,
    withinDays: number
  ): Promise<Array<{ signalName: string; flaggedAt: Date }>> {
    const since = new Date();
    since.setDate(since.getDate() - withinDays);

    const flags = await this.prisma.catalog_AnomalyFlag.findMany({
      where: {
        sellerId,
        flaggedAt: { gte: since },
        clearedAt: null,
      },
    });

    return flags.map((f) => ({
      signalName: f.signalName,
      flaggedAt: f.flaggedAt,
    }));
  }

  async getZonePerformance(
    sellerId: string,
    zone: GeographicZone
  ): Promise<{ deliverySuccessRate: number; avgDeliveryDays: number; orderCount: number } | null> {
    const record = await this.prisma.catalog_ZonePerformance.findUnique({
      where: {
        sellerId_geographicZone: {
          sellerId,
          geographicZone: zone,
        },
      },
    });
    if (!record) return null;
    return {
      deliverySuccessRate: record.deliverySuccessRate,
      avgDeliveryDays: record.avgDeliveryDays,
      orderCount: record.orderCount,
    };
  }

  async getPlatformCategoryAverages(categoryId: string): Promise<Partial<SignalValues>> {
    // Hardcoded reasonable defaults — can be replaced with real aggregation later
    return {
      disputeRate: 90,
      cancellationRate: 92,
      returnRate: 88,
    };
  }

  async getEligibleSellerOffers(productId: string): Promise<SellerOffer[]> {
    // Get all variants for the product
    const variants = await this.prisma.productVariant.findMany({
      where: { productId },
      include: {
        product: true,
      },
    });

    const offers: SellerOffer[] = [];

    for (const variant of variants) {
      const sellerId = variant.product?.sellerId;
      if (!sellerId) continue;

      // Get stock level
      const stockItem = await this.prisma.inventory_StockItem.findFirst({
        where: { productVariantId: variant.id },
      });
      const stockLevel = stockItem?.quantityAvailable ?? 0;

      // Get account status
      let accountStatus = 'active';
      const user = await this.prisma.user.findUnique({
        where: { id: sellerId },
      });
      if (user) {
        accountStatus = user.status?.toLowerCase() ?? 'active';
      }

      offers.push({
        sellerId,
        price: Number(variant.price),
        stockLevel,
        accountStatus,
      });
    }

    return offers;
  }

  async getRecentBuyBoxWinners(productId: string, withinDays: number): Promise<string[]> {
    const since = new Date();
    since.setDate(since.getDate() - withinDays);

    const snapshots = await this.prisma.catalog_ScoreSnapshot.findMany({
      where: {
        productId,
        computedAt: { gte: since },
        assignmentType: { in: ['MERIT', 'EXPLORATION'] },
      },
      select: { sellerId: true },
      distinct: ['sellerId'],
    });

    return snapshots.map((s) => s.sellerId);
  }

  async getCurrentBuyBoxWinner(productId: string): Promise<string | null> {
    const buyBox = await this.prisma.buyBox.findUnique({
      where: { productId },
    });
    return buyBox?.primarySellerId ?? null;
  }

  async clearBuyBox(productId: string): Promise<void> {
    await this.prisma.buyBox.deleteMany({
      where: { productId },
    });
  }

  async saveAnomalyFlag(flag: {
    sellerId: string;
    signalName: string;
    detectedValue: number;
    expectedMin: number;
    expectedMax: number;
    flaggedAt: Date;
  }): Promise<void> {
    await this.prisma.catalog_AnomalyFlag.create({
      data: flag,
    });
  }

  async clearAnomalyFlag(flagId: string, operatorId: string, clearedAt: Date): Promise<void> {
    await this.prisma.catalog_AnomalyFlag.update({
      where: { id: flagId },
      data: {
        clearedAt,
        clearedByOperatorId: operatorId,
      },
    });
  }

  async writeOperatorAuditLog(entry: {
    operatorId: string;
    entityType: string;
    entityId: string;
    field: string;
    previousValue?: unknown;
    newValue?: unknown;
    changedAt: Date;
  }): Promise<void> {
    await this.prisma.catalog_OperatorAuditLog.create({
      data: {
        operatorId: entry.operatorId,
        entityType: entry.entityType,
        entityId: entry.entityId,
        field: entry.field,
        previousValue: entry.previousValue as any,
        newValue: entry.newValue as any,
        changedAt: entry.changedAt,
      },
    });
  }

  async upsertZonePerformance(
    sellerId: string,
    zone: GeographicZone,
    deliverySuccessRate: number,
    avgDeliveryDays: number,
    orderCount: number
  ): Promise<void> {
    await this.prisma.catalog_ZonePerformance.upsert({
      where: {
        sellerId_geographicZone: {
          sellerId,
          geographicZone: zone,
        },
      },
      update: {
        deliverySuccessRate,
        avgDeliveryDays,
        orderCount,
      },
      create: {
        sellerId,
        geographicZone: zone,
        deliverySuccessRate,
        avgDeliveryDays,
        orderCount,
      },
    });
  }

  async getScoreSnapshots(productId: string): Promise<ScoreSnapshotInput[]> {
    const records = await this.prisma.catalog_ScoreSnapshot.findMany({
      where: { productId },
      orderBy: { computedAt: 'desc' },
    });
    return records.map((r) => ({
      productId: r.productId,
      sellerId: r.sellerId,
      compositeScore: r.compositeScore,
      signalValues: r.signalValues as any,
      signalWeights: r.signalWeights as any,
      assignmentType: r.assignmentType as 'MERIT' | 'EXPLORATION',
      strategyName: r.strategyName,
      geographicZone: r.geographicZone ?? undefined,
      anomalyFlags: r.anomalyFlags as any,
      computedAt: r.computedAt,
    }));
  }

  async upsertBuyBoxOverride(override: {
    productId: string;
    sellerId: string;
    operatorId: string;
    reason: string;
    startAt: Date;
    endAt?: Date;
  }): Promise<void> {
    await this.prisma.catalog_BuyBoxOverride.upsert({
      where: { productId: override.productId },
      update: {
        sellerId: override.sellerId,
        operatorId: override.operatorId,
        reason: override.reason,
        startAt: override.startAt,
        endAt: override.endAt ?? null,
      },
      create: {
        productId: override.productId,
        sellerId: override.sellerId,
        operatorId: override.operatorId,
        reason: override.reason,
        startAt: override.startAt,
        endAt: override.endAt ?? null,
      },
    });
  }
}
