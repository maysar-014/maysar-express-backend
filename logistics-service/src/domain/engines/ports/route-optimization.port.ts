import { GeoPoint } from '../../value-objects/geopoint.value-object';

export interface RouteSegment {
  start: GeoPoint;
  end: GeoPoint;
  distance: number; // km
  duration: number; // minutes
  roadType: 'highway' | 'main_road' | 'local_street' | 'alley';
  trafficLevel: number; // 0-100
}

export interface OptimizedRoute {
  segments: RouteSegment[];
  totalDistance: number;
  totalDuration: number;
  waypoints: GeoPoint[];
  efficiency: number; // 0-100
  confidence: number;
  alternatives: RouteSegment[][];
}

export interface RouteConstraints {
  maxDistance?: number;
  maxDuration?: number;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  vehicleType?: string;
  priority?: 'fastest' | 'shortest' | 'safest';
}

export interface RouteOptimizationPort {
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
