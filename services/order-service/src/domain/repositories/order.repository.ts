import { Order, OrderStatus } from '../entities/order.entity';

export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByTrackingNumber?(trackingNumber: string): Promise<Order | null>;
  findByBuyerId(buyerId: string): Promise<Order[]>;
  findByStatus(status: OrderStatus): Promise<Order[]>;
  count(): Promise<number>;
  update(order: Order): Promise<void>;
  delete(id: string): Promise<void>;
}
