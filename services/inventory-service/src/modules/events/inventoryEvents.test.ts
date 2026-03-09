import { InventoryEvent } from './inventoryEvents';

describe('inventory events', () => {
  const common = {
    eventId: 'evt-1',
    eventVersion: 1,
    producer: 'inventory-service',
    timestamp: '2026-01-01T00:00:00.000Z'
  };

  it('supports stock reservation/release payload contracts', () => {
    const reserved: InventoryEvent = {
      ...common,
      eventType: 'StockReserved',
      payload: {
        orderId: 'ord-1',
        orderItemId: 'oi-1',
        productVariantId: 'pv-1',
        warehouseId: 'wh-1',
        quantityReserved: 2,
        expiresAt: '2026-01-01T01:00:00.000Z'
      }
    };
    const released: InventoryEvent = {
      ...common,
      eventType: 'StockReleased',
      payload: {
        orderId: 'ord-1',
        productVariantId: 'pv-1',
        warehouseId: 'wh-1',
        quantityReleased: 2,
        reason: 'cancelled'
      }
    };

    expect(reserved.eventType).toBe('StockReserved');
    expect((released as any).payload.reason).toBe('cancelled');
  });

  it('supports update/alert/movement payload contracts', () => {
    const updated: InventoryEvent = {
      ...common,
      eventType: 'InventoryUpdated',
      payload: {
        updates: [{ variantId: 'pv-1', warehouseId: 'wh-1', quantity: 4, operation: 'set' }]
      }
    };
    const movement: InventoryEvent = {
      ...common,
      eventType: 'InventoryMovement',
      payload: {
        productVariantId: 'pv-1',
        warehouseId: 'wh-1',
        movementType: 'transfer',
        quantity: 4
      }
    };

    expect((updated as any).payload.updates[0].operation).toBe('set');
    expect((movement as any).payload.movementType).toBe('transfer');
  });
});
