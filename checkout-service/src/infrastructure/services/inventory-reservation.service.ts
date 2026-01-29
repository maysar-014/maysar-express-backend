export interface IInventoryReservationService {
  reserve(checkoutId: string, items: any[]): Promise<void>;
  release(checkoutId: string): Promise<void>;
  confirm(checkoutId: string): Promise<void>;
}

export class InventoryReservationService implements IInventoryReservationService {
  constructor(private prisma: any) {}

  async reserve(checkoutId: string, items: any[]): Promise<void> {
    for (const item of items) {
      await this.prisma.inventoryReservation.create({
        data: {
          checkoutId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          status: 'reserved',
          expiresAt: new Date(Date.now() + 3600000)
        }
      });
    }
  }

  async release(checkoutId: string): Promise<void> {
    await this.prisma.inventoryReservation.updateMany({
      where: { checkoutId },
      data: { status: 'released' }
    });
  }

  async confirm(checkoutId: string): Promise<void> {
    await this.prisma.inventoryReservation.updateMany({
      where: { checkoutId },
      data: { status: 'confirmed' }
    });
  }
}
