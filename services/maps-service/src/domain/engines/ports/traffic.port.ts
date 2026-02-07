import { GeoPoint } from '../../value-objects/geopoint.value-object';

export interface TrafficConditions {
    level: 'low' | 'moderate' | 'heavy' | 'standstill';
    averageSpeed: number;
    delayMinutes: number;
    incidents: Array<{
        type: 'accident' | 'construction' | 'closure' | 'event';
        description: string;
        location: GeoPoint;
        severity: number;
    }>;
}

export interface TrafficPort {
    getConditions(location: GeoPoint, radiusKm: number): Promise<TrafficConditions>;
    getRouteTraffic(routePoints: GeoPoint[]): Promise<TrafficConditions>;
    predictTraffic(location: GeoPoint, time: Date): Promise<TrafficConditions>;
}
