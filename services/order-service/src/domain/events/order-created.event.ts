import { Order } from '../entities/order.entity';

export class OrderCreatedEvent {
  constructor(
    public readonly order: Order,
    public readonly timestamp: Date = new Date()
  ) {}
}
