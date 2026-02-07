/**
 * Real-Time Tracking Adapter
 *
 * Constitution Section 8: Infrastructure Isolation Rule
 */

import {
    TrackingPort,
    TrackingUpdate
} from '../../domain/engines/ports/tracking.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class RealTimeTrackingAdapter implements TrackingPort {
    private latestUpdates = new Map<string, TrackingUpdate>();
    private history = new Map<string, TrackingUpdate[]>();

    async storeLocationUpdate(update: TrackingUpdate): Promise<void> {
        this.latestUpdates.set(update.courierId, update);

        const deliveryHistory = this.history.get(update.deliveryId) || [];
        deliveryHistory.push(update);
        this.history.set(update.deliveryId, deliveryHistory);
    }

    async getCourierLocation(courierId: string): Promise<GeoPoint | null> {
        const update = this.latestUpdates.get(courierId);
        return update ? update.location : null;
    }

    async getDeliveryTracking(deliveryId: string): Promise<TrackingUpdate | null> {
        const history = this.history.get(deliveryId);
        return history && history.length > 0 ? history[history.length - 1] : null;
    }

    async getLocationHistory(deliveryId: string): Promise<TrackingUpdate[]> {
        return this.history.get(deliveryId) || [];
    }

    async calculateETA(deliveryId: string, currentLocation: GeoPoint): Promise<number> {
        // Basic ETA calculation - in production would use RoutingPort
        return 15; // 15 minutes default
    }

    async detectAnomalies(deliveryId: string, update: TrackingUpdate): Promise<string[]> {
        const anomalies: string[] = [];
        if (update.speed > 100) {
            anomalies.push('SPEED_VIOLATION');
        }
        return anomalies;
    }
}
