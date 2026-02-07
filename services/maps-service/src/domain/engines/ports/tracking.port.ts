import { GeoPoint } from '../../value-objects/geopoint.value-object';

export interface TrackingUpdate {
    deliveryId: string;
    courierId: string;
    location: GeoPoint;
    speed: number;
    heading: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface TrackingPort {
    storeLocationUpdate(update: TrackingUpdate): Promise<void>;
    getCourierLocation(courierId: string): Promise<GeoPoint | null>;
    getDeliveryTracking(deliveryId: string): Promise<TrackingUpdate | null>;
    getLocationHistory(deliveryId: string): Promise<TrackingUpdate[]>;
    calculateETA(deliveryId: string, currentLocation: GeoPoint): Promise<number>;
    detectAnomalies(deliveryId: string, update: TrackingUpdate): Promise<string[]>;
}
