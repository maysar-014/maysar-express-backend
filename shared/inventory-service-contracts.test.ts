import type { InventoryService } from '../shared-contracts/inventory-service-contracts';

describe('inventory-service contracts', () => {
  it('supports stock reservation commands and stock events', () => {
    const reserve: InventoryService.Commands.ReserveStock = {
      orderId: 'order-1',
      items: [{ productId: 'prod-1', quantity: 2 }]
    };
    const reserved: InventoryService.Events.StockReserved = {
      reservationId: 'res-1',
      orderId: 'order-1',
      items: [{ productId: 'prod-1', quantity: 2 }],
      expiresAt: new Date('2026-03-09T01:00:00.000Z')
    };
    const adjusted: InventoryService.Events.StockAdjusted = {
      productId: 'prod-1',
      quantityDelta: -2,
      newLevel: 18,
      reason: 'reservation',
      adjustedAt: new Date('2026-03-09T00:05:00.000Z')
    };

    expect(reserve.items[0].quantity).toBe(2);
    expect(reserved.reservationId).toBe('res-1');
    expect(adjusted.newLevel).toBe(18);
  });
});
