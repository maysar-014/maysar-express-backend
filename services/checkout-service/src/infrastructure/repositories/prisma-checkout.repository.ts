/**
 * Prisma Checkout Repository
 * Persists checkout sessions using Prisma ORM
 */

import { Prisma, PrismaClient } from '@prisma/client';
import { CheckoutRepository, CheckoutSession } from './checkout.repository';
import { CartItemVO } from '../../domain/value-objects/cart.value-object';

export class PrismaCheckoutRepository {
  private readonly fallback = new CheckoutRepository();
  private warnedMissingDelegate = false;

  constructor(private readonly prisma: PrismaClient) {}

  private getDelegate(): any | null {
    const delegate = (this.prisma as any).checkout_CheckoutSession;
    if (!delegate && !this.warnedMissingDelegate) {
      this.warnedMissingDelegate = true;
      console.warn('[checkout] Prisma delegate checkout_CheckoutSession unavailable; using in-memory fallback.');
    }
    return delegate || null;
  }

  async getCheckoutSession(sessionId: string): Promise<CheckoutSession | null> {
    const delegate = this.getDelegate();
    if (!delegate || typeof delegate.findUnique !== 'function') {
      return this.fallback.getCheckoutSession(sessionId);
    }

    const record = await delegate.findUnique({
      where: { id: sessionId }
    });

    if (!record) return null;

    const metadata = (record.metadata || undefined) as Record<string, unknown> | undefined;
    const items = metadata?.items as CartItemVO[] | undefined;

    return {
      id: record.id,
      cartId: record.cartId,
      userId: record.userId,
      enablerId: record.enablerId || undefined,
      enablerCode: record.enablerCode || undefined,
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
    const delegate = this.getDelegate();
    if (!delegate || typeof delegate.upsert !== 'function') {
      await this.fallback.saveCheckoutSession(session);
      return;
    }

    const metadata = session.metadata ?? (session.items ? { items: session.items } : undefined);
    const totalAmount =
      session.totalAmount ??
      session.subtotal + session.shippingCost + session.taxAmount - session.discountAmount;
    const metadataJson = metadata
      ? (JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue)
      : undefined;

    await delegate.upsert({
      where: { id: session.id },
      update: {
        cartId: session.cartId,
        userId: session.userId,
        enablerId: session.enablerId || null,
        enablerCode: session.enablerCode || null,
        status: session.status,
        shippingAddressId: session.shippingAddressId || null,
        billingAddressId: session.billingAddressId || null,
        shippingMethodId: session.shippingMethodId || null,
        subtotal: session.subtotal,
        shippingCost: session.shippingCost,
        taxAmount: session.taxAmount,
        discountAmount: session.discountAmount,
        totalAmount,
        paymentMethodId: session.paymentMethodId || null,
        paymentStatus: session.paymentStatus || null,
        metadata: metadataJson,
        expiresAt: session.expiresAt
      },
      create: {
        id: session.id,
        cartId: session.cartId,
        userId: session.userId,
        enablerId: session.enablerId || null,
        enablerCode: session.enablerCode || null,
        status: session.status,
        shippingAddressId: session.shippingAddressId || null,
        billingAddressId: session.billingAddressId || null,
        shippingMethodId: session.shippingMethodId || null,
        subtotal: session.subtotal,
        shippingCost: session.shippingCost,
        taxAmount: session.taxAmount,
        discountAmount: session.discountAmount,
        totalAmount,
        paymentMethodId: session.paymentMethodId || null,
        paymentStatus: session.paymentStatus || null,
        metadata: metadataJson,
        expiresAt: session.expiresAt
      }
    });
  }

  async saveSession(session: CheckoutSession): Promise<void> {
    await this.saveCheckoutSession(session);
  }

  async deleteCheckoutSession(sessionId: string): Promise<void> {
    const delegate = this.getDelegate();
    if (!delegate || typeof delegate.delete !== 'function') {
      await this.fallback.deleteCheckoutSession(sessionId);
      return;
    }
    await delegate.delete({ where: { id: sessionId } });
  }

  async clearExpiredSessions(now: Date = new Date()): Promise<void> {
    const delegate = this.getDelegate();
    if (!delegate || typeof delegate.deleteMany !== 'function') {
      await this.fallback.clearExpiredSessions(now);
      return;
    }
    await delegate.deleteMany({
      where: { expiresAt: { lt: now } }
    });
  }
}

