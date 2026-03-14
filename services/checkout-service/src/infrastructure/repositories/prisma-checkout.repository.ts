/**
 * Prisma Checkout Repository
 * Persists checkout sessions using Prisma ORM
 */

import { PrismaClient } from '@prisma/client';
import { CheckoutSession } from './checkout.repository';
import { CartItemVO } from '../../domain/value-objects/cart.value-object';

export class PrismaCheckoutRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    const record = await this.prisma.checkout_CheckoutSession.findUnique({
      where: { id: sessionId }
    });

    if (!record) return null;

    const metadata = (record.metadata || undefined) as Record<string, unknown> | undefined;
    const items = metadata?.items as CartItemVO[] | undefined;

    return {
      id: record.id,
      cartId: record.cartId,
      userId: record.userId,
      shippingAddressId: record.shippingAddressId || '',
      billingAddressId: record.billingAddressId || '',
      shippingMethodId: record.shippingMethodId || '',
      shippingCost: Number(record.shippingCost),
      subtotal: Number(record.subtotal),
      taxAmount: Number(record.taxAmount),
      discountAmount: Number(record.discountAmount),
      totalAmount: Number(record.totalAmount),
      status: record.status,
      paymentMethodId: record.paymentMethodId || undefined,
      paymentStatus: record.paymentStatus || undefined,
      metadata,
      items,
      expiresAt: record.expiresAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }

  async getSession(sessionId: string): Promise<CheckoutSession | null> {
    return this.getCheckoutSession(sessionId);
  }

  async saveCheckoutSession(session: CheckoutSession): Promise<void> {
    const metadata = session.metadata ?? (session.items ? { items: session.items } : undefined);

    await this.prisma.checkout_CheckoutSession.upsert({
      where: { id: session.id },
      update: {
        cartId: session.cartId,
        userId: session.userId,
        status: session.status,
        shippingAddressId: session.shippingAddressId || null,
        billingAddressId: session.billingAddressId || null,
        shippingMethodId: session.shippingMethodId || null,
        subtotal: session.subtotal,
        shippingCost: session.shippingCost,
        taxAmount: session.taxAmount,
        discountAmount: session.discountAmount,
        totalAmount: session.totalAmount,
        paymentMethodId: session.paymentMethodId || null,
        paymentStatus: session.paymentStatus || null,
        metadata: metadata ?? undefined,
        expiresAt: session.expiresAt
      },
      create: {
        id: session.id,
        cartId: session.cartId,
        userId: session.userId,
        status: session.status,
        shippingAddressId: session.shippingAddressId || null,
        billingAddressId: session.billingAddressId || null,
        shippingMethodId: session.shippingMethodId || null,
        subtotal: session.subtotal,
        shippingCost: session.shippingCost,
        taxAmount: session.taxAmount,
        discountAmount: session.discountAmount,
        totalAmount: session.totalAmount,
        paymentMethodId: session.paymentMethodId || null,
        paymentStatus: session.paymentStatus || null,
        metadata: metadata ?? undefined,
        expiresAt: session.expiresAt
      }
    });
  }

  async saveSession(session: CheckoutSession): Promise<void> {
    await this.saveCheckoutSession(session);
  }

  async deleteCheckoutSession(sessionId: string): Promise<void> {
    await this.prisma.checkout_CheckoutSession.delete({ where: { id: sessionId } });
  }

  async clearExpiredSessions(now: Date = new Date()): Promise<void> {
    await this.prisma.checkout_CheckoutSession.deleteMany({
      where: { expiresAt: { lt: now } }
    });
  }
}

