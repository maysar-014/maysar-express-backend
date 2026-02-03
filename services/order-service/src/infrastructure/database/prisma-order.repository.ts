import { PrismaClient } from '@prisma/client';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order } from '../../domain/entities/order.entity';
import { OrderStatus } from '../../domain/entities/order.entity';
import { databaseManager } from '../../config/database.config';

export class PrismaOrderRepository implements OrderRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = databaseManager.getPrisma();
  }

  async save(order: Order): Promise<void> {
    try {
      const orderData = {
        id: order.id,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        status: order.status as any, // Type assertion for enum compatibility
        paymentMethod: order.paymentMethod as any,
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
            productId: item.productId,
            quantity: item.quantity,
            price: item.price.amount,
            currency: item.price.currency,
            weight: item.weight
          }))
        }
      };

      await this.prisma.order.create({
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
      const prismaOrder = await this.prisma.order.findUnique({
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
      const prismaOrders = await this.prisma.order.findMany({
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

  async update(order: Order): Promise<void> {
    try {
      const orderData = {
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        status: order.status as any,
        paymentMethod: order.paymentMethod as any,
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

      await this.prisma.order.update({
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
      await this.prisma.order.delete({
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
      items: prismaOrder.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: { amount: Number(item.price), currency: item.currency },
        weight: item.weight
      })),
      totalAmount: Number(prismaOrder.totalAmount),
      currency: prismaOrder.currency,
      totalWeight: prismaOrder.totalWeight,
      paymentMethod: prismaOrder.paymentMethod as any,
      deliveryAddress: {
        street: deliveryAddress.street,
        city: deliveryAddress.city,
        postalCode: deliveryAddress.postalCode,
        country: deliveryAddress.country
      }
    };

    const order = new Order(orderData);
    // Override the status and dates from database
    (order as any).status = prismaOrder.status;
    (order as any).createdAt = prismaOrder.createdAt;
    (order as any).updatedAt = prismaOrder.updatedAt;

    return order;
  }

  // Additional helper methods for robust operations
  async exists(id: string): Promise<boolean> {
    try {
      const count = await this.prisma.order.count({
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
      return await this.prisma.order.count();
    } catch (error) {
      console.error('Error counting orders:', error);
      throw new Error(`Failed to count orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    try {
      const prismaOrders = await this.prisma.order.findMany({
        where: { status: status as any },
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
}
