import prisma from '../../infrastructure/database/prisma';

export class GetSellerOrders {
  async execute(sellerId: string) {
    const orders = await prisma.order_Order.findMany({
      where: { sellerId },
      include: { items: true },
      orderBy: { createdAt: 'desc' }
    });

    const grouped = {
      new: [] as any[],
      processing: [] as any[],
      shipped: [] as any[],
      completed: [] as any[],
      disputed: [] as any[]
    };

    for (const order of orders) {
      const orderData = {
        id: order.id,
        buyerId: order.buyerId,
        amount: order.totalAmount,
        paymentStatus: order.status,
        createdAt: order.createdAt,
        itemCount: order.items.length
      };

      switch (order.status) {
        case 'PENDING':
          grouped.new.push(orderData);
          break;
        case 'CONFIRMED':
          grouped.processing.push(orderData);
          break;
        case 'IN_TRANSIT':
          grouped.shipped.push(orderData);
          break;
        case 'DELIVERED':
          grouped.completed.push(orderData);
          break;
        case 'CANCELLED':
          grouped.disputed.push(orderData);
          break;
      }
    }

    return grouped;
  }
}
