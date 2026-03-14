import { InventoryReservationService } from './inventory-reservation.service';

describe('InventoryReservationService', () => {
  it('creates one reservation per item with reserved status', async () => {
    const upsert = jest.fn().mockResolvedValue(undefined);
    const service = new InventoryReservationService({
      checkout_InventoryReservation: { upsert }
    });

    await service.reserve('checkout-1', [
      { productId: 'prod-1', quantity: 2 },
      { productId: 'prod-2', variantId: 'v-1', quantity: 1 }
    ]);

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenNthCalledWith(1, {
      where: {
        checkoutId_productId_variantId: {
          checkoutId: 'checkout-1',
          productId: 'prod-1',
          variantId: null
        }
      },
      update: {
        quantity: 2,
        status: 'reserved',
        expiresAt: expect.any(Date)
      },
      create: {
        checkoutId: 'checkout-1',
        productId: 'prod-1',
        variantId: null,
        quantity: 2,
        status: 'reserved',
        expiresAt: expect.any(Date)
      }
    });
    expect(upsert).toHaveBeenNthCalledWith(2, {
      where: {
        checkoutId_productId_variantId: {
          checkoutId: 'checkout-1',
          productId: 'prod-2',
          variantId: 'v-1'
        }
      },
      update: {
        quantity: 1,
        status: 'reserved',
        expiresAt: expect.any(Date)
      },
      create: {
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
      checkout_InventoryReservation: { updateMany }
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
      checkout_InventoryReservation: { updateMany }
    });

    await service.confirm('checkout-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { checkoutId: 'checkout-1' },
      data: { status: 'confirmed' }
    });
  });
});
