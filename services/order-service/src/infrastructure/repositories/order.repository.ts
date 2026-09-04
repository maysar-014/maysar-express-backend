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
          ward: order.deliveryAddress.ward,
          district: order.deliveryAddress.district,
          region: order.deliveryAddress.region,
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country,
          latitude: order.deliveryAddress.latitude,
          longitude: order.deliveryAddress.longitude
        },
        orderSource: (order as any).orderSource || 'CART',
        orderCompletionMethod: (order as any).orderCompletionMethod || null,
        chatConversationId: (order as any).chatConversationId || null,
        declineReason: (order as any).declineReason || null,
        fulfillmentLocationId: (order as any).fulfillmentLocationId || null,
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
        deliveryCode: (order as any).deliveryCode || null,
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

  async findBySellerId(sellerId: string): Promise<Order[]> {
    const records = await this.prisma.order_Order.findMany({
      where: { sellerId },
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
          ward: order.deliveryAddress.ward,
          district: order.deliveryAddress.district,
          region: order.deliveryAddress.region,
          postalCode: order.deliveryAddress.postalCode,
          country: order.deliveryAddress.country,
          latitude: order.deliveryAddress.latitude,
          longitude: order.deliveryAddress.longitude
        },
        orderSource: (order as any).orderSource || 'CART',
        orderCompletionMethod: (order as any).orderCompletionMethod || null,
        chatConversationId: (order as any).chatConversationId || null,
        declineReason: (order as any).declineReason || null,
        fulfillmentLocationId: (order as any).fulfillmentLocationId || null,
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
      orderSource: (data as any).orderSource ?? 'CART',
      orderCompletionMethod: (data as any).orderCompletionMethod ?? undefined,
      chatConversationId: (data as any).chatConversationId ?? undefined,
      declineReason: (data as any).declineReason ?? undefined,
      fulfillmentLocationId: (data as any).fulfillmentLocationId ?? undefined,
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
      deliveryCode: (data as any).deliveryCode ?? undefined,
      deliveryCodeUsedAt: (data as any).deliveryCodeUsedAt ?? undefined,
    });
  }

  private toDbStatus(status: OrderStatus): string {
    const map: Partial<Record<OrderStatus, string>> = {
      [OrderStatus.DRAFT]: 'DRAFT',
      [OrderStatus.PENDING]: 'PENDING',
      [OrderStatus.CONFIRMED]: 'CONFIRMED',
      [OrderStatus.PROCESSING]: 'ASSIGNED',
      [OrderStatus.ASSIGNED]: 'ASSIGNED',
      [OrderStatus.SHIPPED]: 'IN_TRANSIT',
      [OrderStatus.IN_TRANSIT]: 'IN_TRANSIT',
      [OrderStatus.DELIVERED]: 'DELIVERED',
      [OrderStatus.COMPLETED]: 'COMPLETED',
      [OrderStatus.CANCELLED]: 'CANCELLED',
      [OrderStatus.PENDING_SELLER_VERIFICATION]: 'PENDING_SELLER_VERIFICATION',
      [OrderStatus.SELLER_REVIEWING]: 'SELLER_REVIEWING',
      [OrderStatus.SELLER_CONFIRMED]: 'SELLER_CONFIRMED',
      [OrderStatus.SELLER_VERIFIED]: 'SELLER_VERIFIED',
      [OrderStatus.SELLER_REJECTED]: 'SELLER_REJECTED',
      [OrderStatus.SELLER_DECLINED]: 'SELLER_DECLINED',
      [OrderStatus.PAYMENT_PENDING]: 'PAYMENT_PENDING',
      [OrderStatus.ORDER_PLACED]: 'ORDER_PLACED',
      [OrderStatus.VERIFICATION_OVERDUE]: 'VERIFICATION_OVERDUE',
      [OrderStatus.UNDER_ADMIN_REVIEW]: 'UNDER_ADMIN_REVIEW',
    };
    return map[status] ?? String(status).toUpperCase();
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
    const map: Record<string, string> = {
      cod: 'COD',
      card: 'CARD',
      mobile_money: 'MOBILE_MONEY',
      wallet: 'WALLET',
      direct_payment: 'DIRECT_PAYMENT',
      seller_verification: 'SELLER_VERIFICATION',
    };
    return map[String(method).toLowerCase()] ?? String(method).toUpperCase();
  }

  private toDomainPaymentMethod(method: string): 'cod' | 'wallet' | 'card' | 'mobile_money' | 'direct_payment' | 'seller_verification' | string {
    const map: Record<string, string> = {
      COD: 'cod',
      CARD: 'card',
      MOBILE_MONEY: 'mobile_money',
      WALLET: 'wallet',
      DIRECT_PAYMENT: 'direct_payment',
      SELLER_VERIFICATION: 'seller_verification',
    };
    return map[String(method)] ?? String(method).toLowerCase();
  }
}
