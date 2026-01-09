import {
  RealTimeTrackingPort,
  LocationUpdate,
  TrackingData,
  LocationHistory
} from '../../domain/engines/ports/tracking.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export interface TrackingUpdate {
  deliveryId: string;
  courierId: string;
  location: GeoPoint;
  speed: number; // km/h
  heading: number; // degrees (0-360)
  timestamp: Date;
  status: 'moving' | 'stopped' | 'arriving' | 'arrived';
  batteryLevel?: number; // percentage
  accuracy?: number; // meters
}

export interface DeliveryTracking {
  deliveryId: string;
  courierId: string;
  currentLocation: GeoPoint;
  routeProgress: number; // percentage 0-100
  estimatedArrival: Date;
  actualArrival?: Date;
  status: 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'failed';
  trackingHistory: TrackingUpdate[];
  lastUpdate: Date;
}

export class RealTimeTrackingAdapter implements RealTimeTrackingPort {
  private trackingData = new Map<string, DeliveryTracking>();
  private updateCallbacks = new Map<string, ((update: TrackingUpdate) => void)[]>();

  constructor(private apiKey?: string) {}

  async startTracking(deliveryId: string, courierId: string, route: GeoPoint[]): Promise<void> {
    try {
      const initialTracking: DeliveryTracking = {
        deliveryId,
        courierId,
        currentLocation: route[0] || GeoPoint.create(0, 0, 'Unknown'),
        routeProgress: 0,
        estimatedArrival: new Date(Date.now() + 45 * 60 * 1000), // 45 minutes from now
        status: 'assigned',
        trackingHistory: [],
        lastUpdate: new Date()
      };

      this.trackingData.set(deliveryId, initialTracking);

      // Simulate real-time updates
      this.startSimulatedTracking(deliveryId);

      console.log(`Started tracking for delivery ${deliveryId} with courier ${courierId}`);
    } catch (error) {
      console.error('Error starting tracking:', error);
      throw new Error('Failed to start delivery tracking');
    }
  }

  async stopTracking(deliveryId: string): Promise<void> {
    try {
      const tracking = this.trackingData.get(deliveryId);
      if (tracking) {
        tracking.status = 'delivered';
        tracking.actualArrival = new Date();
        console.log(`Stopped tracking for delivery ${deliveryId}`);
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
      throw new Error('Failed to stop delivery tracking');
    }
  }

  async getCurrentLocation(deliveryId: string): Promise<{
    location: GeoPoint;
    accuracy: number;
    timestamp: Date;
  }> {
    try {
      const tracking = this.trackingData.get(deliveryId);
      if (!tracking) {
        throw new Error(`No tracking data found for delivery ${deliveryId}`);
      }

      return {
        location: tracking.currentLocation,
        accuracy: 5, // 5 meters accuracy
        timestamp: tracking.lastUpdate
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      throw new Error('Failed to get current location');
    }
  }

  async getDeliveryProgress(deliveryId: string): Promise<{
    progress: number;
    estimatedArrival: Date;
    currentSpeed: number;
    distanceRemaining: number;
  }> {
    try {
      const tracking = this.trackingData.get(deliveryId);
      if (!tracking) {
        throw new Error(`No tracking data found for delivery ${deliveryId}`);
      }

      return {
        progress: tracking.routeProgress,
        estimatedArrival: tracking.estimatedArrival,
        currentSpeed: 25 + Math.random() * 20, // 25-45 km/h
        distanceRemaining: (100 - tracking.routeProgress) / 100 * 15 // Rough estimate
      };
    } catch (error) {
      console.error('Error getting delivery progress:', error);
      throw new Error('Failed to get delivery progress');
    }
  }

  async getTrackingHistory(deliveryId: string, startTime?: Date, endTime?: Date): Promise<TrackingUpdate[]> {
    try {
      const tracking = this.trackingData.get(deliveryId);
      if (!tracking) {
        return [];
      }

      let history = tracking.trackingHistory;

      // Filter by time range if provided
      if (startTime) {
        history = history.filter(update => update.timestamp >= startTime);
      }
      if (endTime) {
        history = history.filter(update => update.timestamp <= endTime);
      }

      return history;
    } catch (error) {
      console.error('Error getting tracking history:', error);
      return [];
    }
  }

  async subscribeToUpdates(deliveryId: string, callback: (update: TrackingUpdate) => void): Promise<() => void> {
    try {
      if (!this.updateCallbacks.has(deliveryId)) {
        this.updateCallbacks.set(deliveryId, []);
      }

      this.updateCallbacks.get(deliveryId)!.push(callback);

      // Return unsubscribe function
      return () => {
        const callbacks = this.updateCallbacks.get(deliveryId);
        if (callbacks) {
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        }
      };
    } catch (error) {
      console.error('Error subscribing to updates:', error);
      return () => {}; // Return no-op unsubscribe function
    }
  }

  async updateCourierLocation(deliveryId: string, location: GeoPoint, speed?: number, heading?: number): Promise<void> {
    try {
      const tracking = this.trackingData.get(deliveryId);
      if (!tracking) {
        throw new Error(`No tracking data found for delivery ${deliveryId}`);
      }

      // Update current location
      tracking.currentLocation = location;
      tracking.lastUpdate = new Date();

      // Calculate progress (simplified)
      tracking.routeProgress = Math.min(100, tracking.routeProgress + 5);

      // Create tracking update
      const update: TrackingUpdate = {
        deliveryId,
        courierId: tracking.courierId,
        location,
        speed: speed || 30,
        heading: heading || Math.random() * 360,
        timestamp: new Date(),
        status: tracking.routeProgress >= 100 ? 'arrived' : 'moving',
        batteryLevel: 85 + Math.random() * 15, // 85-100%
        accuracy: 3 + Math.random() * 4 // 3-7 meters
      };

      // Add to history
      tracking.trackingHistory.push(update);

      // Notify subscribers
      const callbacks = this.updateCallbacks.get(deliveryId);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(update);
          } catch (error) {
            console.error('Error in tracking update callback:', error);
          }
        });
      }

    } catch (error) {
      console.error('Error updating courier location:', error);
      throw new Error('Failed to update courier location');
    }
  }

  async getCourierStatus(courierId: string): Promise<{
    isOnline: boolean;
    currentDelivery?: string;
    lastSeen: Date;
    batteryLevel?: number;
  }> {
    try {
      // Find any delivery this courier is assigned to
      let currentDelivery: string | undefined;
      let lastSeen = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      for (const [deliveryId, tracking] of this.trackingData.entries()) {
        if (tracking.courierId === courierId) {
          currentDelivery = deliveryId;
          lastSeen = tracking.lastUpdate;
          break;
        }
      }

      return {
        isOnline: currentDelivery !== undefined,
        currentDelivery,
        lastSeen,
        batteryLevel: 80 + Math.random() * 20 // 80-100%
      };
    } catch (error) {
      console.error('Error getting courier status:', error);
      return {
        isOnline: false,
        lastSeen: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      };
    }
  }

  private startSimulatedTracking(deliveryId: string): void {
    const tracking = this.trackingData.get(deliveryId);
    if (!tracking) return;

    // Simulate periodic location updates
    const updateInterval = setInterval(async () => {
      try {
        const currentTracking = this.trackingData.get(deliveryId);
        if (!currentTracking || currentTracking.status === 'delivered') {
          clearInterval(updateInterval);
          return;
        }

        // Simulate movement
        const currentCoords = currentTracking.currentLocation.getCoordinates();
        const newLat = currentCoords.lat + (Math.random() - 0.5) * 0.001; // Small movement
        const newLng = currentCoords.lng + (Math.random() - 0.5) * 0.001;

        const newLocation = GeoPoint.create(newLat, newLng, 'Current Location');

        await this.updateCourierLocation(
          deliveryId,
          newLocation,
          25 + Math.random() * 20, // 25-45 km/h
          Math.random() * 360 // Random heading
        );

      } catch (error) {
        console.error('Error in simulated tracking:', error);
        clearInterval(updateInterval);
      }
    }, 30000); // Update every 30 seconds

    // Stop simulation after 10 minutes
    setTimeout(() => {
      clearInterval(updateInterval);
      const currentTracking = this.trackingData.get(deliveryId);
      if (currentTracking) {
        currentTracking.status = 'delivered';
        currentTracking.actualArrival = new Date();
      }
    }, 10 * 60 * 1000); // 10 minutes
  }

  // Get all active tracking data (for monitoring/debugging)
  getAllTrackingData(): Map<string, DeliveryTracking> {
    return new Map(this.trackingData);
  }

  // Clear old tracking data (for cleanup)
  clearOldTrackingData(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    for (const [deliveryId, tracking] of this.trackingData.entries()) {
      if (tracking.lastUpdate < cutoffTime && tracking.status === 'delivered') {
        this.trackingData.delete(deliveryId);
        this.updateCallbacks.delete(deliveryId);
      }
    }
  }

  async storeLocationUpdate(update: LocationUpdate): Promise<void> {
    try {
      // Find the delivery this courier is assigned to
      let deliveryId: string | undefined;
      for (const [delId, tracking] of this.trackingData.entries()) {
        if (tracking.courierId === update.courierId) {
          deliveryId = delId;
          break;
        }
      }

      if (!deliveryId) {
        // Store location update even if no active delivery
        console.log(`Stored location update for courier ${update.courierId} (no active delivery)`);
        return;
      }

      await this.updateCourierLocation(
        deliveryId,
        update.location,
        update.speed,
        update.heading
      );

    } catch (error) {
      console.error('Error storing location update:', error);
      throw new Error('Failed to store location update');
    }
  }

  async getCourierLocation(courierId: string): Promise<GeoPoint | null> {
    try {
      // Find the most recent location for this courier
      for (const tracking of this.trackingData.values()) {
        if (tracking.courierId === courierId) {
          return tracking.currentLocation;
        }
      }

      // No active delivery found
      return null;
    } catch (error) {
      console.error('Error getting courier location:', error);
      return null;
    }
  }

  async getDeliveryTracking(deliveryId: string): Promise<TrackingData | null> {
    try {
      const tracking = this.trackingData.get(deliveryId);
      if (!tracking) {
        return null;
      }

      return {
        deliveryId: tracking.deliveryId,
        courierId: tracking.courierId,
        currentLocation: tracking.currentLocation,
        routeProgress: tracking.routeProgress,
        estimatedArrival: tracking.estimatedArrival,
        lastUpdate: tracking.lastUpdate,
        status: this.mapStatus(tracking.status),
        etaAccuracy: 0.85 // 85% confidence
      };
    } catch (error) {
      console.error('Error getting delivery tracking:', error);
      return null;
    }
  }

  private mapStatus(status: string): 'en_route' | 'arrived' | 'delayed' | 'rerouted' {
    switch (status) {
      case 'assigned':
      case 'picked_up':
      case 'in_transit':
        return 'en_route';
      case 'delivered':
        return 'arrived';
      default:
        return 'en_route';
    }
  }

  async getLocationHistory(courierId: string, period: 'hour' | 'day' | 'week'): Promise<LocationHistory> {
    try {
      // Calculate time range
      const now = new Date();
      const startTime = new Date();

      switch (period) {
        case 'hour':
          startTime.setHours(now.getHours() - 1);
          break;
        case 'day':
          startTime.setDate(now.getDate() - 1);
          break;
        case 'week':
          startTime.setDate(now.getDate() - 7);
          break;
      }

      // Collect all location updates for this courier
      const locations: LocationUpdate[] = [];
      let totalDistance = 0;
      let totalSpeed = 0;
      let speedCount = 0;

      for (const tracking of this.trackingData.values()) {
        if (tracking.courierId === courierId) {
          for (const update of tracking.trackingHistory) {
            if (update.timestamp >= startTime) {
              locations.push({
                courierId,
                location: update.location,
                timestamp: update.timestamp,
                accuracy: update.accuracy || 5,
                speed: update.speed,
                heading: update.heading,
                batteryLevel: update.batteryLevel,
                signalStrength: 80 + Math.random() * 20 // 80-100%
              });

              if (update.speed) {
                totalSpeed += update.speed;
                speedCount++;
              }
            }
          }
        }
      }

      return {
        courierId,
        period,
        locations,
        totalDistance, // Would calculate actual distance traveled
        averageSpeed: speedCount > 0 ? totalSpeed / speedCount : 0
      };
    } catch (error) {
      console.error('Error getting location history:', error);
      return {
        courierId,
        period,
        locations: [],
        totalDistance: 0,
        averageSpeed: 0
      };
    }
  }

  async calculateETA(deliveryId: string): Promise<{
    estimatedArrival: Date;
    confidence: number;
    factors: {
      traffic: number;
      weather: number;
      courierPerformance: number;
      historicalData: number;
    };
  }> {
    try {
      const tracking = this.trackingData.get(deliveryId);
      if (!tracking) {
        throw new Error(`No tracking data found for delivery ${deliveryId}`);
      }

      // Calculate ETA based on current progress and factors
      const remainingTime = (100 - tracking.routeProgress) / 100 * 45 * 60 * 1000; // 45 minutes in ms
      const estimatedArrival = new Date(Date.now() + remainingTime);

      return {
        estimatedArrival,
        confidence: 0.85,
        factors: {
          traffic: 0.8,
          weather: 0.9,
          courierPerformance: 0.95,
          historicalData: 0.88
        }
      };
    } catch (error) {
      console.error('Error calculating ETA:', error);
      return {
        estimatedArrival: new Date(Date.now() + 45 * 60 * 1000),
        confidence: 0.5,
        factors: {
          traffic: 0.5,
          weather: 0.5,
          courierPerformance: 0.5,
          historicalData: 0.5
        }
      };
    }
  }

  async detectAnomalies(courierId: string): Promise<{
    hasAnomaly: boolean;
    type?: 'speeding' | 'deviation' | 'stalled' | 'signal_loss';
    severity: 'low' | 'medium' | 'high';
    description: string;
  }> {
    try {
      // Simple anomaly detection logic
      const recentUpdates: TrackingUpdate[] = [];

      // Collect recent updates for this courier
      for (const tracking of this.trackingData.values()) {
        if (tracking.courierId === courierId) {
          recentUpdates.push(...tracking.trackingHistory.slice(-10)); // Last 10 updates
        }
      }

      if (recentUpdates.length === 0) {
        return {
          hasAnomaly: false,
          severity: 'low',
          description: 'No recent tracking data available'
        };
      }

      // Check for speeding (above 80 km/h in urban area)
      const speedingUpdates = recentUpdates.filter(update => (update.speed || 0) > 80);
      if (speedingUpdates.length > 0) {
        return {
          hasAnomaly: true,
          type: 'speeding',
          severity: 'high',
          description: `Courier exceeded speed limit: ${speedingUpdates[0].speed} km/h`
        };
      }

      // Check for stalled vehicle (no movement for extended period)
      const latestUpdate = recentUpdates[recentUpdates.length - 1];
      const timeSinceLastMove = Date.now() - latestUpdate.timestamp.getTime();

      if (timeSinceLastMove > 10 * 60 * 1000 && (latestUpdate.speed || 0) < 5) { // 10 minutes, < 5 km/h
        return {
          hasAnomaly: true,
          type: 'stalled',
          severity: 'medium',
          description: 'Courier vehicle appears to be stalled'
        };
      }

      return {
        hasAnomaly: false,
        severity: 'low',
        description: 'No anomalies detected'
      };

    } catch (error) {
      console.error('Error detecting anomalies:', error);
      return {
        hasAnomaly: false,
        severity: 'low',
        description: 'Unable to perform anomaly detection'
      };
    }
  }
}
