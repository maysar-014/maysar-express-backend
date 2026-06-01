import { Order } from '../../entities/order.entity';
import {
  ICODRiskAssessmentRepository,
  RiskAssessmentRecord,
} from '../../repositories/cod-risk-assessment.repository';
import { OrderRepository } from '../../repositories/order.repository';

export type RiskFactor =
  | 'NEW_DEVICE'
  | 'NEW_ADDRESS'
  | 'HIGH_RELATIVE_VALUE'
  | 'HIGH_VELOCITY'
  | 'HIGH_RISK_CATEGORY';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskAssessmentResult {
  level: RiskLevel;
  activeFactors: RiskFactor[];
  requiresCommitmentFee: boolean;
  requiresManualReview: boolean;
}

/**
 * PerOrderRiskAssessor
 *
 * Evaluates contextual risk for a specific COD order beyond the buyer's static tier.
 * Even PLATINUM_BUYER orders are assessed — unusual patterns trigger friction rather
 * than outright rejection.
 *
 * Risk levels:
 *   LOW  (0 factors)  → no additional friction
 *   MEDIUM (1–2 factors) → commitment fee required
 *   HIGH (3+ factors)   → commitment fee + manual review flag
 */
export class PerOrderRiskAssessor {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly riskAssessmentRepo: ICODRiskAssessmentRepository,
  ) {}

  async assess(order: Order): Promise<RiskAssessmentResult> {
    const activeFactors: RiskFactor[] = [];

    // Evaluate all risk factors in parallel where possible
    const [isNewDevice, isNewAddress, isHighRelativeValue, isHighVelocity, isHighRiskCategory] =
      await Promise.all([
        this.checkNewDevice(order),
        this.checkNewAddress(order),
        this.checkHighRelativeValue(order),
        this.checkHighVelocity(order),
        this.checkHighRiskCategory(order),
      ]);

    if (isNewDevice)          activeFactors.push('NEW_DEVICE');
    if (isNewAddress)         activeFactors.push('NEW_ADDRESS');
    if (isHighRelativeValue)  activeFactors.push('HIGH_RELATIVE_VALUE');
    if (isHighVelocity)       activeFactors.push('HIGH_VELOCITY');
    if (isHighRiskCategory)   activeFactors.push('HIGH_RISK_CATEGORY');

    const level = this.computeLevel(activeFactors.length);

    const result: RiskAssessmentResult = {
      level,
      activeFactors,
      requiresCommitmentFee: level === 'MEDIUM' || level === 'HIGH',
      requiresManualReview:  level === 'HIGH',
    };

    // Persist immutable audit record
    await this.persistAssessment(order, result);

    return result;
  }

  // ─── Risk factor checks ────────────────────────────────────────────────────

  private async checkNewDevice(order: Order): Promise<boolean> {
    const deviceFingerprint = (order as any).deviceFingerprint as string | undefined;
    if (!deviceFingerprint) return false;

    try {
      const previousOrders = await this.orderRepo.findByBuyerId(order.buyerId);
      const knownDevices = new Set(
        previousOrders
          .filter((o: any) => o.id !== order.id && o.deviceFingerprint)
          .map((o: any) => o.deviceFingerprint as string),
      );
      return !knownDevices.has(deviceFingerprint);
    } catch {
      return false; // fail-open
    }
  }

  private async checkNewAddress(order: Order): Promise<boolean> {
    const deliveryAddress = order.deliveryAddress;
    if (!deliveryAddress) return false;

    try {
      const previousOrders = await this.orderRepo.findByBuyerId(order.buyerId);
      const addressKey = this.addressKey(deliveryAddress);
      const knownAddresses = new Set(
        previousOrders
          .filter((o: any) => o.id !== order.id && o.deliveryAddress)
          .map((o: any) => this.addressKey(o.deliveryAddress)),
      );
      return !knownAddresses.has(addressKey);
    } catch {
      return false;
    }
  }

  private async checkHighRelativeValue(order: Order): Promise<boolean> {
    const orderAmount = this.extractAmount(order.totalAmount);
    if (orderAmount <= 0) return false;

    try {
      const previousOrders = await this.orderRepo.findByBuyerId(order.buyerId);
      const completedCODOrders = previousOrders.filter(
        (o: any) =>
          o.id !== order.id &&
          (o.paymentMethod === 'COD' || o.paymentMethod === 'cod') &&
          o.status === 'delivered',
      );

      if (completedCODOrders.length === 0) return false;

      const totalValue = completedCODOrders.reduce(
        (sum: number, o: any) => sum + this.extractAmount(o.totalAmount),
        0,
      );
      const avgValue = totalValue / completedCODOrders.length;

      return orderAmount > avgValue * 3;
    } catch {
      return false;
    }
  }

  private async checkHighVelocity(order: Order): Promise<boolean> {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24 hours
      const previousOrders = await this.orderRepo.findByBuyerId(order.buyerId);
      const recentCODOrders = previousOrders.filter(
        (o: any) =>
          o.id !== order.id &&
          (o.paymentMethod === 'COD' || o.paymentMethod === 'cod') &&
          new Date(o.createdAt) >= cutoff,
      );
      return recentCODOrders.length >= 3;
    } catch {
      return false;
    }
  }

  private checkHighRiskCategory(order: Order): boolean {
    // High-risk categories are flagged via the codAccepted field on the product.
    // If any item in the order is from a high-risk category, flag it.
    return order.items.some((item: any) => item.isHighRiskCategory === true);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private computeLevel(factorCount: number): RiskLevel {
    if (factorCount === 0)  return 'LOW';
    if (factorCount <= 2)   return 'MEDIUM';
    return 'HIGH';
  }

  private addressKey(address: any): string {
    return [
      address?.wardCode ?? '',
      address?.street ?? '',
      address?.city ?? '',
    ]
      .join('|')
      .toLowerCase();
  }

  private extractAmount(totalAmount: any): number {
    if (typeof totalAmount?.amount === 'number') return totalAmount.amount;
    return Number(totalAmount ?? 0);
  }

  private async persistAssessment(
    order: Order,
    result: RiskAssessmentResult,
  ): Promise<void> {
    try {
      const record: RiskAssessmentRecord = {
        id: `risk-${order.id}-${Date.now()}`,
        buyerId: order.buyerId,
        orderId: order.id,
        riskLevel: result.level,
        activeFactors: result.activeFactors,
        requiresCommitmentFee: result.requiresCommitmentFee,
        requiresManualReview: result.requiresManualReview,
        createdAt: new Date(),
      };
      await this.riskAssessmentRepo.save(record);
    } catch {
      // Fail-open: assessment failure should not block the order
    }
  }
}
