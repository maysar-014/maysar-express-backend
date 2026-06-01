import { Order } from '../entities/order.entity';
import { EligibilityResult, IAuthServiceClient, ILogisticsServiceClient } from './cod-eligibility.engine';
import { ICODTrustScoreRepository } from '../repositories/cod-trust-score.repository';
import { ICODRestrictionRepository } from '../repositories/cod-restriction.repository';
import { OrderRepository } from '../repositories/order.repository';
import {
  deriveTier,
  getExposureLimit,
  getConcurrentOrderLimit,
  getRadiusKm,
  haversineDistanceKm,
} from './cod-trust/trust-score.functions';
import { TrustTier } from './cod-trust/trust-signal.types';
import { WardCentroidResolver } from './cod-trust/ward-centroid.resolver';
import { PerOrderRiskAssessor } from './cod-trust/per-order-risk.assessor';
import { SellerCODRiskService } from './cod-trust/seller-cod-risk.service';

export interface ListingEligibilityResult {
  codAvailable: boolean;
  codUnavailableReason?: 'LIMIT_EXCEEDED' | 'AREA_RESTRICTION' | 'HIGH_RISK_ITEM' | 'ACCOUNT_RESTRICTION';
  encouragementMessage?: string;
}

/**
 * EnhancedCODEligibilityEngine
 *
 * Drop-in replacement for ProgressiveCODEligibilityEngine.
 * Implements the same three-method interface so PlaceOrderUseCase requires no changes.
 *
 * Enhancements over the progressive engine:
 * - 5-tier dual-axis progression (score + lifetimeCODValue)
 * - Active exposure tracking (sum of outstanding COD values, not order count)
 * - Ward-centroid Haversine distance for geographic checks
 * - Per-order dynamic risk assessment (commitment fee / manual review flags)
 * - Seller COD suspension check
 * - getCODEligibilityForListing advisory API
 */
export class EnhancedCODEligibilityEngine {
  constructor(
    private readonly trustScoreRepo: ICODTrustScoreRepository,
    private readonly restrictionRepo: ICODRestrictionRepository,
    private readonly orderRepo: OrderRepository,
    private readonly authService: IAuthServiceClient,
    private readonly logisticsService: ILogisticsServiceClient,
    private readonly perOrderRiskAssessor: PerOrderRiskAssessor,
    private readonly sellerCODRiskService: SellerCODRiskService,
    private readonly wardCentroidResolver: WardCentroidResolver,
  ) {}

  // ─── checkBuyerEligibility ────────────────────────────────────────────────

  async checkBuyerEligibility(buyerId: string): Promise<EligibilityResult> {
    const isVerified = await this.authService.isUserVerified(buyerId);
    if (!isVerified) {
      return { eligible: false, reason: 'PHONE_VERIFICATION_REQUIRED' };
    }

    const restrictions = await this.restrictionRepo.findActiveByBuyerId(buyerId);
    if (restrictions.length > 0) {
      const restriction = restrictions[0];
      if (restriction.permanent) {
        return { eligible: false, reason: 'COD_PERMANENTLY_DISABLED' };
      }
      return {
        eligible: false,
        reason: `COD access is temporarily restricted until ${restriction.endsAt.toISOString()}: ${restriction.reason}`,
      };
    }

    return { eligible: true };
  }

  // ─── checkSellerEligibility ───────────────────────────────────────────────

  async checkSellerEligibility(sellerId: string): Promise<EligibilityResult> {
    const isVerified = await this.authService.isUserVerified(sellerId);
    if (!isVerified) {
      return { eligible: false, reason: 'SELLER_NOT_VERIFIED' };
    }

    const isSuspended = await this.sellerCODRiskService.isSellerCODSuspended(sellerId);
    if (isSuspended) {
      return { eligible: false, reason: 'SELLER_HIGH_DISPUTE_RATE' };
    }

    return { eligible: true };
  }

  // ─── checkOrderEligibility ────────────────────────────────────────────────

  /**
   * 6-step fail-fast eligibility pipeline.
   * Score repository failures throw (not fail-open) — we cannot safely evaluate
   * exposure limits without the current score record.
   */
  async checkOrderEligibility(order: Order, sellerAddress: any): Promise<EligibilityResult> {
    const buyerId = order.buyerId;

    // Step 1: Load score record (throws on failure — intentional)
    const scoreRecord = await this.trustScoreRepo.findByBuyerId(buyerId);
    const score = scoreRecord?.score ?? 0;
    const lifetimeCODValue = Number(scoreRecord?.lifetimeCODValue ?? 0);
    const activeExposure = Number(scoreRecord?.activeExposure ?? 0);
    const tier = deriveTier(score, lifetimeCODValue);
    const exposureLimit = getExposureLimit(tier);
    const orderAmount = this.extractAmount(order.totalAmount);

    // Step 2: Active exposure check
    if (activeExposure + orderAmount > exposureLimit) {
      return {
        eligible: false,
        reason: `LIMIT_EXCEEDED`,
      };
    }

    // Step 3: Concurrent order count check
    const activeCODCount = await this.countActiveCODOrders(buyerId);
    const concurrentLimit = getConcurrentOrderLimit(tier);
    if (activeCODCount >= concurrentLimit) {
      return { eligible: false, reason: 'CONCURRENT_LIMIT_EXCEEDED' };
    }

    // Step 4: Geographic check
    const geoResult = await this.checkGeographic(order, sellerAddress, tier);
    if (!geoResult.eligible) return geoResult;

    // Step 5: Logistics area support
    const isSupportedArea = await this.logisticsService.isCODSupportedInArea(order.deliveryAddress);
    if (!isSupportedArea) {
      return { eligible: false, reason: 'UNSUPPORTED_AREA' };
    }

    // Step 6: High-risk item check, then per-order risk assessment
    const hasHighRiskItem = order.items.some((item: any) => this.isHighRiskItem(item.productId));
    if (hasHighRiskItem) {
      return { eligible: false, reason: 'HIGH_RISK_ITEM' };
    }

    const risk = await this.perOrderRiskAssessor.assess(order);
    const deliveryFee = this.extractDeliveryFee(order);

    return {
      eligible: true,
      requiresCommitmentFee: risk.requiresCommitmentFee || undefined,
      requiresManualReview: risk.requiresManualReview || undefined,
      commitmentFeeAmount: risk.requiresCommitmentFee ? deliveryFee : undefined,
    };
  }

  // ─── getCODEligibilityForListing ──────────────────────────────────────────

  /**
   * Advisory listing eligibility check. Does NOT expose score, tier, or lifetime value.
   * Must complete within 200ms. Checkout re-validates authoritatively.
   */
  async getCODEligibilityForListing(
    buyerId: string | null,
    productId: string,
    price: number,
  ): Promise<ListingEligibilityResult> {
    if (!buyerId) {
      return { codAvailable: false, codUnavailableReason: 'ACCOUNT_RESTRICTION' };
    }

    // Check account-level restrictions
    const buyerCheck = await this.checkBuyerEligibility(buyerId);
    if (!buyerCheck.eligible) {
      return { codAvailable: false, codUnavailableReason: 'ACCOUNT_RESTRICTION' };
    }

    // Check exposure limit
    const scoreRecord = await this.trustScoreRepo.findByBuyerId(buyerId);
    const score = scoreRecord?.score ?? 0;
    const lifetimeCODValue = Number(scoreRecord?.lifetimeCODValue ?? 0);
    const activeExposure = Number(scoreRecord?.activeExposure ?? 0);
    const tier = deriveTier(score, lifetimeCODValue);
    const exposureLimit = getExposureLimit(tier);

    if (activeExposure + price > exposureLimit) {
      return {
        codAvailable: false,
        codUnavailableReason: 'LIMIT_EXCEEDED',
        encouragementMessage: 'Complete more orders to unlock COD for higher-value items.',
      };
    }

    // Check if product is high-risk
    if (this.isHighRiskItem(productId)) {
      return { codAvailable: false, codUnavailableReason: 'HIGH_RISK_ITEM' };
    }

    return { codAvailable: true };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async checkGeographic(
    order: Order,
    sellerAddress: any,
    tier: TrustTier,
  ): Promise<EligibilityResult> {
    // GOLD_BUYER and PLATINUM_BUYER: nationwide — no restriction
    if (tier === 'GOLD_BUYER' || tier === 'PLATINUM_BUYER') {
      return { eligible: true };
    }

    // TRUSTED_BUYER: same-region check
    if (tier === 'TRUSTED_BUYER') {
      const buyerRegion = (order.deliveryAddress as any)?.regionCode;
      const sellerRegion = sellerAddress?.regionCode;
      if (buyerRegion && sellerRegion && buyerRegion !== sellerRegion) {
        return { eligible: false, reason: 'AREA_RESTRICTION' };
      }
      return { eligible: true };
    }

    // NEW_BUYER (24 km) and TRUSTED_BEGINNER (50 km): Haversine check
    const radiusKm = getRadiusKm(tier)!;
    const buyerWardCode = (order.deliveryAddress as any)?.wardCode as number | undefined;
    const sellerWardCode = sellerAddress?.wardCode as number | undefined;

    const buyerCentroid = buyerWardCode
      ? this.wardCentroidResolver.resolveWardCentroid(buyerWardCode)
      : null;
    const sellerCentroid = sellerWardCode
      ? this.wardCentroidResolver.resolveWardCentroid(sellerWardCode)
      : null;

    // Fallback: if either centroid is missing, use region-level matching
    if (!buyerCentroid || !sellerCentroid) {
      const buyerRegion = (order.deliveryAddress as any)?.regionCode;
      const sellerRegion = sellerAddress?.regionCode;
      if (buyerRegion && sellerRegion && buyerRegion !== sellerRegion) {
        return { eligible: false, reason: 'AREA_RESTRICTION' };
      }
      return { eligible: true };
    }

    const distanceKm = haversineDistanceKm(
      sellerCentroid.lat,
      sellerCentroid.lng,
      buyerCentroid.lat,
      buyerCentroid.lng,
    );

    if (distanceKm > radiusKm) {
      return { eligible: false, reason: 'AREA_RESTRICTION' };
    }

    return { eligible: true };
  }

  private async countActiveCODOrders(buyerId: string): Promise<number> {
    try {
      const orders = await this.orderRepo.findByBuyerId(buyerId);
      const activeStatuses = [
        'pending', 'confirmed', 'processing', 'assigned', 'shipped', 'in_transit',
        'PENDING', 'CONFIRMED', 'PROCESSING', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT',
      ];
      return orders.filter(
        (o: any) =>
          (o.paymentMethod === 'COD' || o.paymentMethod === 'cod') &&
          activeStatuses.includes(o.status),
      ).length;
    } catch {
      return 0; // fail-open for count
    }
  }

  private isHighRiskItem(_productId: string): boolean {
    // High-risk items are flagged via the codAccepted field on the product.
    // In production, query the catalogue service's codAccepted flag.
    return false;
  }

  private extractAmount(totalAmount: any): number {
    if (typeof totalAmount?.amount === 'number') return totalAmount.amount;
    return Number(totalAmount ?? 0);
  }

  private extractDeliveryFee(order: Order): number {
    return (order as any).deliveryFee ?? 0;
  }
}
