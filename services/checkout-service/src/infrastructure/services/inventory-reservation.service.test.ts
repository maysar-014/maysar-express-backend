import { InventoryReservationService } from './inventory-reservation.service';

describe('InventoryReservationService', () => {
  it('creates one reservation per item with reserved status', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const service = new InventoryReservationService({
      inventoryReservation: { create }
    });

    await service.reserve('checkout-1', [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', variantId: 'v-1', quantity: 1 }
    ]);

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenNthCalledWith(1, {
      data: {
        id: 'checkout-1-prod-1',
        checkoutId: 'checkout-1',
        productId: 'prod-1',
        variantId: undefined,
        quantity: 2,
        status: 'reserved',
        expiresAt: expect.any(Date)
      }
    });
    expect(create).toHaveBeenNthCalledWith(2, {
      data: {
        id: 'checkout-1-prod-2',
        checkoutId: 'checkout-1',
        productId: 'prod-2',
        variantId: 'v-1',
        quantity: 1,
        status: 'reserved',
        expiresAt: expect.any(Date)
      }
    });
  });

  it('releases all reservations for a checkout', async () => {
    const updateMany = jest.fn().mockResolvedValue(undefined);
    const service = new InventoryReservationService({
      inventoryReservation: { updateMany }
    });

    await service.release('checkout-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { checkoutId: 'checkout-1' },
      data: { status: 'released' }
    });
  });

  it('confirms all reservations for a checkout', async () => {
    const updateMany = jest.fn().mockResolvedValue(undefined);
    const service = new InventoryReservationService({
      inventoryReservation: { updateMany }
    });

    await service.confirm('checkout-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { checkoutId: 'checkout-1' },
      data: { status: 'confirmed' }
    });
  });
});
