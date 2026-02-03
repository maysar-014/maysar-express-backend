import { GeoPoint } from '../../value-objects/geopoint.value-object';

export interface DeliveryEntity {
  id: string;
  orderId: string;
  courierId: string;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled' | 'failed';
  pickupLocation: GeoPoint;
  deliveryLocation: GeoPoint;
  estimatedPickupTime: Date;
  actualPickupTime?: Date;
  estimatedDeliveryTime: Date;
  actualDeliveryTime?: Date;
  weight: number;
  priority: 'standard' | 'express' | 'urgent';
  specialRequirements?: string[];
  routeDistance: number;
  routeDuration: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryRepositoryPort {
  save(delivery: DeliveryEntity): Promise<void>;
  findById(id: string): Promise<DeliveryEntity | null>;
  findByCourierId(courierId: string): Promise<DeliveryEntity[]>;
  findByStatus(status: string): Promise<DeliveryEntity[]>;
  findAll(timeRange?: { start: Date; end: Date }): Promise<DeliveryEntity[]>;
  updateStatus(id: string, status: string, metadata?: any): Promise<void>;
  findActiveDeliveries(): Promise<DeliveryEntity[]>;
  getDeliveryStats(timeRange?: { start: Date; end: Date }): Promise<{
    totalDeliveries: number;
    completedDeliveries: number;
    averageDeliveryTime: number;
    onTimeDeliveryRate: number;
  }>;
}
