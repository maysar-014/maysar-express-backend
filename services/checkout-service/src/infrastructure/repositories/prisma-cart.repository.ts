/**
 * Prisma Cart Repository
 * Persists cart data using Prisma ORM
 */

import { PrismaClient } from '@prisma/client';
import { Cart, CartItemVO } from '../../domain/value-objects/cart.value-object';
import { CartData } from './cart.repository';

export class PrismaCartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getCart(cartId: string): Promise<CartData | null> {
    const cart = await this.prisma.checkout_Cart.findUnique({
      where: { id: cartId },
      include: { items: true }
    });

    if (!cart) return null;

    return {
      id: cart.id,
      userId: cart.userId,
      items: cart.items.map((item): CartItemVO => ({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        quantity: item.quantity,
        priceAtTime: Number(item.priceAtTime)
      })),
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt
    };
  }

  async getById(cartId: string): Promise<CartData | null> {
    return this.getCart(cartId);
  }

  async saveCart(cartId: string, userId: string, cart: Cart): Promise<void> {
    const items = cart.getItems();

    await this.prisma.$transaction(async (tx) => {
      await tx.checkout_Cart.upsert({
        where: { id: cartId },
        update: { userId },
        create: { id: cartId, userId }
      });

      await tx.checkout_CartItem.deleteMany({ where: { cartId } });

      if (items.length > 0) {
        await tx.checkout_CartItem.createMany({
          data: items.map(item => ({
            cartId,
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            priceAtTime: item.priceAtTime
          }))
        });
      }
    });
  }

  async save(cartId: string, userId: string, cart: Cart): Promise<void> {
    return this.saveCart(cartId, userId, cart);
  }

  async deleteCart(cartId: string): Promise<void> {
    await this.prisma.checkout_Cart.delete({ where: { id: cartId } });
  }

  async delete(cartId: string): Promise<void> {
    return this.deleteCart(cartId);
  }

  async clearExpiredCarts(now: Date = new Date()): Promise<void> {
    await this.prisma.checkout_Cart.deleteMany({
      where: { expiresAt: { lt: now } }
    });
  }
}

