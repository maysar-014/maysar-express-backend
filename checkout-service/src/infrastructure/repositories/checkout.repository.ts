export interface ICheckoutRepository {
  saveSession(session: any): Promise<void>;
  getSession(id: string): Promise<any>;
  saveOrder(order: any): Promise<void>;
  getOrder(id: string): Promise<any>;
}

export class CheckoutRepository implements ICheckoutRepository {
  constructor(private prisma: any) {}

  async saveSession(session: any): Promise<void> {
    await this.prisma.checkoutSession.upsert({
      where: { id: session.id },
      create: session,
      update: session
    });
  }

  async getSession(id: string): Promise<any> {
    return this.prisma.checkoutSession.findUnique({
      where: { id }
    });
  }

  async saveOrder(order: any): Promise<void> {
    const { items, ...orderData } = order;
    await this.prisma.order.create({
      data: {
        ...orderData,
        items: { create: items }
      }
    });
  }

  async getOrder(id: string): Promise<any> {
    return this.prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });
  }
}
