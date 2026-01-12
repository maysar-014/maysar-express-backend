import { Order } from '../../domain/entities/order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';

export interface PlaceOrderRequest {
  buyerId: string;
  sellerId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
    weight: number;
  }>;
  currency: string;
  paymentMethod: 'COD' | 'WALLET' | 'CARD';
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
    private readonly eventPublisher: EventPublisher // This would be injected
  ) {}

  async execute(request: PlaceOrderRequest): Promise<PlaceOrderResponse> {
    // Calculate totals
    const totalAmount = request.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalWeight = request.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

    // Create order
    const orderData = {
      ...request,
      totalAmount,
      totalWeight,
      items: request.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: { amount: item.price, currency: request.currency },
        weight: item.weight
      }))
    };

    const order = new Order(orderData);

    // Save order
    await this.orderRepository.save(order);

    // Publish event
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
