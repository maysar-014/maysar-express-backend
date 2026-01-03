import { PrismaClient } from '@prisma/client';
import { CorrelatedOutbox } from '../../../shared/outbox/correlatedOutbox';
import { tracingService, TraceContext } from '../../../shared/tracing/openTelemetry';
import { EventCorrelationService } from '../../../shared/events/correlatedEvents';
import { OrderCreatedPayload } from '../../../events';

export class TracedOrderService {
  private outbox: CorrelatedOutbox;

  constructor(private prisma: PrismaClient) {
    this.outbox = new CorrelatedOutbox(prisma);
  }

  async createOrder(
    orderData: {
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
    },
    traceContext?: TraceContext
  ): Promise<{ orderId: string; orderNumber: string; correlationId: string }> {
    return await tracingService.executeWithSpan(
      'order-creation',
      async (spanContext) => {
        const orderNumber = this.generateOrderNumber();
        const totalAmount = orderData.items.reduce(
          (sum, item) => sum + (item.price * item.quantity),
          0
        );

        return await this.prisma.$transaction(async (tx) => {
          // Create order
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
              correlationId: spanContext.correlationId,
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

          // Create correlated event
          const eventPayload: OrderCreatedPayload = {
            version: 'v1',
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
          };

          await this.outbox.createAndSaveEvent(
            'order.created.v1',
            eventPayload,
            tx,
            {
              correlationId: spanContext.correlationId,
              traceContext: spanContext
            }
          );

          return {
            orderId: order.id,
            orderNumber,
            correlationId: spanContext.correlationId
          };
        });
      },
      traceContext
    );
  }

  async handlePaymentSuccess(
    orderId: string,
    paymentData: any,
    sourceEvent: any
  ): Promise<void> {
    await tracingService.executeWithSpan(
      'handle-payment-success',
      async (spanContext) => {
        await this.prisma.$transaction(async (tx) => {
          // Update order status
          await tx.order.update({
            where: { id: orderId },
            data: { status: 'paid' }
          });

          // Create follow-up event with correlation
          await this.outbox.createAndSaveEvent(
            'order.payment.confirmed.v1',
            { orderId, paymentId: paymentData.paymentId },
            tx,
            {
              correlationId: sourceEvent.correlationId,
              causationId: sourceEvent.eventId,
              traceContext: spanContext
            }
          );
        });
      }
    );
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `ORD-${timestamp}-${random}`;
  }
}