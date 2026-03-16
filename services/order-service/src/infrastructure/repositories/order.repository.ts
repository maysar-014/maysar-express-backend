import { PrismaClient, Order_Order } from '@prisma/client';
import { OrderRepository } from '../../domain/repositories/order.repository';
import { Order, OrderStatus, OrderItem } from '../../domain/entities/order.entity';
import { OptimisticLockError } from '../../../../../shared/errors/optimistic-lock.error';

export class OrderRepositoryImpl implements OrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(order: Order): Promise<void> {
    await this.prisma.order_Order.create({
      data: {
        id: order.id,
        trackingNumber: order.trackingNumber,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        enablerId: order.enablerId || null,
        enablerCode: order.enablerCode || null,
        status: this.toDbStatus(order.status) as any,
        paymentMethod: this.toDbPaymentMethod(order.paymentMethod) as any,
        totalAmount: order.totalAmount.amount,
        currency: order.totalAmount.currency,
        totalWeight: order.totalWeight,
        deliveryAddress: {
          street: order.deliveryAddress.street,
          city: order.deliveryAddress.city,
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country,
          latitude: order.deliveryAddress.latitude,
          longitude: order.deliveryAddress.longitude
        },
        codCommitmentFee: order.codCommitmentFee,
        codCommitmentPaid: order.codCommitmentPaid,
        codReputationScore: order.codReputationScore,
        codEligibilityChecked: order.codEligibilityChecked,
        codDeliveryOtp: order.codDeliveryOtp,
        codOtpExpiresAt: order.codOtpExpiresAt,
        codDeliveryConfirmedAt: order.codDeliveryConfirmedAt,
        codDeliveryConfirmedBy: order.codDeliveryConfirmedBy,
        codProofGpsLat: order.codProofGpsLat,
        codProofGpsLng: order.codProofGpsLng,
        codProofTimestamp: order.codProofTimestamp,
        codCommitmentHoldId: order.codCommitmentHoldId,
        version: 0,
      },
    });
  }

  async findById(id: string): Promise<Order | null> {
    const record = await this.prisma.order_Order.findUnique({
      where: { id },
      include: { items: true },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByBuyerId(buyerId: string): Promise<Order[]> {
    const records = await this.prisma.order_Order.findMany({
      where: { buyerId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Order | null> {
    const record = await this.prisma.order_Order.findUnique({
      where: { trackingNumber },
      include: { items: true },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByStatus(status: OrderStatus): Promise<Order[]> {
    const records = await this.prisma.order_Order.findMany({
      where: { status: this.toDbStatus(status) as any },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => this.toDomain(r));
  }

  async count(): Promise<number> {
    return this.prisma.order_Order.count();
  }

  async update(order: Order): Promise<void> {
    const result = await this.prisma.order_Order.updateMany({
      where: { id: order.id, version: order.version },
      data: {
        trackingNumber: order.trackingNumber,
        status: this.toDbStatus(order.status) as any,
        enablerId: order.enablerId || null,
        enablerCode: order.enablerCode || null,
        totalAmount: order.totalAmount.amount,
        totalWeight: order.totalWeight,
        deliveryAddress: {
          street: order.deliveryAddress.street,
          city: order.deliveryAddress.city,
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country,
          latitude: order.deliveryAddress.latitude,
          longitude: order.deliveryAddress.longitude
        },
        codCommitmentFee: order.codCommitmentFee,
        codCommitmentPaid: order.codCommitmentPaid,
        codReputationScore: order.codReputationScore,
        codEligibilityChecked: order.codEligibilityChecked,
        codDeliveryOtp: order.codDeliveryOtp,
        codOtpExpiresAt: order.codOtpExpiresAt,
        codDeliveryConfirmedAt: order.codDeliveryConfirmedAt,
        codDeliveryConfirmedBy: order.codDeliveryConfirmedBy,
        codProofGpsLat: order.codProofGpsLat,
        codProofGpsLng: order.codProofGpsLng,
        codProofTimestamp: order.codProofTimestamp,
        codCommitmentHoldId: order.codCommitmentHoldId,
        updatedAt: new Date(),
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new OptimisticLockError(`Order ${order.id} version ${order.version} was modified concurrently`);
    }
  }

  async delete(id: string): Promise<void> {
    await this.prisma.order_Order.delete({ where: { id } });
  }

  private toDomain(data: Order_Order & { items?: any[] }): Order {
    const items: OrderItem[] = (data.items || []).map((item: any) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: { amount: Number(item.price), currency: data.currency },
      weight: item.weight,
    })) as any;

    return new Order({
      id: data.id,
      trackingNumber: data.trackingNumber ?? undefined,
      buyerId: data.buyerId,
      sellerId: data.sellerId,
      enablerId: data.enablerId ?? undefined,
      enablerCode: data.enablerCode ?? undefined,
      items,
      totalAmount: Number(data.totalAmount),
      currency: data.currency,
      totalWeight: data.totalWeight,
      status: this.toDomainStatus(data.status),
      paymentMethod: this.toDomainPaymentMethod(data.paymentMethod),
      deliveryAddress: data.deliveryAddress,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      version: data.version,
      codCommitmentFee: data.codCommitmentFee ? Number(data.codCommitmentFee) : undefined,
      codCommitmentPaid: data.codCommitmentPaid,
      codReputationScore: data.codReputationScore ?? undefined,
      codEligibilityChecked: data.codEligibilityChecked,
      codDeliveryOtp: data.codDeliveryOtp ?? undefined,
      codOtpExpiresAt: data.codOtpExpiresAt ?? undefined,
      codDeliveryConfirmedAt: data.codDeliveryConfirmedAt ?? undefined,
      codDeliveryConfirmedBy: data.codDeliveryConfirmedBy ?? undefined,
      codProofGpsLat: data.codProofGpsLat ?? undefined,
      codProofGpsLng: data.codProofGpsLng ?? undefined,
      codProofTimestamp: data.codProofTimestamp ?? undefined,
      codCommitmentHoldId: data.codCommitmentHoldId ?? undefined,
    });
  }

  private toDbStatus(status: OrderStatus): string {
    const map: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'PENDING',
      [OrderStatus.CONFIRMED]: 'CONFIRMED',
      [OrderStatus.PROCESSING]: 'PENDING',
      [OrderStatus.ASSIGNED]: 'ASSIGNED',
      [OrderStatus.SHIPPED]: 'IN_TRANSIT',
      [OrderStatus.IN_TRANSIT]: 'IN_TRANSIT',
      [OrderStatus.DELIVERED]: 'DELIVERED',
      [OrderStatus.CANCELLED]: 'CANCELLED',
    };
    return map[status] ?? 'PENDING';
  }

  private toDomainStatus(status: string): OrderStatus {
    const map: Record<string, OrderStatus> = {
      PENDING: OrderStatus.PENDING,
      CONFIRMED: OrderStatus.CONFIRMED,
      ASSIGNED: OrderStatus.ASSIGNED,
      IN_TRANSIT: OrderStatus.IN_TRANSIT,
      DELIVERED: OrderStatus.DELIVERED,
      CANCELLED: OrderStatus.CANCELLED,
    };
    return map[status] ?? OrderStatus.PENDING;
  }

  private toDbPaymentMethod(method: string): string {
    const map: Record<string, string> = {
      cod: 'COD',
      card: 'CARD',
      mobile_money: 'MOBILE_MONEY',
    };
    return map[method] ?? 'COD';
  }

  private toDomainPaymentMethod(method: string): 'cod' | 'card' | 'mobile_money' {
    const map: Record<string, 'cod' | 'card' | 'mobile_money'> = {
      COD: 'cod',
      CARD: 'card',
      MOBILE_MONEY: 'mobile_money',
      WALLET: 'card',
    };
    return map[method] ?? 'cod';
  }
}
