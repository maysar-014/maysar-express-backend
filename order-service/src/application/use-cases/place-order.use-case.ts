import { Order } from '../../domain/entities/order.entity';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { OrderCreatedEvent } from '../../domain/events/order-created.event';
import { IdGeneratorService } from '../../infrastructure/services/id-generator.service';

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
    // Extract currency from request or default
    const currency = request.currency || 'TZS';

    // Calculate totals
    const totalAmount = request.items.reduce((sum, item) => {
      const price = typeof item.price === 'number' ? item.price : item.price.amount;
      return sum + (price * item.quantity);
    }, 0);
    const totalWeight = request.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

    // Normalize items format
    const normalizedItems = request.items.map(item => {
      const price = typeof item.price === 'number' ? item.price : item.price.amount;
      return {
        productId: item.productId,
        quantity: item.quantity,
        price: { amount: price, currency: currency },
        weight: item.weight
      };
    });

    // Generate professional Maysar Order ID
    const orderId = IdGeneratorService.generateOrderId();

    // Create order
    const orderData = {
      id: orderId,
      ...request,
      currency,
      totalAmount,
      totalWeight,
      items: normalizedItems
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
