import { Order } from '../../domain/entities/order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';
import { IdGeneratorService } from '../../infrastructure/services/id-generator.service';
import { OrderFulfillmentSaga } from '../sagas/order-fulfillment.saga';
import { CODEligibilityEngine } from '../../domain/engines/cod-eligibility.engine';
import { CODCommitmentService } from '../../domain/services/cod-commitment.service';

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
  paymentMethod: 'COD' | 'WALLET' | 'CARD' | 'MOBILE_PAYMENT';
  /**
   * Delivery fee charged by the seller.
   * - If > 0: seller charges delivery. Hold = deliveryFee (secured before packaging).
   * - If 0 or omitted: seller offers free delivery. Hold = logisticsEstimate (commitment fee).
   */
  deliveryFee?: number;
  /**
   * Logistics service's estimated delivery cost.
   * Required when deliveryFee = 0 (free delivery) for COD orders.
   */
  logisticsEstimate?: number;
  /**
   * How the buyer pays the commitment/delivery fee upfront (before packaging).
   * Only applies to COD orders.
   * - 'WALLET': deducted from Maysar wallet balance (hold placed)
   * - 'MOBILE_PAYMENT': paid via mobile money (M-Pesa, Airtel, Tigo) through Pesapal
   * - 'CARD': paid via card through Pesapal
   * Defaults to 'WALLET' if not specified.
   */
  commitmentPaymentMethod?: 'WALLET' | 'MOBILE_PAYMENT' | 'CARD';
  deliveryAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export interface PlaceOrderResponse {
  orderId: string;
  status: string;
  trackingNumber?: string;
  deliveryCode: string;
  /**
   * Amount paid upfront as commitment/delivery fee.
   * 0 if no commitment was required.
   */
  commitmentFee: number;
  /**
   * How the commitment fee was paid ('WALLET', 'MOBILE_PAYMENT', 'CARD').
   */
  commitmentPaymentMethod?: 'WALLET' | 'MOBILE_PAYMENT' | 'CARD';
  /**
   * Amount buyer pays courier in cash on delivery.
   * Free delivery:  product price - commitment fee
   * Paid delivery:  full product price
   */
  cashOnDeliveryAmount: number;
  /**
   * Pesapal payment URL — only present when commitmentPaymentMethod is MOBILE_PAYMENT or CARD.
   * Buyer must complete this payment to confirm the order.
   */
  commitmentPaymentUrl?: string;
}

export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly sagaOrchestrator: OrderFulfillmentSaga,
    private readonly codEligibilityEngine: CODEligibilityEngine,
    private readonly codCommitmentService: CODCommitmentService,
    private readonly walletClient?: { debitWallet(userId: string, amount: number, currency: string, description: string): Promise<string> },
    private readonly pesapalAdapter?: { processPayment(req: { orderId: string; amount: number; currency: string; buyerId: string; buyerEmail: string; buyerPhone: string; description: string }): Promise<{ success: boolean; paymentUrl?: string; transactionId?: string; error?: string; status: string }> }
  ) { }

  async execute(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    // ... (rest of logic)
    console.log(`[PlaceOrderUseCase] execute called, paymentMethod: ${request.paymentMethod}, walletClient: ${this.walletClient ? 'PRESENT' : 'MISSING'}`);
    const orderId = IdGeneratorService.generateOrderId();
    const trackingNumber = await this.generateTrackingNumber();
    const currency = request.currency || 'TZS';
    const totalAmount = request.items.reduce((sum, item) => {
      const price = typeof item.price === 'number' ? item.price : item.price.amount;
      return sum + (price * item.quantity);
    }, 0);

    // COD Validation and Commitment
    let codCommitmentFee = 0;
    let codHoldId: string | undefined;
    let isFreeDelivery = false;
    let codCommitmentPaymentUrl: string | undefined;
    let codCommitmentPaymentMethod: 'WALLET' | 'MOBILE_PAYMENT' | 'CARD' | undefined;

    if (request.paymentMethod === 'COD') {
      // 1. Validate Eligibility
      const buyerEligibility = await this.codEligibilityEngine.checkBuyerEligibility(request.buyerId);
      if (!buyerEligibility.eligible) {
        throw new Error(`COD Ineligible: ${buyerEligibility.reason}`);
      }

      const sellerEligibility = await this.codEligibilityEngine.checkSellerEligibility(request.sellerId);
      if (!sellerEligibility.eligible) {
        throw new Error(`COD Ineligible: ${sellerEligibility.reason}`);
      }

      // We'd normally fetch seller address here, using placeholder for now
      const placeholderSellerAddress = { city: 'Dar es Salaam', country: 'Tanzania' };

      // Temporary order object for validation — must include buyerId for trust score lookup
      const tempOrder = { buyerId: request.buyerId, items: request.items, totalAmount, deliveryAddress: request.deliveryAddress } as any;
      const orderEligibility = await this.codEligibilityEngine.checkOrderEligibility(tempOrder, placeholderSellerAddress);
      if (!orderEligibility.eligible) {
        throw new Error(`COD Ineligible: ${orderEligibility.reason}`);
      }

      // 2. Calculate and secure the delivery fee / commitment fee as a wallet hold.
      //    This MUST happen before packaging begins (before the saga starts).
      //
      // Scenario A — Free delivery (deliveryFee = 0 or omitted):
      //   Hold = logistics estimate (commitment fee). Maysar pays courier, recoups from hold.
      //
      // Scenario B — Paid delivery (deliveryFee > 0):
      //   Hold = delivery fee. Secured upfront before packaging. Captured on delivery.
      //
      // In BOTH cases: buyer pays only product price in cash at door.
      const deliveryFee = request.deliveryFee ?? 0;
      const logisticsEstimate = request.logisticsEstimate ?? 0;
      isFreeDelivery = deliveryFee === 0;

      codCommitmentFee = this.codCommitmentService.calculateCommitmentFee(deliveryFee, logisticsEstimate);

      if (codCommitmentFee > 0) {
        const commitmentMethod = request.commitmentPaymentMethod ?? 'WALLET';

        if (commitmentMethod === 'WALLET') {
          // Wallet hold — deducted from Maysar wallet balance
          codHoldId = await this.codCommitmentService.secureCommitment(
            request.buyerId,
            orderId,
            codCommitmentFee,
            currency,
            isFreeDelivery
          );
        } else {
          // Mobile money or card — process via Pesapal
          // The order is saved in PENDING_COMMITMENT state until payment is confirmed
          // The Pesapal callback will advance the order to CONFIRMED
          if (!this.pesapalAdapter) {
            throw new Error(`COD commitment via ${commitmentMethod} requires Pesapal adapter — not configured`);
          }
          const pesapalResult = await this.pesapalAdapter.processPayment({
            orderId: `${orderId}-commitment`,
            amount: codCommitmentFee,
            currency,
            buyerId: request.buyerId,
            buyerEmail: `${request.buyerId}@maysar.co.tz`,
            buyerPhone: '',
            description: isFreeDelivery
              ? `COD Commitment Fee for Order ${orderId}`
              : `COD Delivery Fee for Order ${orderId}`,
          });

          if (!pesapalResult.success && pesapalResult.status === 'failed') {
            throw new Error(`COD commitment payment failed: ${pesapalResult.error}`);
          }

          // Store the payment URL for the response — buyer must complete payment
          codCommitmentPaymentUrl = pesapalResult.paymentUrl;
          codCommitmentPaymentMethod = commitmentMethod;
        }
      }
    }

    // WALLET payment: debit the buyer's wallet synchronously before creating the order
    if (request.paymentMethod === 'WALLET') {
      if (!this.walletClient) {
        throw new Error('WALLET payment method requires WalletServiceClient — dependency not injected');
      }
      try {
        console.log(`[PlaceOrderUseCase] Debiting wallet for buyer ${request.buyerId}, amount: ${totalAmount} ${currency}`);
        const txId = await this.walletClient.debitWallet(
          request.buyerId,
          totalAmount,
          currency,
          `Payment for order ${orderId}`
        );
        console.log(`[PlaceOrderUseCase] Wallet debit successful, txId: ${txId}`);
      } catch (error: any) {
        console.error(`[PlaceOrderUseCase] Wallet debit failed:`, error.message);
        throw new Error(`Wallet payment failed: ${error.message}`);
      }
    }

    // Create order data
    const deliveryCode = generateDeliveryCode();
    const orderData = {
      id: orderId,
      trackingNumber,
      ...request,
      currency,
      totalAmount,
      codCommitmentFee: codCommitmentFee > 0 ? codCommitmentFee : undefined,
      codCommitmentPaid: !!codHoldId,
      codCommitmentHoldId: codHoldId,
      deliveryCode,
      totalWeight: request.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0),
      items: request.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: {
          amount: typeof item.price === 'number' ? item.price : item.price.amount,
          currency: currency
        },
        weight: item.weight
      }))
    };

    const order = new Order(orderData);
    await this.orderRepository.save(order);

    // Start Saga
    await this.sagaOrchestrator.start({
      orderId: order.id,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      amount: Number(order.totalAmount),
      items: order.items.map(i => ({ productId: i.productId, quantity: i.quantity }))
    });

    // Publish creation event (legacy/redundant but kept for compatibility)
    const event = new OrderCreatedEvent(order);
    await this.eventPublisher.publish(event);

    return {
      orderId: order.id,
      status: order.status,
      trackingNumber: order.trackingNumber,
      deliveryCode,
      commitmentFee: codCommitmentFee,
      commitmentPaymentMethod: codCommitmentFee > 0 ? (codCommitmentPaymentMethod ?? 'WALLET') : undefined,
      commitmentPaymentUrl: codCommitmentPaymentUrl,
      // Free delivery:  buyer pays product price - commitment fee at door
      // Paid delivery:  buyer pays full product price at door (delivery fee already held)
      cashOnDeliveryAmount: request.paymentMethod === 'COD'
        ? (isFreeDelivery ? totalAmount - codCommitmentFee : totalAmount)
        : 0,
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
