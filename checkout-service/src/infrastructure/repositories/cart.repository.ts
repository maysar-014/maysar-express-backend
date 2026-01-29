import { Cart } from '../../domain/value-objects/cart.value-object';

export interface ICartRepository {
  save(cartId: string, userId: string, cart: Cart): Promise<void>;
  getById(cartId: string): Promise<{ items: any[] } | null>;
  delete(cartId: string): Promise<void>;
}

export class CartRepository implements ICartRepository {
  constructor(private prisma: any) {}

  async save(cartId: string, userId: string, cart: Cart): Promise<void> {
    const items = cart.getItems().map(item => ({
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      priceAtTime: item.priceAtTime
    }));

    await this.prisma.cart.upsert({
      where: { id: cartId },
      create: {
        id: cartId,
        userId,
        items: { create: items }
      },
      update: {
        items: {
          deleteMany: {},
          create: items
        }
      }
    });
  }

  async getById(cartId: string): Promise<{ items: any[] } | null> {
    return this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true }
    });
  }

  async delete(cartId: string): Promise<void> {
    await this.prisma.cart.delete({
      where: { id: cartId }
    });
  }
}
