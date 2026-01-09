import { GeoPoint } from '../../value-objects/geopoint.value-object';

export interface RouteEntity {
  id: string;
  deliveryId: string;
  courierId: string;
  waypoints: GeoPoint[];
  segments: Array<{
    start: GeoPoint;
    end: GeoPoint;
    distance: number;
    duration: number;
    roadType: string;
    trafficLevel: number;
  }>;
  totalDistance: number;
  totalDuration: number;
  efficiency: number;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteRepositoryPort {
  save(route: RouteEntity): Promise<void>;
  findByDeliveryId(deliveryId: string): Promise<RouteEntity | null>;
  findByCourierId(courierId: string): Promise<RouteEntity[]>;
  updateRoute(id: string, updates: Partial<RouteEntity>): Promise<void>;
  deleteRoute(id: string): Promise<void>;
}
