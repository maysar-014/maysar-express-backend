import type { Order } from '../entities/order.entity';
import { OrderCreatedEvent } from './order-created.event';

describe('OrderCreatedEvent', () => {
  it('stores order payload and default timestamp', () => {
    const order = { id: 'order-1' } as unknown as Order;
    const event = new OrderCreatedEvent(order);

    expect(event.order).toBe(order);
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it('accepts explicit timestamp override', () => {
    const order = { id: 'order-2' } as unknown as Order;
    const ts = new Date('2026-03-08T00:00:00.000Z');
    const event = new OrderCreatedEvent(order, ts);

    expect(event.timestamp).toEqual(ts);
  });
});
