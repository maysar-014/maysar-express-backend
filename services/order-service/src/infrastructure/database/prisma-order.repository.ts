import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../domain/entities/order.entity';
import { databaseManager } from '../../config/database.config';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { createHash } from 'crypto';

interface OrderDelegate {
  create(args: Record<string, unknown>): Promise<unknown>;
  findUnique(args: Record<string, unknown>): Promise<unknown | null>;
  findMany(args: Record<string, unknown>): Promise<unknown[]>;
  update(args: Record<string, unknown>): Promise<unknown>;
  delete(args: Record<string, unknown>): Promise<unknown>;
  count(args?: Record<string, unknown>): Promise<number>;
}

interface OrderPrismaClient {
  order?: OrderDelegate;
  order_Order?: OrderDelegate;
}

export class PrismaOrderRepository implements OrderRepository {
  private prisma: OrderPrismaClient;

  constructor() {
    this.prisma = databaseManager.getPrisma() as unknown as OrderPrismaClient;
  }

  async save(order: Order): Promise<void> {
    try {
      const orderData = {
        id: order.id,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        enablerId: order.enablerId ?? null,
        enablerCode: order.enablerCode ?? null,
        status: this.toDbStatus(order.status),
        paymentMethod: this.toDbPaymentMethod(order.paymentMethod),
        totalAmount: order.totalAmount.amount,
        currency: order.totalAmount.currency,
        totalWeight: order.totalWeight,
        deliveryAddress: {
          street: order.deliveryAddress.street,
          city: order.deliveryAddress.city,
          ward: order.deliveryAddress.ward,
          district: order.deliveryAddress.district,
          region: order.deliveryAddress.region,
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country
        } as any,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancelReason,
        deliveryCode: (order as any).deliveryCode ?? null,
        orderSource: (order as any).orderSource || 'CART',
        orderCompletionMethod: (order as any).orderCompletionMethod || null,
        chatConversationId: (order as any).chatConversationId || null,
        declineReason: (order as any).declineReason || null,
        fulfillmentLocationId: (order as any).fulfillmentLocationId || null,
        // Seller-verification deadline. PlaceOrderUseCase computes this for every
        // order, but it was never written here, so the column stayed NULL: the
        // buyer never received `verificationDeadlineRemainingSeconds`, and the
        // VERIFICATION_OVERDUE transition could never be derived from stored data.
        verificationDeadlineAt: order.verificationDeadlineAt ?? null,
        verificationTimeoutMinutes: order.verificationTimeoutMinutes ?? 30,
        // Delivery economics — without these the COD commitment hold at
        // confirm-checkout is always 0 (DEF-030).
        deliveryFee: order.deliveryFee ?? null,
        logisticsEstimate: order.logisticsEstimate ?? null,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: {
          create: order.items.map(item => ({
            id: makeId(getModelPrefix('Order_OrderItem')),
            productId: item.productId,
            quantity: item.quantity,
            price: item.price.amount,
            currency: item.price.currency,
            weight: item.weight
          }))
        },
        ...(order.enablerAttributionEnablerId && order.enablerAttributionProductIds.length > 0
          ? {
            enablerAttributions: {
              create: order.enablerAttributionProductIds.map((productId) => ({
                enablerId: order.enablerAttributionEnablerId,
                customerId: order.buyerId,
                context: 'ORDER_LINK',
                status: 'CONVERTED',
                attributionKey: createHash('sha256')
                  .update(`${order.id}:${order.enablerAttributionEnablerId}:${productId}`)
                  .digest('hex'),
                productId,
                convertedAt: order.createdAt,
                metadata: {
                  source: 'enabler_purchase_link',
                  enablerCode: order.enablerAttributionCode ?? null,
                  authorizationId: order.enablerAttributionAuthorizationId ?? null,
                  earningRuleType: order.enablerAttributionRuleType ?? 'PERCENTAGE_OF_ITEM_SUBTOTAL',
                  earningRuleValue: order.enablerAttributionRate ?? 0,
                  baseAmount: order.enablerAttributionBaseAmount ?? 0,
                  commissionAmount: order.enablerAttributionAmount ?? 0,
                },
              })),
            },
          }
          : {}),
        ...(order.enablerAttributionEnablerId && order.enablerAttributionAuthorizationId && order.enablerAttributionAmount && order.enablerAttributionAmount > 0
          ? {
            enablerEarnings: {
              create: {
                id: makeId(getModelPrefix('Enabler_Earning')),
                enablerId: order.enablerAttributionEnablerId,
                sellerId: order.sellerId,
                authorizationId: order.enablerAttributionAuthorizationId,
                status: 'PENDING',
                currency: order.totalAmount.currency,
                baseAmount: order.enablerAttributionBaseAmount ?? 0,
                earningRuleType: order.enablerAttributionRuleType ?? 'PERCENTAGE_OF_ITEM_SUBTOTAL',
                earningRuleValue: order.enablerAttributionRate ?? 0,
                amount: order.enablerAttributionAmount,
                calculationContext: {
                  source: 'enabler_purchase_link',
                  productIds: order.enablerAttributionProductIds,
                  baseAmount: order.enablerAttributionBaseAmount ?? 0,
                  earningRuleValue: order.enablerAttributionRate ?? 0,
                  authorizationId: order.enablerAttributionAuthorizationId,
                },
                attributedAt: order.createdAt,
              },
            },
          }
          : {}),
      };

      await this.orderDelegate.create({
        data: orderData,
        include: {
          items: true
        }
      });

    } catch (error) {
      console.error('Error saving order to database:', error);
      throw new Error(`Failed to save order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(id: string): Promise<Order | null> {
    try {
      const prismaOrder = await this.orderDelegate.findUnique({
        where: { id },
        include: {
          items: true
        }
      });

      if (!prismaOrder) {
        return null;
      }

      return this.mapPrismaOrderToDomain(prismaOrder);

    } catch (error) {
      console.error('Error finding order by ID:', error);
      throw new Error(`Failed to find order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByBuyerId(buyerId: string): Promise<Order[]> {
    try {
      const prismaOrders = await this.orderDelegate.findMany({
        where: { buyerId },
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return prismaOrders.map((order: any) => this.mapPrismaOrderToDomain(order));

    } catch (error) {
      console.error('Error finding orders by buyer ID:', error);
      throw new Error(`Failed to find orders by buyer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findBySellerId(sellerId: string): Promise<Order[]> {
    try {
      const prismaOrders = await this.orderDelegate.findMany({
        where: { sellerId },
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return prismaOrders.map((order: any) => this.mapPrismaOrderToDomain(order));

    } catch (error) {
      console.error('Error finding orders by seller ID:', error);
      throw new Error(`Failed to find orders by seller: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  async update(order: Order): Promise<void> {
    try {
      const orderData = {
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        status: this.toDbStatus(order.status),
        paymentMethod: this.toDbPaymentMethod(order.paymentMethod),
        totalAmount: order.totalAmount.amount,
        currency: order.totalAmount.currency,
        totalWeight: order.totalWeight,
        deliveryAddress: {
          street: order.deliveryAddress.street,
          city: order.deliveryAddress.city,
          ward: order.deliveryAddress.ward,
          district: order.deliveryAddress.district,
          region: order.deliveryAddress.region,
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country
        } as any,
        cancelledAt: order.cancelledAt,
        cancellationReason: order.cancelReason,
        updatedAt: new Date()
      };

      await this.orderDelegate.update({
        where: { id: order.id },
        data: orderData
      });

    } catch (error) {
      console.error('Error updating order:', error);
      throw new Error(`Failed to update order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.orderDelegate.delete({
        where: { id }
      });

    } catch (error) {
      console.error('Error deleting order:', error);
      throw new Error(`Failed to delete order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private mapPrismaOrderToDomain(prismaOrder: any): Order {
    const deliveryAddress = prismaOrder.deliveryAddress as any;

    const orderData = {
      id: prismaOrder.id,
      buyerId: prismaOrder.buyerId,
      sellerId: prismaOrder.sellerId,
      enablerId: prismaOrder.enablerId ?? undefined,
      enablerCode: prismaOrder.enablerCode ?? undefined,
      items: prismaOrder.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: { amount: Number(item.price), currency: item.currency },
        weight: item.weight
      })),
      totalAmount: Number(prismaOrder.totalAmount),
      currency: prismaOrder.currency,
      totalWeight: prismaOrder.totalWeight,
      cancelledAt: prismaOrder.cancelledAt,
      cancellationReason: prismaOrder.cancellationReason,
      deliveryCode: prismaOrder.deliveryCode ?? undefined,
      deliveryCodeUsedAt: prismaOrder.deliveryCodeUsedAt ?? undefined,
      verificationDeadlineAt: prismaOrder.verificationDeadlineAt ?? undefined,
      verificationTimeoutMinutes: prismaOrder.verificationTimeoutMinutes ?? 30,
      deliveryFee: prismaOrder.deliveryFee ?? undefined,
      logisticsEstimate: prismaOrder.logisticsEstimate ?? undefined,
      // COD commitment state. Without these on the read path the order came back
      // with `codCommitmentHoldId === undefined`, so OrderController's cancel
      // compensation skipped the release entirely and a cancelled COD order left
      // the buyer's funds frozen permanently.
      codCommitmentFee: prismaOrder.codCommitmentFee != null ? Number(prismaOrder.codCommitmentFee) : undefined,
      codCommitmentPaid: prismaOrder.codCommitmentPaid ?? false,
      codCommitmentHoldId: prismaOrder.codCommitmentHoldId ?? undefined,
      orderSource: prismaOrder.orderSource ?? 'CART',
      orderCompletionMethod: prismaOrder.orderCompletionMethod ?? undefined,
      chatConversationId: prismaOrder.chatConversationId ?? undefined,
      declineReason: prismaOrder.declineReason ?? undefined,
      fulfillmentLocationId: prismaOrder.fulfillmentLocationId ?? undefined,
      paymentMethod: this.toDomainPaymentMethod(prismaOrder.paymentMethod),
      deliveryAddress: {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        ward: deliveryAddress.ward,
        district: deliveryAddress.district,
        region: deliveryAddress.region,
        postalCode: deliveryAddress.postalCode,
        country: deliveryAddress.country
      }
    };

    const order = new Order(orderData);
    // Override the status and dates from database
    (order as any).status = this.toDomainStatus(prismaOrder.status);
    (order as any).createdAt = prismaOrder.createdAt;
    (order as any).updatedAt = prismaOrder.updatedAt;

    return order;
  }

  // Additional helper methods for robust operations
  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.orderDelegate.count({
        where: { id }
      });
      return count > 0;
    } catch (error) {
      console.error('Error checking order existence:', error);
      return false;
    }
  }

  async count(): Promise<number> {
    try {
      return await this.orderDelegate.count();
    } catch (error) {
      console.error('Error counting orders:', error);
      throw new Error(`Failed to count orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    try {
      const prismaOrders = await this.orderDelegate.findMany({
        where: { status: this.toDbStatus(status) },
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      return prismaOrders.map((order: any) => this.mapPrismaOrderToDomain(order));

    } catch (error) {
      console.error('Error finding orders by status:', error);
      throw new Error(`Failed to find orders by status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private get orderDelegate(): OrderDelegate {
    const delegate = this.prisma.order_Order ?? this.prisma.order;
    if (!delegate) {
      throw new Error('Order delegate is not configured on prisma client');
    }
    return delegate;
  }

  private toDbStatus(status: string): string {
    const normalized = String(status).toLowerCase();
    const map: Record<string, string> = {
      pending: 'PENDING',
      confirmed: 'CONFIRMED',
      processing: 'ASSIGNED',
      assigned: 'ASSIGNED',
      shipped: 'IN_TRANSIT',
      in_transit: 'IN_TRANSIT',
      delivered: 'DELIVERED',
      cancelled: 'CANCELLED',
      pending_verification: 'PENDING',
      // New verification statuses — stored as-is in uppercase
      pending_seller_verification: 'PENDING_SELLER_VERIFICATION',
      seller_verified: 'SELLER_VERIFIED',
      seller_declined: 'SELLER_DECLINED',
      verification_overdue: 'VERIFICATION_OVERDUE',
      under_admin_review: 'UNDER_ADMIN_REVIEW',
      // Already-uppercase values pass through
      pending_seller_verification_upper: 'PENDING_SELLER_VERIFICATION',
    };
    return map[normalized] ?? String(status).toUpperCase();
  }

  private toDomainStatus(status: string): OrderStatus {
    const map: Record<string, OrderStatus> = {
      DRAFT: OrderStatus.DRAFT,
      PENDING: OrderStatus.PENDING,
      CONFIRMED: OrderStatus.CONFIRMED,
      PROCESSING: OrderStatus.PROCESSING,
      ASSIGNED: OrderStatus.ASSIGNED,
      SHIPPED: OrderStatus.SHIPPED,
      IN_TRANSIT: OrderStatus.IN_TRANSIT,
      DELIVERED: OrderStatus.DELIVERED,
      COMPLETED: OrderStatus.COMPLETED,
      CANCELLED: OrderStatus.CANCELLED,
      PENDING_SELLER_VERIFICATION: OrderStatus.PENDING_SELLER_VERIFICATION,
      SELLER_REVIEWING: OrderStatus.SELLER_REVIEWING,
      SELLER_CONFIRMED: OrderStatus.SELLER_CONFIRMED,
      SELLER_VERIFIED: OrderStatus.SELLER_VERIFIED,
      SELLER_REJECTED: OrderStatus.SELLER_REJECTED,
      SELLER_DECLINED: OrderStatus.SELLER_DECLINED,
      PAYMENT_PENDING: OrderStatus.PAYMENT_PENDING,
      ORDER_PLACED: OrderStatus.ORDER_PLACED,
      VERIFICATION_OVERDUE: OrderStatus.VERIFICATION_OVERDUE,
      UNDER_ADMIN_REVIEW: OrderStatus.UNDER_ADMIN_REVIEW,
    };
    return map[String(status)] ?? (status as OrderStatus);
  }

  private toDbPaymentMethod(method: string): string {
    const normalized = String(method).toLowerCase();
    const map: Record<string, string> = {
      cod: 'COD',
      wallet: 'WALLET',
      card: 'CARD',
      mobile_money: 'MOBILE_MONEY',
      mobile_payment: 'MOBILE_MONEY',
      direct_payment: 'DIRECT_PAYMENT',
      seller_verification: 'SELLER_VERIFICATION',
    };
    return map[normalized] ?? String(method).toUpperCase();
  }

  private toDomainPaymentMethod(method: string): 'cod' | 'wallet' | 'card' | 'mobile_money' {
    const map: Record<string, 'cod' | 'wallet' | 'card' | 'mobile_money'> = {
      COD: 'cod',
      CARD: 'card',
      MOBILE_MONEY: 'mobile_money',
      WALLET: 'wallet'
    };
    return map[String(method)] ?? 'cod';
  }
}
