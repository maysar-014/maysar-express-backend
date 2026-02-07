import { TrackingPort as MapsTrackingPort } from '../../../../maps-service/src/domain/engines/ports/tracking.port';
import { RealTimeTrackingPort, LocationUpdate, TrackingData, LocationHistory } from '../../domain/engines/ports/tracking.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { MapsRegistry } from '../../../../maps-service/src/infrastructure/registry';
import { GeoPoint as MapsGeoPoint } from '../../../../maps-service/src/domain/value-objects/geopoint.value-object';

export class MapsTrackingBridge implements RealTimeTrackingPort {
    private get provider(): MapsTrackingPort {
        return MapsRegistry.getInstance().getTrackingProvider();
    }

    async storeLocationUpdate(update: LocationUpdate): Promise<void> {
        const mapsLocation = MapsGeoPoint.create(update.location.getLatitude(), update.location.getLongitude(), update.location.getAddress());
        await this.provider.storeLocationUpdate({
            ...update,
            location: mapsLocation,
            timestamp: update.timestamp || new Date()
        } as any);
    }

    async getCourierLocation(courierId: string): Promise<GeoPoint | null> {
        const loc = await this.provider.getCourierLocation(courierId);
        if (!loc) return null;
        return GeoPoint.create(loc.getLatitude(), loc.getLongitude(), loc.getAddress());
    }

    async getDeliveryTracking(deliveryId: string): Promise<TrackingData | null> {
        const data = await this.provider.getDeliveryTracking(deliveryId);
        if (!data) return null;
        return data as any;
    }

    async getLocationHistory(courierId: string, period: 'hour' | 'day' | 'week'): Promise<LocationHistory> {
        // Port definition mismatch handling
        return { courierId, period, locations: [], totalDistance: 0, averageSpeed: 0 };
    }

    async calculateETA(deliveryId: string): Promise<{ estimatedArrival: Date; confidence: number; factors: any }> {
        const eta = await this.provider.calculateETA(deliveryId, null as any);
        return {
            estimatedArrival: new Date(Date.now() + (eta * 60 * 1000)),
            confidence: 0.9,
            factors: {}
        } as any;
    }

    async detectAnomalies(courierId: string): Promise<any> {
        return { hasAnomaly: false, severity: 'low', description: 'N/A' };
    }

    // Mandatory implementation for RealTimeTrackingPort interface
    async startTracking(deliveryId: string, courierId: string, route: GeoPoint[]): Promise<void> { }
    async stopTracking(deliveryId: string): Promise<void> { }
    async getCurrentLocation(deliveryId: string): Promise<any> { return null; }
    async getDeliveryProgress(deliveryId: string): Promise<any> { return null; }
    async getTrackingHistory(deliveryId: string): Promise<any[]> { return []; }
    async subscribeToUpdates(deliveryId: string, callback: any): Promise<() => void> { return () => { }; }
    async updateCourierLocation(deliveryId: string, location: GeoPoint): Promise<void> { }
    async getCourierStatus(courierId: string): Promise<any> { return null; }
}
