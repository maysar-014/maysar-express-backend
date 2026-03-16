/**
 * Prisma Checkout Order Repository
 * Persists checkout orders and items using Prisma ORM
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { CartItemVO } from '../../domain/value-objects/cart.value-object';

export interface CheckoutOrderSessionSnapshot {
  id: string;
  userId: string;
  shippingAddressId?: string;
  billingAddressId?: string;
  shippingMethodId?: string;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethodId?: string;
  paymentStatus?: string;
  metadata?: Record<string, unknown>;
  items?: CartItemVO[];
}

export class PrismaCheckoutOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByCheckoutSessionId(checkoutSessionId: string) {
    return this.prisma.checkout_Order.findFirst({
      where: { checkoutSessionId },
      include: { items: true }
    });
  }

  async createFromSession(session: CheckoutOrderSessionSnapshot) {
    const items = session.items ?? [];
    const metadata = session.metadata
      ? (JSON.parse(JSON.stringify(session.metadata)) as Prisma.InputJsonValue)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.checkout_Order.create({
        data: {
          checkoutSessionId: session.id,
          userId: session.userId,
          status: 'pending',
          shippingAddressId: session.shippingAddressId ?? null,
          billingAddressId: session.billingAddressId ?? null,
          shippingMethodId: session.shippingMethodId ?? null,
          subtotal: session.subtotal,
          shippingCost: session.shippingCost,
          taxAmount: session.taxAmount,
          discountAmount: session.discountAmount,
          totalAmount: session.totalAmount,
          paymentMethodId: session.paymentMethodId ?? null,
          paymentStatus: session.paymentStatus ?? 'pending',
          metadata
        }
      });

      if (items.length > 0) {
        await tx.checkout_OrderItem.createMany({
          data: items.map((item) => ({
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId ?? null,
            quantity: item.quantity,
            unitPrice: item.priceAtTime,
            totalPrice: item.priceAtTime * item.quantity
          }))
        });
      }

      return order;
    });
  }
}

