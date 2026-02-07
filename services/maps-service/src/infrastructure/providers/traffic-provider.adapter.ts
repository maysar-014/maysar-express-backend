/**
 * Traffic Provider Adapter
 *
 * Constitution Section 8: Infrastructure Isolation Rule
 */

import {
    TrafficPort,
    TrafficConditions
} from '../../domain/engines/ports/traffic.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class TrafficProviderAdapter implements TrafficPort {
    constructor(private apiKey?: string) { }

    async getConditions(location: GeoPoint, radiusKm: number): Promise<TrafficConditions> {
        try {
            if (!this.apiKey) {
                return this.getFallbackConditions(location);
            }

            // Google Maps Directions API used for traffic estimation
            // Note: In a real implementation, a dedicated Traffic Layer API would be better
            const coords = location.getCoordinates();
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${coords.lat},${coords.lng}&destination=${coords.lat + 0.01},${coords.lng + 0.01}&departure_time=now&traffic_model=best_guess&key=${this.apiKey}`
            );

            if (!response.ok) {
                throw new Error(`Traffic API error: ${response.status}`);
            }

            const data = await response.json();
            return this.parseGoogleTraffic(data);
        } catch (error) {
            console.error('Error fetching traffic conditions:', error);
            return this.getFallbackConditions(location);
        }
    }

    async getRouteTraffic(routePoints: GeoPoint[]): Promise<TrafficConditions> {
        if (routePoints.length < 2) {
            return this.getFallbackConditions(routePoints[0]);
        }

        try {
            if (!this.apiKey) {
                return this.getFallbackConditions(routePoints[0]);
            }

            const origin = routePoints[0].getCoordinates();
            const dest = routePoints[routePoints.length - 1].getCoordinates();

            const response = await fetch(
                `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&departure_time=now&traffic_model=best_guess&key=${this.apiKey}`
            );

            if (!response.ok) {
                throw new Error(`Traffic API error: ${response.status}`);
            }

            const data = await response.json();
            return this.parseGoogleTraffic(data);
        } catch (error) {
            return this.getFallbackConditions(routePoints[0]);
        }
    }

    async predictTraffic(location: GeoPoint, time: Date): Promise<TrafficConditions> {
        // Basic prediction logic based on time of day
        return this.getFallbackConditions(location, time);
    }

    private parseGoogleTraffic(data: any): TrafficConditions {
        const route = data.routes?.[0];
        const leg = route?.legs?.[0];

        let delayMinutes = 0;
        let level: TrafficConditions['level'] = 'low';

        if (leg?.duration_in_traffic && leg?.duration) {
            delayMinutes = Math.max(0, (leg.duration_in_traffic.value - leg.duration.value) / 60);
            const ratio = leg.duration_in_traffic.value / leg.duration.value;

            if (ratio > 1.5) level = 'standstill';
            else if (ratio > 1.3) level = 'heavy';
            else if (ratio > 1.1) level = 'moderate';
        }

        const distanceKm = leg?.distance?.value / 1000 || 1;
        const durationMin = leg?.duration_in_traffic?.value / 60 || 1;

        return {
            level,
            averageSpeed: (distanceKm / durationMin) * 60,
            delayMinutes,
            incidents: [] // Incident parsing would require Places or Incidents API
        };
    }

    private getFallbackConditions(location: GeoPoint, time: Date = new Date()): TrafficConditions {
        const hour = time.getHours();
        const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);

        let level: TrafficConditions['level'] = 'low';
        let averageSpeed = 45;
        let delayMinutes = 0;

        if (isRushHour) {
            level = 'heavy';
            averageSpeed = 15;
            delayMinutes = 15;
        }

        return {
            level,
            averageSpeed,
            delayMinutes,
            incidents: []
        };
    }
}
