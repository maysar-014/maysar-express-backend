import { Order } from '../../domain/entities/order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';
import { IdGeneratorService } from '../../infrastructure/services/id-generator.service';
import { OrderFulfillmentSaga } from '../sagas/order-fulfillment.saga';
import { CODEligibilityEngine } from '../../domain/engines/cod-eligibility.engine';
import { CODCommitmentService } from '../../domain/services/cod-commitment.service';

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
  deliveryFee?: number;
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
}

export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly sagaOrchestrator: OrderFulfillmentSaga,
    private readonly codEligibilityEngine: CODEligibilityEngine,
    private readonly codCommitmentService: CODCommitmentService
  ) { }

  async execute(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    // ... (rest of logic)
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

      // Temporary order object for validation
      const tempOrder = { items: request.items, totalAmount, deliveryAddress: request.deliveryAddress } as any;
      const orderEligibility = await this.codEligibilityEngine.checkOrderEligibility(tempOrder, placeholderSellerAddress);
      if (!orderEligibility.eligible) {
        throw new Error(`COD Ineligible: ${orderEligibility.reason}`);
      }

      if (request.deliveryFee === undefined) {
        throw new Error('Delivery fee is required for COD orders');
      }

      // 2. Secure the delivery fee as the COD commitment
      codCommitmentFee = this.codCommitmentService.calculateCommitmentFee(request.deliveryFee);
      codHoldId = await this.codCommitmentService.secureCommitment(request.buyerId, orderId, codCommitmentFee, currency);
    }

    // Create order data
    const orderData = {
      id: orderId,
      trackingNumber,
      ...request,
      currency,
      totalAmount,
      codCommitmentFee: codCommitmentFee > 0 ? codCommitmentFee : undefined,
      codCommitmentPaid: !!codHoldId,
      codCommitmentHoldId: codHoldId,
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
      trackingNumber: order.trackingNumber
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
