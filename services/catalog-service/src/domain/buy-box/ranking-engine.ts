/**
 * Buy Box Ranking System — Ranking Engine
 * Orchestrates signal computers, fraud detection, geographic adjustments,
 * and penalty/bonus logic to produce composite scores and select the Buy Box winner.
 *
 * Requirements: 1, 2, 3, 4, 5, 7, 8, 9, 12
 */

import { FraudDetector } from './fraud-detector';
import { BuyBoxRankingRepository } from './repositories/buy-box-ranking.repository.interface';
import {
  computePriceCompetitiveness,
  computeSellerTrustScore,
  computeFulfillmentReliability,
  computeStockReliability,
  computeRateSignal,
  computeMarginContribution,
} from './signals';
import {
  BuyBoxContext,
  BuyBoxSelectionResult,
  CategoryStrategy,
  CompositeScoreResult,
  SIGNAL_KEYS,
  SignalValues,
} from './types';

// ---------------------------------------------------------------------------
// RankingEngine
// ---------------------------------------------------------------------------

export class RankingEngine {
  constructor(
    private readonly fraudDetector: FraudDetector,
    private readonly repository: BuyBoxRankingRepository,
  ) {}

  /**
   * Compute the composite score for a single seller's offer on a product.
   *
   * Steps:
   *  1. Fetch raw signal data from the repository.
   *  2. Count active anomaly flags (last 30 days, uncleared).
   *  3. Build raw SignalValues from signal computers.
   *  4. Run FraudDetector anomaly detection pre-pass.
   *  5. Apply anomaly substitutions.
   *  6. Apply geographic zone adjustment when zone data is available.
   *  7. Compute penalties and bonuses.
   *  8. Compute weighted sum.
   *  9. Apply penalties and bonuses.
   * 10. Clamp to [0, 100].
   * 11. Return CompositeScoreResult.
   */
  async computeCompositeScore(
    sellerId: string,
    productId: string,
    context: BuyBoxContext,
    strategy: CategoryStrategy,
    allOfferPrices: number[],
  ): Promise<CompositeScoreResult> {
    // Step 1: Fetch raw signal data
    const data = await this.repository.getSellerSignalData(
      sellerId,
      productId,
      context.buyerZone,
    );

    // Step 2: Count active anomaly flags (uncleared within last 30 days)
    const rawFlags = await this.repository.getAnomalyFlags(sellerId, 30);
    const activeFlagCount = rawFlags.length;

    // Step 3: Build raw SignalValues from signal computers
    const priceCompetitiveness = computePriceCompetitiveness(
      data.offerPrice,
      allOfferPrices,
    );

    const sellerTrustScore = computeSellerTrustScore({
      verifiedIdentity: data.isVerifiedIdentity,
      accountAgeDays: data.accountAgeDays,
      disputeHistory: data.disputeCount,
      complianceScore: data.complianceScore,
    });

    const fulfillmentReliability = computeFulfillmentReliability({
      fulfillmentRate:
        data.orderCount > 0
          ? (data.fulfillmentCount / data.orderCount) * 100
          : 50,
      codRefusalRate:
        data.codOrderCount > 0
          ? data.codRefusalCount / data.codOrderCount
          : 0,
      paymentMethod: context.paymentMethod,
    });

    const deliverySpeed = data.rollingMean.deliverySpeed ?? 50;

    const stockReliability = computeStockReliability({
      stockOutCancellationRate:
        data.orderCount > 0
          ? data.stockOutCancellationCount / data.orderCount
          : 0,
      currentStockLevel: data.stockLevel,
    });

    const disputeRate = computeRateSignal(
      data.orderCount > 0 ? data.disputeCount / data.orderCount : 0,
    );

    const cancellationRate = computeRateSignal(
      data.orderCount > 0 ? data.cancellationCount / data.orderCount : 0,
    );

    const returnRate = computeRateSignal(
      data.orderCount > 0 ? data.returnCount / data.orderCount : 0,
    );

    const customerRetentionImpact =
      data.retentionOrderCount > 0
        ? (data.repeatBuyerCount / data.retentionOrderCount) * 100
        : 50;

    const rawSignals: SignalValues = {
      priceCompetitiveness,
      sellerTrustScore,
      fulfillmentReliability,
      deliverySpeed,
      stockReliability,
      disputeRate,
      cancellationRate,
      returnRate,
      customerRetentionImpact,
    };

    // Step 4: Run FraudDetector anomaly detection pre-pass
    const anomalyFlags = this.fraudDetector.detectAnomalies(
      {
        signalValues: rawSignals,
        currentOfferPrice: data.offerPrice,
        currentStockLevel: data.stockLevel,
      },
      {
        rollingMean: data.rollingMean,
        rollingStdDev: data.rollingStdDev,
        thirtyDayAveragePrice: data.rollingMean.priceCompetitiveness,
        stockLevelYesterday: data.stockLevel,
        hasPromotionalCampaign: false,
        hasSupplierShipmentRecord: false,
      },
    );

    // Step 5: Apply anomaly substitutions
    let adjustedSignals = this.fraudDetector.applyAnomalySubstitutions(
      rawSignals,
      anomalyFlags,
    );

    // Step 6: Apply geographic zone adjustment when zone data is available
    if (context.buyerZone !== undefined) {
      const zoneData = await this.repository.getZonePerformance(
        sellerId,
        context.buyerZone,
      );

      if (zoneData !== null && zoneData.orderCount >= 5) {
        const zoneDeliverySuccessRate = zoneData.deliverySuccessRate;

        // Blend zone delivery success rate (70%) with existing fulfillmentReliability (30%)
        const zoneAdjustedFulfillment =
          zoneDeliverySuccessRate * 100 * 0.70 +
          adjustedSignals.fulfillmentReliability * 0.30;

        // Use zone delivery success rate as delivery speed proxy (blended with existing)
        const zoneAdjustedDeliverySpeed =
          zoneDeliverySuccessRate * 100 * 0.70 +
          adjustedSignals.deliverySpeed * 0.30;

        adjustedSignals = {
          ...adjustedSignals,
          fulfillmentReliability: Math.max(
            0,
            Math.min(100, zoneAdjustedFulfillment),
          ),
          deliverySpeed: Math.max(0, Math.min(100, zoneAdjustedDeliverySpeed)),
        };
      }
    }

    // Step 7: Compute penalties and bonuses

    // New seller penalty: no order history → −10
    const newSellerPenalty = data.orderCount === 0 ? -10 : 0;

    // Manipulation penalty: ≥3 active anomaly flags → −20
    const manipulationPenalty =
      this.fraudDetector.computeManipulationPenalty(activeFlagCount);

    // COD penalties are already embedded in fulfillmentReliability via computeFulfillmentReliability.
    // We still need to surface them in the penalties object for the CompositeScoreResult.
    const codRefusalRate =
      data.codOrderCount > 0
        ? data.codRefusalCount / data.codOrderCount
        : 0;
    const isCod = context.paymentMethod === 'COD';
    const highCodRiskPenalty =
      isCod && codRefusalRate > 0.15 && codRefusalRate <= 0.30 ? -10 : 0;
    const criticalCodRiskPenalty =
      isCod && codRefusalRate > 0.30 ? -25 : 0;

    // Margin contribution
    const marginResult = computeMarginContribution({
      commissionTier: data.commissionTier,
      logisticsCost: data.logisticsCostEstimate,
      codFailureCost: 0,
      offerPrice: data.offerPrice,
    });
    const negativeMarginPenalty = marginResult.penalty; // 0 or −15
    const highMarginBonus = marginResult.bonus;          // 0 or +5

    // Step 8: Compute weighted sum across all 9 signals
    let weightedSum = 0;
    for (const key of SIGNAL_KEYS) {
      weightedSum += adjustedSignals[key] * strategy.weights[key];
    }

    // Step 9: Apply penalties and bonuses
    const totalAdjustment =
      newSellerPenalty +
      manipulationPenalty +
      negativeMarginPenalty +
      highMarginBonus;

    const rawScore = weightedSum + totalAdjustment;

    // Step 10: Clamp to [0, 100]
    const compositeScore = Math.max(0, Math.min(100, rawScore));

    // Step 11: Return CompositeScoreResult
    return {
      compositeScore,
      signalValues: adjustedSignals,
      signalWeights: strategy.weights,
      strategyName: strategy.name,
      assignmentType: 'MERIT',
      anomalyFlags,
      penalties: {
        newSellerPenalty,
        manipulationPenalty,
        highCodRiskPenalty,
        criticalCodRiskPenalty,
        negativeMarginPenalty,
      },
      bonuses: {
        highMarginBonus,
      },
    };
  }

  /**
   * Select the Buy Box winner for a product given a context and category strategy.
   *
   * Steps:
   *  1. Load eligible seller offers from the repository.
   *  2. Collect all offer prices.
   *  3. Filter out disqualified sellers.
   *  4. Throw when no eligible sellers remain.
   *  5. Compute composite score for each eligible seller.
   *  6. Sort by composite score descending.
   *  7. Return BuyBoxSelectionResult.
   */
  async selectBuyBoxWinner(
    productId: string,
    context: BuyBoxContext,
    strategy: CategoryStrategy,
  ): Promise<BuyBoxSelectionResult> {
    // Step 1: Load eligible seller offers
    const offers = await this.repository.getEligibleSellerOffers(productId);

    // Step 2: Collect all offer prices
    const allOfferPrices = offers.map((o) => o.price);

    // Step 3: Filter out disqualified sellers
    const eligibleOffers = await Promise.all(
      offers.map(async (offer) => {
        // Disqualify: account not active
        if (offer.accountStatus !== 'active') {
          return null;
        }

        // Disqualify: zero stock
        if (offer.stockLevel === 0) {
          return null;
        }

        // Disqualify: below minTrustScoreThreshold (e.g. MEDICINES category)
        if (strategy.minTrustScoreThreshold !== undefined) {
          const data = await this.repository.getSellerSignalData(
            offer.sellerId,
            productId,
            context.buyerZone,
          );
          const trustScore = computeSellerTrustScore({
            verifiedIdentity: data.isVerifiedIdentity,
            accountAgeDays: data.accountAgeDays,
            disputeHistory: data.disputeCount,
            complianceScore: data.complianceScore,
          });
          if (trustScore < strategy.minTrustScoreThreshold) {
            return null;
          }
        }

        return offer;
      }),
    );

    const qualifiedOffers = eligibleOffers.filter(
      (o): o is NonNullable<typeof o> => o !== null,
    );

    // Step 4: Throw when no eligible sellers remain
    if (qualifiedOffers.length === 0) {
      throw new Error('NO_ELIGIBLE_SELLERS');
    }

    // Step 5: Compute composite score for each eligible seller
    const scoredSellers = await Promise.all(
      qualifiedOffers.map(async (offer) => {
        const result = await this.computeCompositeScore(
          offer.sellerId,
          productId,
          context,
          strategy,
          allOfferPrices,
        );
        return { sellerId: offer.sellerId, scoreResult: result };
      }),
    );

    // Step 6: Sort by composite score descending
    scoredSellers.sort(
      (a, b) => b.scoreResult.compositeScore - a.scoreResult.compositeScore,
    );

    const [winner, ...rest] = scoredSellers;

    // Step 7: Return BuyBoxSelectionResult
    return {
      winnerId: winner.sellerId,
      winnerScore: winner.scoreResult.compositeScore,
      assignmentType: 'MERIT',
      alternatives: rest.map((s, index) => ({
        sellerId: s.sellerId,
        compositeScore: s.scoreResult.compositeScore,
        rank: index + 2,
      })),
    };
  }
}
