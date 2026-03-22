import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../domain/entities/order.entity';
import { databaseManager } from '../../config/database.config';
import { getModelPrefix, makeId } from '@shared/ids/id';

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
        trackingNumber: order.trackingNumber,
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
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country
        } as any,
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
        }
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

  async findByTrackingNumber(trackingNumber: string): Promise<Order | null> {
    try {
      const prismaOrder = await this.orderDelegate.findUnique({
        where: { trackingNumber },
        include: { items: true }
      });

      if (!prismaOrder) {
        return null;
      }

      return this.mapPrismaOrderToDomain(prismaOrder);
    } catch (error) {
      console.error('Error finding order by tracking number:', error);
      throw new Error(`Failed to find order by tracking number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(order: Order): Promise<void> {
    try {
      const orderData = {
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        trackingNumber: order.trackingNumber,
        status: this.toDbStatus(order.status),
        paymentMethod: this.toDbPaymentMethod(order.paymentMethod),
        totalAmount: order.totalAmount.amount,
        currency: order.totalAmount.currency,
        totalWeight: order.totalWeight,
        deliveryAddress: {
          street: order.deliveryAddress.street,
          city: order.deliveryAddress.city,
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country
        } as any,
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
      trackingNumber: prismaOrder.trackingNumber,
      buyerId: prismaOrder.buyerId,
      sellerId: prismaOrder.sellerId,
      items: prismaOrder.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: { amount: Number(item.price), currency: item.currency },
        weight: item.weight
      })),
      totalAmount: Number(prismaOrder.totalAmount),
      currency: prismaOrder.currency,
      totalWeight: prismaOrder.totalWeight,
      paymentMethod: this.toDomainPaymentMethod(prismaOrder.paymentMethod),
      deliveryAddress: {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
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
      processing: 'PENDING',
      assigned: 'ASSIGNED',
      shipped: 'IN_TRANSIT',
      in_transit: 'IN_TRANSIT',
      delivered: 'DELIVERED',
      cancelled: 'CANCELLED',
      pending_verification: 'PENDING'
    };
    return map[normalized] ?? String(status).toUpperCase();
  }

  private toDomainStatus(status: string): OrderStatus {
    const map: Record<string, OrderStatus> = {
      PENDING: OrderStatus.PENDING,
      CONFIRMED: OrderStatus.CONFIRMED,
      ASSIGNED: OrderStatus.ASSIGNED,
      IN_TRANSIT: OrderStatus.IN_TRANSIT,
      DELIVERED: OrderStatus.DELIVERED,
      CANCELLED: OrderStatus.CANCELLED
    };
    return map[String(status)] ?? OrderStatus.PENDING;
  }

  private toDbPaymentMethod(method: string): string {
    const normalized = String(method).toLowerCase();
    const map: Record<string, string> = {
      cod: 'COD',
      wallet: 'WALLET',
      card: 'CARD',
      mobile_money: 'MOBILE_MONEY',
      mobile_payment: 'MOBILE_MONEY'
    };
    return map[normalized] ?? String(method).toUpperCase();
  }

  private toDomainPaymentMethod(method: string): 'cod' | 'card' | 'mobile_money' {
    const map: Record<string, 'cod' | 'card' | 'mobile_money'> = {
      COD: 'cod',
      CARD: 'card',
      MOBILE_MONEY: 'mobile_money',
      WALLET: 'card'
    };
    return map[String(method)] ?? 'cod';
  }
}
