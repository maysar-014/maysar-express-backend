import { GeoPoint } from '../../value-objects/geopoint.value-object';

export interface CourierEntity {
  id: string;
  name: string;
  phone: string;
  vehicle: {
    type: string;
    capacity: {
      maxWeight: number;
      maxVolume: number;
      maxItems: number;
    };
  };
  rating: number;
  completionRate: number;
  currentLocation: GeoPoint;
  isAvailable: boolean;
  estimatedArrivalTime: number;
  trafficExperience: number;
}

export interface CourierRepositoryPort {
  findAvailableCouriers(location: GeoPoint, radius: number): Promise<CourierEntity[]>;
  findAvailable(): Promise<CourierEntity[]>;
  assignCourier(deliveryId: string, courierId: string): Promise<void>;
  findById(courierId: string): Promise<CourierEntity | null>;
  getCourierById(courierId: string): Promise<CourierEntity>;
  updateCourierLocation(courierId: string, location: GeoPoint): Promise<void>;
  updateCourierAvailability(courierId: string, isAvailable: boolean): Promise<void>;
  getCourierPerformance(courierId: string): Promise<{
    totalDeliveries: number;
    onTimeRate: number;
    averageRating: number;
  }>;
}
