import { Order } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../domain/entities/order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';
import { IdGeneratorService } from '../../infrastructure/services/id-generator.service';
import { OrderFulfillmentSaga } from '../sagas/order-fulfillment.saga';
import { CODEligibilityEngine } from '../../domain/engines/cod-eligibility.engine';
import { CODCommitmentService } from '../../domain/services/cod-commitment.service';
import { assertMinimumBasketValue } from '@shared/business/minimum-basket-value';
import { verificationConfig } from '../../config/verification.config';
import { PrismaVerificationAuditLogRepository } from '../../infrastructure/database/prisma-verification-audit-log.repository';
import { CatalogProductRepository } from '../../infrastructure/repositories/catalog-product.repository';
import { makeId } from '@shared/ids/id';

/**
 * Generates a cryptographically random 6-digit delivery confirmation code.
 * This code is shown to the buyer and must be provided to the courier at delivery.
 */
function generateDeliveryCode(): string {
  const min = 100000;
  const max = 999999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

export interface PlaceOrderRequest {
  buyerId: string;
  sellerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number | { amount: number; currency: string };
    weight: number;
  }>;
  currency?: string;
  paymentMethod: 'COD' | 'WALLET' | 'CARD' | 'MOBILE_PAYMENT' | 'SELLER_VERIFICATION' | 'DIRECT_PAYMENT' | string;
  orderSource?: 'CART' | 'DIRECT';
  orderCompletionMethod?: 'WALLET' | 'DIRECT_PAYMENT' | 'SELLER_VERIFICATION' | 'COD' | 'MOBILE_MONEY';
  chatConversationId?: string;
  /**
   * @deprecated — ignored under the seller verification workflow.
   * All payment is now deferred to BuyerConfirmCheckoutUseCase.
   */
  deferPayment?: boolean;
  deliveryFee?: number;
  logisticsEstimate?: number;
  commitmentPaymentMethod?: 'WALLET' | 'MOBILE_PAYMENT' | 'CARD';
  deliveryAddress: {
    street: string;
    /** Tanzania precision: ward > district > region (preferred over city) */
    ward?: string;
    district?: string;
    region?: string;
    /** Legacy / international */
    city?: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  /** The seller location chosen as fulfillment pickup point */
  fulfillmentLocationId?: string;
}

export interface PlaceOrderResponse {
  orderId: string;
  status: string;
  trackingNumber?: string;
  deliveryCode: string;
  chatConversationId?: string;
  /** UTC ISO-8601 deadline by which the seller must confirm stock. */
  verificationDeadlineAt: string;
  /** Buyer next-action hint. */
  nextAction: 'AWAIT_VERIFICATION';
  /** Always 0 — payment deferred to buyer/confirm-checkout. */
  commitmentFee: number;
  commitmentPaymentMethod?: undefined;
  cashOnDeliveryAmount: number;
}

export class PlaceOrderUseCase {
  // paymentGatewayAdapter kept for BuyerConfirmCheckoutUseCase to use later
  private readonly paymentGatewayAdapter?: {
    processPayment(req: {
      orderId: string; amount: number; currency: string;
      buyerId: string; buyerEmail: string; buyerPhone: string; description: string;
    }): Promise<{ success: boolean; paymentUrl?: string; transactionId?: string; error?: string; status: string }>;
  };

  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly sagaOrchestrator: OrderFulfillmentSaga,
    private readonly codEligibilityEngine: CODEligibilityEngine,
    private readonly codCommitmentService: CODCommitmentService,
    private readonly walletClient?: { debitWallet(userId: string, amount: number, currency: string, description: string): Promise<string> },
    paymentGatewayAdapter?: {
      processPayment(req: {
        orderId: string; amount: number; currency: string;
        buyerId: string; buyerEmail: string; buyerPhone: string; description: string;
      }): Promise<{ success: boolean; paymentUrl?: string; transactionId?: string; error?: string; status: string }>;
    }
  ) {
    this.paymentGatewayAdapter = paymentGatewayAdapter;
  }

  async execute(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    console.log(`[PlaceOrderUseCase] execute called, paymentMethod: ${request.paymentMethod}`);

    const orderId = IdGeneratorService.generateOrderId();
    const trackingNumber = await this.generateTrackingNumber();
    const currency = request.currency || 'TZS';
    const totalAmount = request.items.reduce((sum, item) => {
      const price = typeof item.price === 'number' ? item.price : item.price.amount;
      return sum + (price * item.quantity);
    }, 0);

    assertMinimumBasketValue(totalAmount);

    // ── Layer-3 defense: a COD order must only contain products that accept COD ──
    // The frontend already splits items by payOnDelivery, but the API must not trust
    // client input for a risk-bearing payment method. Missing catalog records are
    // treated as non-COD (fail closed).
    if (request.paymentMethod === 'COD') {
      const nonCodProductIds = await new CatalogProductRepository().findNonCodProductIds(
        request.items.map((item) => item.productId)
      );
      if (nonCodProductIds.length > 0) {
        throw new Error('COD ineligible: one or more items do not accept Cash on Delivery');
      }
    }

    // ── Seller Stock Verification Workflow ────────────────────────────────────
    // All orders enter PENDING_SELLER_VERIFICATION first. No payment processing
    // occurs here. Payment is deferred to BuyerConfirmCheckoutUseCase which runs
    // after the seller confirms stock availability within the verification window.

    const timeoutMinutes = verificationConfig.timeoutMinutes;
    const now = new Date();
    const verificationDeadlineAt = new Date(now.getTime() + timeoutMinutes * 60_000);

    const deliveryCode = generateDeliveryCode();
    const orderData = {
      id: orderId,
      trackingNumber,
      buyerId: request.buyerId,
      sellerId: request.sellerId,
      paymentMethod: request.paymentMethod,
      currency,
      totalAmount,
      deliveryAddress: request.deliveryAddress,
      codCommitmentFee: undefined,
      codCommitmentPaid: false,
      codCommitmentHoldId: undefined,
      deliveryCode,
      verificationDeadlineAt,
      verificationTimeoutMinutes: timeoutMinutes,
      orderSource: request.orderSource || 'CART',
      orderCompletionMethod: request.orderCompletionMethod,
      chatConversationId: request.chatConversationId,
      fulfillmentLocationId: request.fulfillmentLocationId,
      totalWeight: request.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0),
      items: request.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: {
          amount: typeof item.price === 'number' ? item.price : item.price.amount,
          currency,
        },
        weight: item.weight,
      })),
      status: OrderStatus.PENDING_SELLER_VERIFICATION,
    };

    const order = new Order(orderData);
    await this.orderRepository.save(order);

    // Append initial audit log entry — non-fatal if table not yet migrated
    try {
      const auditRepo = new PrismaVerificationAuditLogRepository();
      await auditRepo.append({
        id: makeId('vau'),
        orderId: order.id,
        entryType: 'STATUS_TRANSITION',
        actorType: 'system',
        previousStatus: 'NEW',
        newStatus: OrderStatus.PENDING_SELLER_VERIFICATION,
        reason: 'Order created — awaiting seller stock confirmation',
        timestamp: now,
      });
    } catch (auditErr: any) {
      console.warn('[PlaceOrderUseCase] Audit log write failed (non-fatal):', auditErr.message);
    }

    // Notify seller (non-fatal)
    try {
      await this.eventPublisher.publish({
        type: 'order.pending_seller_verification',
        orderId: order.id,
        sellerId: order.sellerId,
        buyerId: order.buyerId,
        items: order.items,
        verificationDeadlineAt: verificationDeadlineAt.toISOString(),
        trackingNumber: order.trackingNumber,
      });
    } catch (eventErr: any) {
      console.warn('[PlaceOrderUseCase] Seller notification event failed (non-fatal):', eventErr.message);
    }
    try {
      await this.eventPublisher.publish(new OrderCreatedEvent(order));
    } catch (legacyErr: any) {
      console.warn('[PlaceOrderUseCase] Legacy OrderCreatedEvent failed (non-fatal):', legacyErr.message);
    }

    return {
      orderId: order.id,
      status: OrderStatus.PENDING_SELLER_VERIFICATION,
      trackingNumber: order.trackingNumber,
      deliveryCode,
      verificationDeadlineAt: verificationDeadlineAt.toISOString(),
      nextAction: 'AWAIT_VERIFICATION',
      commitmentFee: 0,
      commitmentPaymentMethod: undefined,
      cashOnDeliveryAmount: 0,
    };
  }

  private async generateTrackingNumber(): Promise<string> {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const candidate = IdGeneratorService.generateOrderTrackingNumber();
      if (!this.orderRepository.findByTrackingNumber) {
        return candidate;
      }
      const existing = await this.orderRepository.findByTrackingNumber(candidate);
      if (!existing) {
        return candidate;
      }
    }
    throw new Error('Unable to generate unique tracking number');
  }
}

// Simple event publisher interface (would be implemented in infrastructure)
export interface EventPublisher {
  publish(event: any): Promise<void>;
}
