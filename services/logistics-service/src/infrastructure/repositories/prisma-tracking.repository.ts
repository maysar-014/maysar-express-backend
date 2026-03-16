import { PrismaClient } from '@prisma/client';
import { ITrackingRepository, Tracking } from '../../domain/repositories';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class PrismaTrackingRepository implements ITrackingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(tracking: Tracking): Promise<void> {
    const coords = tracking.location.getCoordinates();
    await this.prisma.logistics_LocationHistory.create({
      data: {
        id: tracking.id,
        courierId: tracking.courierId,
        latitude: coords.lat,
        longitude: coords.lng,
        accuracy: tracking.accuracy,
        timestamp: tracking.timestamp
      }
    });
  }

  async findByDeliveryId(deliveryId: string): Promise<Tracking[]> {
    const delivery = await this.prisma.logistics_Delivery.findUnique({
      where: { id: deliveryId },
      select: { courierId: true, createdAt: true, actualDeliveryTime: true }
    });

    if (!delivery?.courierId) {
      return [];
    }

    const timeRange =
      delivery.actualDeliveryTime
        ? { start: delivery.createdAt, end: delivery.actualDeliveryTime }
        : { start: delivery.createdAt, end: new Date() };

    return this.findByCourierId(delivery.courierId, timeRange);
  }

  async findByCourierId(courierId: string, timeRange?: { start: Date; end: Date }): Promise<Tracking[]> {
    const where = timeRange
      ? { courierId, timestamp: { gte: timeRange.start, lte: timeRange.end } }
      : { courierId };

    const records = await this.prisma.logistics_LocationHistory.findMany({
      where,
      orderBy: { timestamp: 'asc' }
    });

    return records.map((record) => this.toTracking(record));
  }

  async getLatestTracking(deliveryId: string): Promise<Tracking | null> {
    const delivery = await this.prisma.logistics_Delivery.findUnique({
      where: { id: deliveryId },
      select: { courierId: true }
    });

    if (!delivery?.courierId) {
      return null;
    }

    const record = await this.prisma.logistics_LocationHistory.findFirst({
      where: { courierId: delivery.courierId },
      orderBy: { timestamp: 'desc' }
    });

    return record ? this.toTracking(record) : null;
  }

  async deleteOldTracking(olderThanHours: number): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const result = await this.prisma.logistics_LocationHistory.deleteMany({
      where: { timestamp: { lt: cutoff } }
    });
    return result.count;
  }

  private toTracking(record: any): Tracking {
    return {
      id: record.id,
      deliveryId: '',
      courierId: record.courierId,
      location: GeoPoint.create(record.latitude, record.longitude, 'Unknown'),
      speed: 0,
      heading: 0,
      timestamp: record.timestamp,
      status: 'unknown',
      batteryLevel: undefined,
      accuracy: record.accuracy || 0
    };
  }
}
