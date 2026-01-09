import { GeoPoint } from '../../value-objects/geopoint.value-object';

export interface LocationUpdate {
  courierId: string;
  location: GeoPoint;
  timestamp: Date;
  accuracy: number; // GPS accuracy in meters
  speed?: number; // km/h
  heading?: number; // degrees
  batteryLevel?: number;
  signalStrength?: number;
}

export interface TrackingData {
  deliveryId: string;
  courierId: string;
  currentLocation: GeoPoint;
  routeProgress: number; // 0-100
  estimatedArrival: Date;
  lastUpdate: Date;
  status: 'en_route' | 'arrived' | 'delayed' | 'rerouted';
  etaAccuracy: number; // 0-100 confidence level
}

export interface LocationHistory {
  courierId: string;
  period: 'hour' | 'day' | 'week';
  locations: LocationUpdate[];
  totalDistance: number; // km
  averageSpeed: number; // km/h
}

export interface RealTimeTrackingPort {
  storeLocationUpdate(update: LocationUpdate): Promise<void>;
  getCourierLocation(courierId: string): Promise<GeoPoint | null>;
  getDeliveryTracking(deliveryId: string): Promise<TrackingData | null>;
  getLocationHistory(courierId: string, period: 'hour' | 'day' | 'week'): Promise<LocationHistory>;
  calculateETA(deliveryId: string): Promise<{
    estimatedArrival: Date;
    confidence: number;
    factors: {
      traffic: number;
      weather: number;
      courierPerformance: number;
      historicalData: number;
    };
  }>;
  detectAnomalies(courierId: string): Promise<{
    hasAnomaly: boolean;
    type?: 'speeding' | 'deviation' | 'stalled' | 'signal_loss';
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

export interface TrackingEntity {
  id: string;
  deliveryId: string;
  courierId: string;
  location: GeoPoint;
  speed: number;
  heading: number;
  timestamp: Date;
  status: string;
  batteryLevel?: number;
  accuracy: number;
}

export interface TrackingRepositoryPort {
  save(tracking: TrackingEntity): Promise<void>;
  findByDeliveryId(deliveryId: string): Promise<TrackingEntity[]>;
  findByCourierId(courierId: string, timeRange?: { start: Date; end: Date }): Promise<TrackingEntity[]>;
  getLatestTracking(deliveryId: string): Promise<TrackingEntity | null>;
  deleteOldTracking(olderThanHours: number): Promise<number>;
}
