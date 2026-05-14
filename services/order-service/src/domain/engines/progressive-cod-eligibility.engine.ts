import { Order } from '../entities/order.entity';
import { EligibilityResult, IAuthServiceClient, ILogisticsServiceClient } from './cod-eligibility.engine';
import { ICODTrustScoreRepository } from '../repositories/cod-trust-score.repository';
import { ICODRestrictionRepository } from '../repositories/cod-restriction.repository';
import { OrderRepository } from '../repositories/order.repository';
import { deriveTier, getCODLimit } from './cod-trust/trust-score.functions';
import { logger } from '../../infrastructure/monitoring/logger';

/**
 * ProgressiveCODEligibilityEngine
 *
 * Drop-in replacement for CODEligibilityEngine. Implements the same three-method
 * interface so PlaceOrderUseCase requires no structural changes.
 *
 * Instead of the fixed "3 successful orders" gate, eligibility is determined by
 * a COD Eligibility Score (0–100) that grows with positive trust signals and
 * shrinks with negative ones. The score maps to one of three tiers:
 *
 *   NEW_BUYER (0–20):        TZS 30k cap, same-city only, max 1 active COD order
 *   TRUSTED_BEGINNER (21–40): TZS 150k cap, no geographic restriction
 *   TRUSTED_BUYER (41–100):  Unlimited, no restrictions
 */
export class ProgressiveCODEligibilityEngine {
  constructor(
    private readonly trustScoreRepo: ICODTrustScoreRepository,
    private readonly restrictionRepo: ICODRestrictionRepository,
    private readonly orderRepo: OrderRepository,
    private readonly authService: IAuthServiceClient,
    private readonly logisticsService: ILogisticsServiceClient
  ) {}

  /**
   * Check whether a buyer is eligible to use COD.
   *
   * Checks (in order):
   * 1. Active temporary or permanent restriction → ineligible
   * 2. Score loaded (default 0) → derive tier → eligible
   *
   * New buyers (score 0) are eligible — tier-based limits are enforced at order level.
   */
  async checkBuyerEligibility(buyerId: string): Promise<EligibilityResult> {
    // 1. Check for active restrictions
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

    // 2. Load score (default 0 for new buyers — they are eligible for low-value COD)
    const scoreRecord = await this.trustScoreRepo.findByBuyerId(buyerId);
    const score = scoreRecord?.score ?? 0;
    const tier = deriveTier(score);

    logger.debug('[ProgressiveCODEligibilityEngine] Buyer eligibility check', {
      buyerId,
      score,
      tier,
    });

    return { eligible: true };
  }

  /**
   * Check whether a seller is eligible to offer COD.
   * Seller eligibility remains a simple identity verification check.
   */
  async checkSellerEligibility(sellerId: string): Promise<EligibilityResult> {
    const isVerified = await this.authService.isUserVerified(sellerId);
    if (!isVerified) {
      return { eligible: false, reason: 'SELLER_NOT_VERIFIED' };
    }
    return { eligible: true };
  }

  /**
   * Check whether a specific order is eligible for COD.
   *
   * Checks (fail-fast, in order):
   * 1. Order value vs tier COD limit
   * 2. Geographic constraint (NEW_BUYER: same city as seller only)
   * 3. Concurrency limit (NEW_BUYER: max 1 active COD order)
   * 4. Logistics area support
   * 5. High-risk item check (codAccepted flag)
   */
  async checkOrderEligibility(order: Order, sellerAddress: any): Promise<EligibilityResult> {
    const buyerId = order.buyerId;

    // Load buyer's current tier
    const scoreRecord = await this.trustScoreRepo.findByBuyerId(buyerId);
    const score = scoreRecord?.score ?? 0;
    const tier = deriveTier(score);
    const codLimit = getCODLimit(tier);
    // Support both Money value object and raw number
    const orderAmount = typeof (order.totalAmount as any)?.amount === 'number'
      ? (order.totalAmount as any).amount
      : Number(order.totalAmount);

    logger.debug('[ProgressiveCODEligibilityEngine] Order eligibility check', {
      buyerId,
      score,
      tier,
      codLimit,
      orderAmount,
    });

    // 1. Value check
    if (codLimit !== null && orderAmount > codLimit) {
      return {
        eligible: false,
        reason: `COD order value TZS ${orderAmount.toLocaleString()} exceeds your current limit of TZS ${codLimit.toLocaleString()}. Complete more orders to increase your COD limit.`,
      };
    }

    // 2. Geographic check (NEW_BUYER only)
    if (tier === 'NEW_BUYER') {
      const deliveryCity = (order.deliveryAddress as any)?.city?.toLowerCase()?.trim();
      const sellerCity = sellerAddress?.city?.toLowerCase()?.trim();

      if (deliveryCity && sellerCity && deliveryCity !== sellerCity) {
        return {
          eligible: false,
          reason: `New buyers can only use COD for deliveries within the same city as the seller (${sellerAddress.city}). Complete 1–2 successful orders to unlock cross-city COD.`,
        };
      }
    }

    // 3. Concurrency check (NEW_BUYER only)
    if (tier === 'NEW_BUYER') {
      const activeCODOrders = await this.countActiveCODOrders(buyerId);
      if (activeCODOrders >= 1) {
        return {
          eligible: false,
          reason: 'New buyers can only have 1 active COD order at a time. Complete your current COD order before placing another.',
        };
      }
    }

    // 4. Logistics area support
    const isSupportedArea = await this.logisticsService.isCODSupportedInArea(order.deliveryAddress);
    if (!isSupportedArea) {
      return { eligible: false, reason: 'UNSUPPORTED_AREA' };
    }

    // 5. High-risk item check
    const hasHighRiskItem = order.items.some(item => this.isHighRiskItem(item.productId));
    if (hasHighRiskItem) {
      return { eligible: false, reason: 'HIGH_RISK_ITEM' };
    }

    return { eligible: true };
  }

  /**
   * Count active COD orders for a buyer.
   * Active = placed and not yet delivered, cancelled, or refunded.
   */
  private async countActiveCODOrders(buyerId: string): Promise<number> {
    try {
      const orders = await this.orderRepo.findByBuyerId(buyerId);
      const activeStatuses = ['pending', 'confirmed', 'processing', 'assigned', 'shipped', 'in_transit', 'PENDING', 'CONFIRMED', 'PROCESSING', 'ASSIGNED', 'SHIPPED', 'IN_TRANSIT'];
      return orders.filter(
        (o: any) =>
          (o.paymentMethod === 'COD' || o.paymentMethod === 'cod') &&
          activeStatuses.includes(o.status)
      ).length;
    } catch {
      // If we can't query, default to 0 (fail open for new buyers)
      return 0;
    }
  }

  /**
   * Check if a product is flagged as high-risk for COD.
   * In production this would query the catalogue service's codAccepted flag.
   * For now, returns false (no items are high-risk by default).
   */
  private isHighRiskItem(_productId: string): boolean {
    return false;
  }
}
