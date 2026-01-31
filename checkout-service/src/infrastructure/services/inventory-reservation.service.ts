/**
 * Inventory Reservation Service
 * 
 * Manages inventory reservations during checkout.
 * Infrastructure layer - external service integration.
 */

export interface ReservationItem {
  productId: string;
  variantId?: string;
  quantity: number;
}

export class InventoryReservationService {
  constructor(private prisma: any) {}

  async reserve(checkoutId: string, items: ReservationItem[]): Promise<void> {
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    for (const item of items) {
      await this.prisma.inventoryReservation.create({
        data: {
          id: `${checkoutId}-${item.productId}`,
          checkoutId,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          status: 'reserved',
          expiresAt
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
