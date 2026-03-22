import { PrismaClient } from '@prisma/client';
import { ICourierRepository, Courier } from '../../domain/repositories';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { DistanceCalculationAlgorithm } from '../../domain/algorithms/distance-calculation.algorithm';
import { CourierStatus, isCourierAvailable, normalizeCourierStatus } from '../../domain/enums/courier-status.enum';
import { getModelPrefix, makeId } from '@shared/ids/id';

export class PrismaCourierRepository implements ICourierRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private warnedFallback = false;

  private warnFallback(message: string): void {
    if (this.warnedFallback) return;
    this.warnedFallback = true;
    console.warn(message);
  }

  private buildFallbackCourier(courierId: string): Courier {
    return {
      id: courierId,
      name: 'Fallback Courier',
      phone: '+255700000000',
      vehicle: {
        type: 'motorbike',
        capacity: { maxWeight: 25, maxVolume: 1, maxItems: 5 }
      },
      rating: 5,
      completionRate: 1,
      currentLocation: GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam'),
      status: normalizeCourierStatus('online'),
      isAvailable: true,
      trafficExperience: 0.9
    };
  }

  private getPrefilterConfig(): { maxCandidates: number } {
    const maxCandidates = Number(process.env.COURIER_PREFILTER_MAX_CANDIDATES ?? '15');
    return {
      maxCandidates: Number.isFinite(maxCandidates) && maxCandidates > 0 ? maxCandidates : 15
    };
  }

  async findAvailableCouriers(location: GeoPoint, radius: number): Promise<Courier[]> {
    if (!location) {
      return Promise.reject(new Error('Location is required'));
    }
    if (typeof radius !== 'number' || radius <= 0) {
      return Promise.reject(new Error('Radius must be a positive number'));
    }

    let couriers;
    try {
      couriers = await this.prisma.logistics_Courier.findMany({
        where: {
          status: 'online',
          currentLatitude: { not: null },
          currentLongitude: { not: null },
          customerRating: { gte: 4.0 },
          onTimeDeliveryRate: { gte: 0.9 }
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        this.warnFallback('[logistics] Courier lookup failed; returning fallback list.');
        return [];
      }
      throw error;
    }

    const { maxCandidates } = this.getPrefilterConfig();

    const prefiltered = couriers
      .map((courier) => {
        const courierLocation = GeoPoint.create(
          courier.currentLatitude ?? 0,
          courier.currentLongitude ?? 0,
          'Unknown'
        );
        const straightDistance = location.distanceTo(courierLocation);
        return { courier, courierLocation, straightDistance };
      })
      .filter((entry) => entry.straightDistance <= radius)
      .sort((a, b) => a.straightDistance - b.straightDistance)
      .slice(0, maxCandidates);

    if (prefiltered.length === 0) {
      return [];
    }

    const distanceChecks = await Promise.all(
      prefiltered.map(async (entry) => {
        const routeDistance = await DistanceCalculationAlgorithm.calculateDeliveryDistance(
          location,
          entry.courierLocation
        );
        return routeDistance.distance <= radius;
      })
    );

    return prefiltered
      .filter((_, index) => distanceChecks[index])
      .map((entry) => this.toCourier(entry.courier));
  }

  async findAvailable(): Promise<Courier[]> {
    try {
      const couriers = await this.prisma.logistics_Courier.findMany({
        where: { status: 'online' }
      });
      return couriers.map((courier) => this.toCourier(courier));
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        this.warnFallback('[logistics] Courier lookup failed; returning fallback list.');
        return [];
      }
      throw error;
    }
  }

  async assignCourier(deliveryId: string, courierId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.logistics_Delivery.update({
        where: { id: deliveryId },
        data: {
          courierId,
          status: 'assigned',
          updatedAt: new Date()
        }
      }),
      this.prisma.logistics_Courier.update({
        where: { id: courierId },
        data: {
          status: 'busy',
          updatedAt: new Date()
        }
      })
    ]);
  }

  async findById(courierId: string): Promise<Courier | null> {
    try {
      const courier = await this.prisma.logistics_Courier.findUnique({
        where: { id: courierId }
      });
      if (courier) return this.toCourier(courier);
      if (process.env.NODE_ENV !== 'production') {
        return this.buildFallbackCourier(courierId);
      }
      return null;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        this.warnFallback('[logistics] Courier lookup failed; returning fallback courier.');
        return this.buildFallbackCourier(courierId);
      }
      throw error;
    }
  }

  async getCourierById(courierId: string): Promise<Courier> {
    const courier = await this.findById(courierId);
    if (!courier) {
      throw new Error(`Courier with ID ${courierId} not found`);
    }
    return courier;
  }

  async updateCourierLocation(courierId: string, location: GeoPoint): Promise<void> {
    const geoPoint = location instanceof GeoPoint
      ? location
      : GeoPoint.create(
          (location as any).lat || (location as any).latitude,
          (location as any).lng || (location as any).longitude,
          (location as any).address || 'Unknown'
        );

    const coords = geoPoint.getCoordinates();

    await this.prisma.$transaction([
      this.prisma.logistics_Courier.update({
        where: { id: courierId },
        data: {
          currentLatitude: coords.lat,
          currentLongitude: coords.lng,
          locationTimestamp: new Date(),
          updatedAt: new Date()
        }
      }),
      this.prisma.logistics_LocationHistory.create({
        data: {
          id: makeId(getModelPrefix('Logistics_LocationHistory')),
          courierId,
          latitude: coords.lat,
          longitude: coords.lng,
          accuracy: null,
          timestamp: new Date()
        }
      })
    ]);
  }

  async updateCourierAvailability(courierId: string, isAvailable: boolean): Promise<void> {
    const status: CourierStatus = isAvailable ? 'online' : 'offline';
    await this.updateCourierStatus(courierId, status);
  }

  async updateCourierStatus(courierId: string, status: CourierStatus): Promise<void> {
    await this.prisma.logistics_Courier.update({
      where: { id: courierId },
      data: {
        status,
        updatedAt: new Date()
      }
    });
  }

  async getCourierPerformance(courierId: string): Promise<{
    totalDeliveries: number;
    onTimeRate: number;
    averageRating: number;
  }> {
    const deliveries = await this.prisma.logistics_Delivery.findMany({
      where: {
        courierId,
        status: { in: ['delivered', 'DELIVERED', 'completed'] }
      }
    });

    const totalDeliveries = deliveries.length;
    const onTimeDeliveries = deliveries.filter((delivery) => {
      if (!delivery.actualDeliveryTime || !delivery.estimatedDeliveryTime) return false;
      return delivery.actualDeliveryTime <= delivery.estimatedDeliveryTime;
    }).length;

    const courier = await this.prisma.logistics_Courier.findUnique({
      where: { id: courierId },
      select: { customerRating: true }
    });

    return {
      totalDeliveries,
      onTimeRate: totalDeliveries > 0 ? onTimeDeliveries / totalDeliveries : 0,
      averageRating: courier?.customerRating || 0
    };
  }

  private toCourier(record: any): Courier {
    const status = normalizeCourierStatus(record.status ?? '');
    return {
      id: record.id,
      name: record.name,
      phone: record.phone,
      vehicle: {
        type: record.vehicleType,
        capacity: {
          maxWeight: record.vehicleCapacity,
          maxVolume: 0,
          maxItems: 0
        }
      },
      rating: record.customerRating || 0,
      completionRate: record.onTimeDeliveryRate || 0,
      currentLocation: GeoPoint.create(
        record.currentLatitude ?? 0,
        record.currentLongitude ?? 0,
        'Unknown'
      ),
      status,
      isAvailable: isCourierAvailable(status),
      trafficExperience: 0.8
    };
  }
}
