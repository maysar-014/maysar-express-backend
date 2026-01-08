import { PrismaClient } from '@prisma/client';
import { CourierEntity } from '../../domain/entities/courier.entity';
import { PrismaClientManager } from '../prisma.client';

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

    return couriers
      .map(this.mapToEntity)
      .filter(courier => {
        if (!courier.currentLocation) return false;
        const distance = this.calculateDistance(
          latitude, longitude,
          courier.currentLocation.latitude,
          courier.currentLocation.longitude
        );
        return distance <= radius;
      });
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

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}