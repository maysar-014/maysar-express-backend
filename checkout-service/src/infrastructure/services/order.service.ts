/**
 * Order Service
 * 
 * Creates and manages orders.
 * Infrastructure layer - external service integration.
 */

export class OrderService {
  constructor(private prisma: any) {}

  async createOrder(
    checkoutSessionId: string,
    userId: string,
    totalAmount: number
  ): Promise<any> {
    return this.prisma.order.create({
      data: {
        checkoutSessionId,
        userId,
        totalAmount,
        status: 'pending',
        createdAt: new Date()
      }
    });
  }

  async getOrder(orderId: string): Promise<any> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });
  }

  async updateOrderStatus(orderId: string, status: string): Promise<void> {
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        updatedAt: new Date()
      }
    });
  }
}
