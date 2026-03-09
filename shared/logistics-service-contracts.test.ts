import type { LogisticsService } from '../shared-contracts/logistics-service-contracts';

describe('logistics-service contracts', () => {
  it('supports scheduling commands and delivery lifecycle events', () => {
    const schedule: LogisticsService.Commands.ScheduleDelivery = {
      orderId: 'order-1',
      shippingAddress: {
        street: 'Mikocheni A',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        postalCode: '14112',
        country: 'TZ'
      },
      items: [{ productId: 'product-1', quantity: 2 }]
    };
    const completed: LogisticsService.Events.DeliveryCompleted = {
      deliveryId: 'del-1',
      orderId: 'order-1',
      completedAt: new Date('2026-03-09T00:00:00.000Z')
    };

    expect(schedule.items[0].quantity).toBe(2);
    expect(completed.deliveryId).toBe('del-1');
  });
});
