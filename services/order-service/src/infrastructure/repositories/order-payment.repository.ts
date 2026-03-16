import { Prisma, PrismaClient, Order_PaymentMethod, Order_PaymentStatus } from '@prisma/client';
import { Payment } from '../../domain/entities/payment.entity';

export class OrderPaymentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async upsert(payment: Payment): Promise<void> {
    const amount = new Prisma.Decimal(payment.amount);
    const status = payment.status.toUpperCase() as Order_PaymentStatus;
    const method = payment.method as Order_PaymentMethod;
    const metadata = payment.processorResponse
      ? (JSON.parse(JSON.stringify(payment.processorResponse)) as Prisma.InputJsonValue)
      : undefined;

    await this.prisma.order_Payment.upsert({
      where: { id: payment.id },
      create: {
        id: payment.id,
        orderId: payment.orderId,
        amount,
        currency: payment.currency,
        method,
        status,
        transactionId: payment.transactionId || null,
        externalRef: null,
        metadata
      },
      update: {
        amount,
        currency: payment.currency,
        method,
        status,
        transactionId: payment.transactionId || null,
        metadata
      }
    });
  }
}
