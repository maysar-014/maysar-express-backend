import { Prisma, PrismaClient } from '@prisma/client';
import { IDeliveryRepository, Delivery } from '../../domain/repositories';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

const buildAddressParts = (address: string | undefined): { street: string; city: string; region: string } => {
  const fallback = address || 'Unknown';
  return {
    street: fallback,
    city: 'Unknown',
    region: 'Unknown'
  };
};

export class PrismaDeliveryRepository implements IDeliveryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(delivery: Delivery): Promise<void> {
    const pickup = buildAddressParts(delivery.pickupLocation.getAddress());
    const dropoff = buildAddressParts(delivery.deliveryLocation.getAddress());
    const pickupCoords = delivery.pickupLocation.getCoordinates();
    const dropoffCoords = delivery.deliveryLocation.getCoordinates();

    const data: Prisma.Logistics_DeliveryUncheckedCreateInput = {
      id: delivery.id,
      orderId: delivery.orderId,
      courierId: delivery.courierId || null,
      status: delivery.status,
      trackingNumber: null,
      pickupStreet: pickup.street,
      pickupCity: pickup.city,
      pickupRegion: pickup.region,
      pickupLatitude: pickupCoords.lat,
      pickupLongitude: pickupCoords.lng,
      pickupContactName: 'Unknown',
      pickupContactPhone: 'Unknown',
      deliveryStreet: dropoff.street,
      deliveryCity: dropoff.city,
      deliveryRegion: dropoff.region,
      deliveryLatitude: dropoffCoords.lat,
      deliveryLongitude: dropoffCoords.lng,
      deliveryContactName: 'Unknown',
      deliveryContactPhone: 'Unknown',
      packageWeight: delivery.weight,
      packageValue: delivery.totalCost || 0,
      packageFragile: false,
      estimatedDeliveryTime: delivery.estimatedDeliveryTime || delivery.createdAt,
      actualDeliveryTime: delivery.actualDeliveryTime || null,
      isCOD: delivery.isCOD,
      codAmount: delivery.codAmount ? new Prisma.Decimal(delivery.codAmount) : null,
      codCurrency: delivery.codCurrency || null,
      codCollected: delivery.codCollected,
      codCollectedAt: delivery.codCollectedAt || null,
      codOtpVerified: delivery.codOtpVerified,
      codProofGpsLat: delivery.codProofGpsLat || null,
      codProofGpsLng: delivery.codProofGpsLng || null,
      codProofTimestamp: delivery.codProofTimestamp || null,
      buyerId: delivery.buyerId || null,
      sellerId: delivery.sellerId || null,
      codCommitmentHoldId: delivery.codCommitmentHoldId || null,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt
    };

    await this.prisma.logistics_Delivery.upsert({
      where: { id: delivery.id },
      create: data,
      update: {
        ...data,
        id: undefined
      }
    });
  }

  async findById(id: string): Promise<Delivery | null> {
    const record = await this.prisma.logistics_Delivery.findUnique({ where: { id } });
    return record ? this.toDelivery(record) : null;
  }

  async findByCourierId(courierId: string): Promise<Delivery[]> {
    const records = await this.prisma.logistics_Delivery.findMany({
      where: { courierId },
      orderBy: { createdAt: 'desc' }
    });
    return records.map(record => this.toDelivery(record));
  }

  async findByStatus(status: string): Promise<Delivery[]> {
    const records = await this.prisma.logistics_Delivery.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' }
    });
    return records.map(record => this.toDelivery(record));
  }

  async findAll(timeRange?: { start: Date; end: Date }): Promise<Delivery[]> {
    const where = timeRange
      ? { createdAt: { gte: timeRange.start, lte: timeRange.end } }
      : undefined;
    const records = await this.prisma.logistics_Delivery.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    return records.map(record => this.toDelivery(record));
  }

  async updateStatus(id: string, status: string, metadata?: any): Promise<void> {
    const data: Prisma.Logistics_DeliveryUncheckedUpdateInput = {
      status,
      updatedAt: new Date()
    };

    if (status === 'delivered') {
      data.actualDeliveryTime = new Date();
    }

    if (metadata) {
      if (metadata.codCollected !== undefined) data.codCollected = metadata.codCollected;
      if (metadata.codCollectedAt) data.codCollectedAt = metadata.codCollectedAt;
      if (metadata.codOtpVerified !== undefined) data.codOtpVerified = metadata.codOtpVerified;
      if (metadata.codProofGpsLat !== undefined) data.codProofGpsLat = metadata.codProofGpsLat;
      if (metadata.codProofGpsLng !== undefined) data.codProofGpsLng = metadata.codProofGpsLng;
      if (metadata.codProofTimestamp) data.codProofTimestamp = metadata.codProofTimestamp;
      if (metadata.isCOD !== undefined) data.isCOD = metadata.isCOD;
      if (metadata.buyerId) data.buyerId = metadata.buyerId;
      if (metadata.sellerId) data.sellerId = metadata.sellerId;
      if (metadata.codCommitmentHoldId) data.codCommitmentHoldId = metadata.codCommitmentHoldId;
    }

    await this.prisma.logistics_Delivery.update({
      where: { id },
      data
    });
  }

  async updateEstimatedDeliveryTime(
    id: string,
    estimatedDeliveryTime: Date,
    _routeDistanceKm?: number,
    _routeDurationMinutes?: number
  ): Promise<void> {
    await this.prisma.logistics_Delivery.update({
      where: { id },
      data: {
        estimatedDeliveryTime,
        updatedAt: new Date()
      }
    });
  }

  async findActiveDeliveries(): Promise<Delivery[]> {
    const records = await this.prisma.logistics_Delivery.findMany({
      where: { status: { in: ['assigned', 'picked_up', 'in_transit'] } },
      orderBy: { createdAt: 'desc' }
    });
    return records.map(record => this.toDelivery(record));
  }

  async getDeliveryStats(timeRange?: { start: Date; end: Date }): Promise<{
    totalDeliveries: number;
    completedDeliveries: number;
    averageDeliveryTime: number;
    onTimeDeliveryRate: number;
  }> {
    const where = timeRange
      ? { createdAt: { gte: timeRange.start, lte: timeRange.end } }
      : undefined;
    const deliveries = await this.prisma.logistics_Delivery.findMany({
      where,
      select: {
        status: true,
        actualDeliveryTime: true,
        estimatedDeliveryTime: true
      }
    });

    if (!deliveries.length) {
      return {
        totalDeliveries: 0,
        completedDeliveries: 0,
        averageDeliveryTime: 0,
        onTimeDeliveryRate: 0
      };
    }

    const totalDeliveries = deliveries.length;
    const completedDeliveries = deliveries.filter((d) => d.status === 'delivered').length;
    const completedWithTimes = deliveries.filter(
      (d) => d.status === 'delivered' && d.actualDeliveryTime && d.estimatedDeliveryTime
    );

    let averageDeliveryTime = 0;
    if (completedWithTimes.length) {
      const totalMinutes = completedWithTimes.reduce((sum, delivery) => {
        const actual = delivery.actualDeliveryTime as Date;
        const estimated = delivery.estimatedDeliveryTime as Date;
        return sum + (actual.getTime() - estimated.getTime()) / (1000 * 60);
      }, 0);
      averageDeliveryTime = totalMinutes / completedWithTimes.length;
    }

    const onTimeDeliveries = completedWithTimes.filter((delivery) => {
      const actual = delivery.actualDeliveryTime as Date;
      const estimated = delivery.estimatedDeliveryTime as Date;
      return actual <= estimated;
    }).length;

    const onTimeDeliveryRate = completedWithTimes.length
      ? onTimeDeliveries / completedWithTimes.length
      : 0;

    return {
      totalDeliveries,
      completedDeliveries,
      averageDeliveryTime: Math.round(averageDeliveryTime),
      onTimeDeliveryRate: Math.round(onTimeDeliveryRate * 100) / 100
    };
  }

  private toDelivery(record: any): Delivery {
    const pickupAddress = [record.pickupStreet, record.pickupCity, record.pickupRegion]
      .filter(Boolean)
      .join(', ');
    const deliveryAddress = [record.deliveryStreet, record.deliveryCity, record.deliveryRegion]
      .filter(Boolean)
      .join(', ');

    return {
      id: record.id,
      orderId: record.orderId,
      courierId: record.courierId || '',
      status: record.status,
      pickupLocation: GeoPoint.create(record.pickupLatitude, record.pickupLongitude, pickupAddress || 'Unknown'),
      deliveryLocation: GeoPoint.create(record.deliveryLatitude, record.deliveryLongitude, deliveryAddress || 'Unknown'),
      estimatedPickupTime: record.createdAt,
      actualPickupTime: undefined,
      estimatedDeliveryTime: record.estimatedDeliveryTime || record.createdAt,
      actualDeliveryTime: record.actualDeliveryTime || undefined,
      weight: record.packageWeight,
      priority: 'standard',
      specialRequirements: [],
      routeDistance: 0,
      routeDuration: 0,
      totalCost: Number(record.packageValue || 0),
      isCOD: !!record.isCOD,
      codAmount: record.codAmount ? Number(record.codAmount) : undefined,
      codCurrency: record.codCurrency || undefined,
      codCollected: !!record.codCollected,
      codCollectedAt: record.codCollectedAt || undefined,
      codOtpVerified: !!record.codOtpVerified,
      otp: undefined,
      otpExpiresAt: undefined,
      codProofGpsLat: record.codProofGpsLat || undefined,
      codProofGpsLng: record.codProofGpsLng || undefined,
      codProofTimestamp: record.codProofTimestamp || undefined,
      buyerId: record.buyerId || undefined,
      sellerId: record.sellerId || undefined,
      codCommitmentHoldId: record.codCommitmentHoldId || undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
}
