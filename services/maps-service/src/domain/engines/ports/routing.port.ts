import { GeoPoint } from '../../value-objects/geopoint.value-object';

export interface RouteSegment {
    start: GeoPoint;
    end: GeoPoint;
    distance: number; // in km
    duration: number; // in minutes
    roadType: 'highway' | 'main_road' | 'local_street' | 'alley';
    trafficLevel: number; // 0-100 percentage
    instructions?: string;
}

export interface OptimizedRoute {
    segments: RouteSegment[];
    totalDistance: number;
    totalDuration: number;
    waypoints: GeoPoint[];
    efficiency: number; // 0-100 score
    confidence: number; // 0-1.0
    alternatives?: RouteSegment[][];
}

export interface RouteConstraints {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    vehicleType?: 'motorcycle' | 'bicycle' | 'car' | 'van' | 'truck';
    maxHeight?: number;
    maxWeight?: number;
}

export interface RoutingPort {
    calculateOptimalRoute(
        origin: GeoPoint,
        destination: GeoPoint,
        constraints?: RouteConstraints
    ): Promise<OptimizedRoute>;

    calculateMultiStopRoute(
        waypoints: GeoPoint[],
        constraints?: RouteConstraints
    ): Promise<OptimizedRoute>;

    getRouteAlternatives(
        origin: GeoPoint,
        destination: GeoPoint,
        count: number
    ): Promise<OptimizedRoute[]>;

    validateRoute(route: GeoPoint[]): Promise<{
        isValid: boolean;
        issues: string[];
        optimizedVersion?: OptimizedRoute;
    }>;
}
