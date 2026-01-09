import { GeoPoint } from '../../value-objects/geopoint.value-object';

export interface TrafficData {
  congestionLevel: number; // 0-100, where 100 is severe congestion
  averageSpeed: number; // km/h
  travelTime: number; // minutes
  incidents: TrafficIncident[];
  roadConditions: 'good' | 'fair' | 'poor' | 'closed';
  confidence: number; // 0-100
}

export interface TrafficIncident {
  type: 'accident' | 'construction' | 'roadwork' | 'closure' | 'event';
  severity: 'low' | 'medium' | 'high';
  location: GeoPoint;
  description: string;
  estimatedDelay: number; // minutes
  startTime: Date;
  endTime?: Date;
}

export interface TrafficServicePort {
  getTrafficData(origin: GeoPoint, destination: GeoPoint): Promise<TrafficData>;
  getRouteTraffic(route: GeoPoint[]): Promise<TrafficData[]>;
  getTrafficIncidents(location: GeoPoint, radius: number): Promise<TrafficIncident[]>;
  calculateRouteWithTraffic(origin: GeoPoint, destination: GeoPoint): Promise<{
    optimalRoute: GeoPoint[];
    estimatedTime: number;
    trafficDelay: number;
    confidence: number;
  }>;
}
