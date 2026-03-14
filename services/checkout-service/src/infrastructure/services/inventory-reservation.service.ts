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
      await this.prisma.checkout_InventoryReservation.upsert({
        where: {
          checkoutId_productId_variantId: {
            checkoutId,
            productId: item.productId,
            variantId: item.variantId ?? null
          }
        },
        update: {
          quantity: item.quantity,
          status: 'reserved',
          expiresAt
        },
        create: {
          checkoutId,
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity: item.quantity,
          status: 'reserved',
          expiresAt
        }
      });
    }
  }

  async release(checkoutId: string): Promise<void> {
    await this.prisma.checkout_InventoryReservation.updateMany({
      where: { checkoutId },
      data: { status: 'released' }
    });
  }

  async confirm(checkoutId: string): Promise<void> {
    await this.prisma.checkout_InventoryReservation.updateMany({
      where: { checkoutId },
      data: { status: 'confirmed' }
    });
  }
}
