import { Order } from '../entities/order.entity';

export interface OrderRepository {
  save(order: Order): Promise<void>;
  findById(id: string): Promise<Order | null>;
  findByBuyerId(buyerId: string): Promise<Order[]>;
  update(order: Order): Promise<void>;
  delete(id: string): Promise<void>;
}
