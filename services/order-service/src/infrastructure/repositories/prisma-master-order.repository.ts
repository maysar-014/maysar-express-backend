/**
 * PrismaMasterOrderRepository
 * Implements MasterOrderRepository using the shared globalThis.prisma singleton.
 */

import {
  MasterOrderRepository,
  MasterOrderData,
  MasterOrderWithOrders,
  MasterOrderSummary,
  PaginatedMasterOrders,
} from '../../domain/repositories/master-order.repository';
import { deriveMasterOrderStatus } from '../../domain/engines/master-order-status.engine';

export class PrismaMasterOrderRepository implements MasterOrderRepository {
  private get prisma(): any {
    return (globalThis as any).prisma;
  }

  async create(data: MasterOrderData): Promise<void> {
    await this.prisma.order_MasterOrder.create({
      data: {
        id: data.id,
        buyerId: data.buyerId,
        totalAmount: data.totalAmount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        sellerOrders: {
          create: data.sellerOrderIds.map(sellerOrderId => ({ sellerOrderId })),
        },
      },
    });
  }

  async findById(masterOrderId: string): Promise<MasterOrderWithOrders | null> {
    const record = await this.prisma.order_MasterOrder.findUnique({
      where: { id: masterOrderId },
      include: {
        sellerOrders: {
          include: {
            sellerOrder: {
              include: { items: true },
            },
          },
        },
      },
    });

    if (!record) return null;

    return {
      masterOrderId: record.id,
      buyerId: record.buyerId,
      totalAmount: Number(record.totalAmount),
      currency: record.currency,
      paymentMethod: record.paymentMethod,
      createdAt: record.createdAt,
      isVirtual: false,
      sellerOrders: record.sellerOrders.map((joi: any) => {
        const o = joi.sellerOrder;
        return {
          orderId: o.id,
          sellerId: o.sellerId,
          status: o.status,
          totalAmount: Number(o.totalAmount),
          deliveryFee: o.quoteId ? undefined : undefined, // populated by logistics
          items: (o.items || []).map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: Number(item.price),
            currency: item.currency,
            weight: item.weight,
          })),
          verificationDeadlineAt: o.verificationDeadlineAt?.toISOString(),
          chatConversationId: o.chatConversationId,
          createdAt: o.createdAt,
        };
      }),
    };
  }

  async findByBuyerId(buyerId: string, page: number, pageSize: number): Promise<PaginatedMasterOrders> {
    const skip = (page - 1) * pageSize;

    const [records, total] = await Promise.all([
      this.prisma.order_MasterOrder.findMany({
        where: { buyerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          sellerOrders: {
            include: {
              sellerOrder: {
                select: { status: true, items: { select: { id: true } } },
              },
            },
          },
        },
      }),
      this.prisma.order_MasterOrder.count({ where: { buyerId } }),
    ]);

    const items: MasterOrderSummary[] = records.map((record: any) => {
      const childStatuses: string[] = record.sellerOrders.map((joi: any) => joi.sellerOrder.status);
      const itemCount: number = record.sellerOrders.reduce(
        (sum: number, joi: any) => sum + (joi.sellerOrder.items?.length ?? 0),
        0,
      );

      return {
        masterOrderId: record.id,
        status: deriveMasterOrderStatus(childStatuses),
        totalAmount: Number(record.totalAmount),
        currency: record.currency,
        paymentMethod: record.paymentMethod,
        sellerOrderCount: record.sellerOrders.length,
        itemCount,
        isVirtual: false,
        createdAt: record.createdAt,
      };
    });

    return { items, total, page, pageSize };
  }
}
