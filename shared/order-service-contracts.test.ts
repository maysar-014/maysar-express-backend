import type { OrderService } from '../shared-contracts/order-service-contracts';

describe('order-service contracts', () => {
  it('supports order commands and lifecycle event shapes', () => {
    const create: OrderService.Commands.CreateOrder = {
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      shippingAddressId: 'addr-1'
    };
    const created: OrderService.Events.OrderCreated = {
      orderId: 'order-1',
      userId: 'user-1',
      items: [{ productId: 'prod-1', quantity: 2, price: { amount: 25000, currency: 'TZS' } }],
      totalAmount: { amount: 50000, currency: 'TZS' },
      createdAt: new Date('2026-03-09T00:00:00.000Z')
    };

    expect(create.shippingAddressId).toBe('addr-1');
    expect(created.totalAmount.amount).toBe(50000);
  });
});
