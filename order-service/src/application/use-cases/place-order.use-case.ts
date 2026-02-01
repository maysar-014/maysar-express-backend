import { Order } from '../../domain/entities/order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';
import { IdGeneratorService } from '../../infrastructure/services/id-generator.service';
import { OrderFulfillmentSaga } from '../sagas/order-fulfillment.saga';

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
}

export class PlaceOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly sagaOrchestrator: OrderFulfillmentSaga
  ) { }

  async execute(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    // ... (rest of logic)
    const orderId = IdGeneratorService.generateOrderId();

    // Create order data
    const orderData = {
      id: orderId,
      ...request,
      currency: request.currency || 'TZS',
      totalAmount: request.items.reduce((sum, item) => {
        const price = typeof item.price === 'number' ? item.price : item.price.amount;
        return sum + (price * item.quantity);
      }, 0),
      totalWeight: request.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0),
      items: request.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: {
          amount: typeof item.price === 'number' ? item.price : item.price.amount,
          currency: request.currency || 'TZS'
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
      status: order.status
    };
  }
}

// Simple event publisher interface (would be implemented in infrastructure)
export interface EventPublisher {
  publish(event: any): Promise<void>;
}
