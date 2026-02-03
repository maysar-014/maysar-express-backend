import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order, OrderStatus } from '../../domain/entities/order.entity';

export class OrderRepositoryImpl implements OrderRepository {
  // This is a simple in-memory implementation for demo
  // In real implementation, this would use a database
  private orders: Map<string, Order> = new Map();

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) || null;
  }

  async findByBuyerId(buyerId: string): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.buyerId === buyerId);
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(order => order.status === status);
  }

  async count(): Promise<number> {
    return this.orders.size;
  }

  async update(order: Order): Promise<void> {
    if (this.orders.has(order.id)) {
      this.orders.set(order.id, order);
    } else {
      throw new Error(`Order with id ${order.id} not found`);
    }
  }

  async delete(id: string): Promise<void> {
    this.orders.delete(id);
  }
}
