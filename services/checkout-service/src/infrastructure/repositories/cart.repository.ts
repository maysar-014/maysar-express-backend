/**
 * Cart Repository
 * Handles cart data persistence
 */

import { Cart, CartItemVO } from '../../domain/value-objects/cart.value-object';

export interface CartData {
  id: string;
  userId: string;
  items: CartItemVO[];
  createdAt: Date;
  updatedAt: Date;
}

export class CartRepository {
  private carts: Map<string, CartData> = new Map();

  async getCart(cartId: string): Promise<CartData | null> {
    return this.carts.get(cartId) || null;
  }

  async getById(cartId: string): Promise<CartData | null> {
    return this.getCart(cartId);
  }

  async saveCart(cartId: string, userId: string, cart: Cart): Promise<void> {
    const now = new Date();
    const existing = this.carts.get(cartId);
    
    this.carts.set(cartId, {
      id: cartId,
      userId,
      items: cart.getItems(),
      createdAt: existing?.createdAt || now,
      updatedAt: now
    });
  }

  async save(cartId: string, userId: string, cart: Cart): Promise<void> {
    return this.saveCart(cartId, userId, cart);
  }

  async deleteCart(cartId: string): Promise<void> {
    this.carts.delete(cartId);
  }

  async delete(cartId: string): Promise<void> {
    return this.deleteCart(cartId);
  }

  async clearExpiredCarts(expirationMs: number): Promise<void> {
    const now = Date.now();
    for (const [cartId, data] of this.carts.entries()) {
      if (now - data.updatedAt.getTime() > expirationMs) {
        this.carts.delete(cartId);
      }
    }
  }
}
