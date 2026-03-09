// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { CourierEntity } from '../../domain/entities/courier.entity';
import { PrismaClientManager } from '../prisma.client';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { DistanceCalculationAlgorithm } from '../../domain/algorithms/distance-calculation.algorithm';

export interface CourierRepository {
  findById(id: string): Promise<CourierEntity | null>;
  findByStatus(status: string): Promise<CourierEntity[]>;
  findNearby(latitude: number, longitude: number, radius: number): Promise<CourierEntity[]>;
  create(courier: CourierEntity): Promise<CourierEntity>;
  update(id: string, updates: Partial<CourierEntity>): Promise<CourierEntity>;
  updateLocation(id: string, latitude: number, longitude: number, accuracy: number): Promise<void>;
  updateStatus(id: string, status: string): Promise<void>;
}

export class PrismaCourierRepository implements CourierRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = PrismaClientManager.getInstance().getClient() as any;
  }

  async findById(id: string): Promise<CourierEntity | null> {
    const courier = await this.prisma.courier.findUnique({
      where: { id }
    });

    return courier ? this.mapToEntity(courier) : null;
  }

  async findByStatus(status: string): Promise<CourierEntity[]> {
    const couriers = await this.prisma.courier.findMany({
      where: { status }
    });

    return couriers.map(this.mapToEntity);
  }

  async findNearby(latitude: number, longitude: number, radius: number): Promise<CourierEntity[]> {
    // Simplified nearby search - in production, use PostGIS or similar
    const couriers = await this.prisma.courier.findMany({
      where: {
        status: 'active',
        currentLatitude: { not: null },
        currentLongitude: { not: null }
      }
    });

    const mappedCouriers = couriers.map(this.mapToEntity);
    const searchLocation = GeoPoint.create(latitude, longitude, 'search-location');
    const distanceChecks = await Promise.all(
      mappedCouriers.map(async courier => {
        if (!courier.currentLocation) return false;
        const coords = courier.currentLocation.getCoordinates();
        const courierLocation = GeoPoint.create(coords.lat, coords.lng, 'courier-location');
        const distance = await DistanceCalculationAlgorithm.calculateDeliveryDistance(searchLocation, courierLocation);
        return distance.distance <= radius;
      })
    );

    return mappedCouriers.filter((_courier, index) => distanceChecks[index]);
  }

  async create(courier: CourierEntity): Promise<CourierEntity> {
    const created = await this.prisma.courier.create({
      data: {
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        email: courier.email,
        status: courier.status,
        vehicleType: courier.vehicle.type,
        vehicleLicensePlate: courier.vehicle.licensePlate,
        vehicleCapacity: courier.vehicle.capacity,
        vehicleFuelType: courier.vehicle.fuelType
      }
    });

    return this.mapToEntity(created);
  }

  async update(id: string, updates: Partial<CourierEntity>): Promise<CourierEntity> {
    const updated = await this.prisma.courier.update({
      where: { id },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });

    return this.mapToEntity(updated);
  }

  async updateLocation(id: string, latitude: number, longitude: number, accuracy: number): Promise<void> {
    await this.prisma.courier.update({
      where: { id },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        locationAccuracy: accuracy,
        locationTimestamp: new Date(),
        updatedAt: new Date()
      }
    });
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.prisma.courier.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date()
      }
    });
  }

  private mapToEntity(data: any): CourierEntity {
    return new CourierEntity(
      data.id,
      data.name,
      data.phone,
      data.email,
      {
        type: data.vehicleType,
        licensePlate: data.vehicleLicensePlate,
        capacity: data.vehicleCapacity,
        fuelType: data.vehicleFuelType
      },
      data.status,
      data.currentLatitude && data.currentLongitude ? {
        latitude: data.currentLatitude,
        longitude: data.currentLongitude,
        accuracy: data.locationAccuracy || 0,
        timestamp: data.locationTimestamp || new Date()
      } : undefined,
      {
        onTimeDeliveryRate: data.onTimeDeliveryRate || 0,
        customerRating: data.customerRating || 0,
        completedDeliveries: data.completedDeliveries || 0,
        totalEarnings: data.totalEarnings || 0,
        averageDeliveryTime: data.averageDeliveryTime || 0
      },
      data.createdAt,
      data.updatedAt
    );
  }

}
