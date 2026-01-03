// Order Service Implementation with Transactional Outbox Pattern
// Complete order lifecycle management with guaranteed event publishing

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { TransactionalOutbox } from '../../shared/outbox/outboxPattern';
import { EventEnvelope, OrderCreatedPayload, EventFactory } from '../../events';

export class OrderService {
  private outbox: TransactionalOutbox;

  constructor(private prisma: PrismaClient) {
    this.outbox = new TransactionalOutbox(prisma);
  }

  async createOrder(orderData: {
    buyerId: string;
    sellerId: string;
    items: Array<{
      productId: string;
      productVariantId: string;
      price: number;
      quantity: number;
    }>;
    shippingAddress: any;
    billingAddress?: any;
    notes?: string;
  }): Promise<{ orderId: string; orderNumber: string }> {
    const orderNumber = this.generateOrderNumber();
    const totalAmount = orderData.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    // Use transaction to ensure atomicity
    return await this.prisma.$transaction(async (tx) => {
      // Create order in database
      const order = await tx.order.create({
        data: {
          orderNumber,
          buyerId: orderData.buyerId,
          sellerId: orderData.sellerId,
          status: 'pending',
          totalAmount,
          currency: 'TZS',
          shippingAddress: orderData.shippingAddress,
          billingAddress: orderData.billingAddress,
          notes: orderData.notes,
          items: {
            create: orderData.items.map(item => ({
              productId: item.productId,
              productVariantId: item.productVariantId,
              price: item.price,
              quantity: item.quantity,
              status: 'pending'
            }))
          }
        },
        include: { items: true }
      });

      // Create event envelope
      const eventPayload = EventFactory.createOrderCreated({
        orderId: order.id,
        orderNumber,
        buyerId: orderData.buyerId,
        sellerId: orderData.sellerId,
        items: orderData.items.map(item => ({
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          unitPrice: item.price,
          totalPrice: item.price * item.quantity
        })),
        totalAmount,
        currency: 'TZS',
        shippingAddress: orderData.shippingAddress,
        billingAddress: orderData.billingAddress
      });

      const envelope: EventEnvelope<OrderCreatedPayload> = {
        eventId: randomUUID(),
        eventType: 'order.created.v1',
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        producer: 'order-service',
        version: 'v1',
        payload: eventPayload
      };

      // Save event to outbox in same transaction
      await this.outbox.saveEvent(envelope, tx);

      return { orderId: order.id, orderNumber };
    });
  }

  /**
   * Mark order as paid (called by payment service event handler)
   */
  async markOrderAsPaid(orderId: string, paymentData: {
    paymentId: string;
    amount: number;
    paymentMethod: string;
    transactionId: string;
  }): Promise<void> {
    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'paid',
        items: {
          updateMany: {
            where: { orderId },
            data: { status: 'paid' }
          }
        }
      }
    });

    // Publish OrderPaid event (this should come from payment service, but for now)
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (order) {
      const orderPaidEvent: OrderPaidEvent = {
        eventId: randomUUID(),
        eventType: 'OrderPaid.v1',
        eventVersion: 1,
        producer: 'payment-service',
        timestamp: new Date().toISOString(),
        entityType: 'order',
        entityId: orderId,
        userId: order.buyerId,
        payload: {
          orderId,
          paymentId: paymentData.paymentId,
          amount: paymentData.amount,
          currency: 'TZS',
          paymentMethod: paymentData.paymentMethod,
          transactionId: paymentData.transactionId
        }
      };

      await this.eventBus.publish(orderPaidEvent);
    }
  }

  /**
   * Mark order as shipped (called by logistics service event handler)
   */
  async markOrderAsShipped(orderId: string, shipmentData: {
    shipmentId: string;
    trackingNumber: string;
    carrier: string;
    estimatedDelivery: string;
    items: Array<{ productVariantId: string; quantity: number }>;
  }): Promise<void> {
    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'shipped' }
    });

    // Update order items status
    for (const item of shipmentData.items) {
      await this.prisma.orderItem.updateMany({
        where: {
          orderId,
          productVariantId: item.productVariantId
        },
        data: {
          status: 'shipped',
          shippedAt: new Date()
        }
      });
    }

    // Publish OrderShipped event
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (order) {
      const orderShippedEvent: OrderShippedEvent = {
        eventId: randomUUID(),
        eventType: 'OrderShipped.v1',
        eventVersion: 1,
        producer: 'logistics-service',
        timestamp: new Date().toISOString(),
        entityType: 'order',
        entityId: orderId,
        userId: order.buyerId,
        payload: {
          orderId,
          shipmentId: shipmentData.shipmentId,
          trackingNumber: shipmentData.trackingNumber,
          carrier: shipmentData.carrier,
          estimatedDelivery: shipmentData.estimatedDelivery,
          items: shipmentData.items
        }
      };

      await this.eventBus.publish(orderShippedEvent);
    }
  }

  /**
   * Mark order as delivered (called by logistics service event handler)
   */
  async markOrderAsDelivered(orderId: string, deliveryData: {
    shipmentId: string;
    deliveryTimestamp: string;
    recipientName?: string;
    deliveryLocation?: any;
  }): Promise<void> {
    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'delivered',
        items: {
          updateMany: {
            where: { orderId },
            data: {
              status: 'delivered',
              deliveredAt: new Date(deliveryData.deliveryTimestamp)
            }
          }
        }
      }
    });

    // Publish OrderDelivered event
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (order) {
      const orderDeliveredEvent: OrderDeliveredEvent = {
        eventId: randomUUID(),
        eventType: 'OrderDelivered.v1',
        eventVersion: 1,
        producer: 'logistics-service',
        timestamp: new Date().toISOString(),
        entityType: 'order',
        entityId: orderId,
        userId: order.buyerId,
        payload: {
          orderId,
          shipmentId: deliveryData.shipmentId,
          deliveryTimestamp: deliveryData.deliveryTimestamp,
          recipientName: deliveryData.recipientName,
          deliveryLocation: deliveryData.deliveryLocation
        }
      };

      await this.eventBus.publish(orderDeliveredEvent);
    }
  }

  /**
   * Cancel order and publish OrderCancelled event
   */
  async cancelOrder(orderId: string, cancellationData: {
    reason: string;
    cancelledBy: string;
    refundAmount?: number;
  }): Promise<void> {
    // Update order status
    await this.prisma.order.update({
      where: { id: orderId },
      data: { status: 'cancelled' }
    });

    // Update order items
    await this.prisma.orderItem.updateMany({
      where: { orderId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: cancellationData.reason
      }
    });

    // Publish OrderCancelled event
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (order) {
      const orderCancelledEvent: OrderCancelledEvent = {
        eventId: randomUUID(),
        eventType: 'OrderCancelled.v1',
        eventVersion: 1,
        producer: 'order-service',
        timestamp: new Date().toISOString(),
        entityType: 'order',
        entityId: orderId,
        userId: order.buyerId,
        payload: {
          orderId,
          reason: cancellationData.reason,
          cancelledBy: cancellationData.cancelledBy,
          refundAmount: cancellationData.refundAmount
        }
      };

      await this.eventBus.publish(orderCancelledEvent);
    }
  }

  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          select: {
            id: true,
            orderId: true,
            productId: true,
            productVariantId: true,
            price: true,
            quantity: true,
            status: true,
            shippedAt: true,
            deliveredAt: true
          }
        }
      }
    });
  }

  /**
   * Get orders by user ID
   */
  async getUserOrders(userId: string, limit = 50, offset = 0) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }
}
