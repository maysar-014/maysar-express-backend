import { TrafficServicePort, TrafficData, TrafficIncident } from '../../domain/engines/ports/traffic.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { getLocalitySummary } from './local-tanzania-locations';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export class MapsTrafficBridge implements TrafficServicePort {
  async getTrafficData(origin: GeoPoint, destination: GeoPoint): Promise<TrafficData> {
    return this.buildTraffic(origin, destination);
  }

  async getRouteTraffic(route: GeoPoint[]): Promise<TrafficData[]> {
    if (route.length < 2) {
      return [];
    }

    const trafficSegments: TrafficData[] = [];
    for (let index = 0; index < route.length - 1; index++) {
      trafficSegments.push(this.buildTraffic(route[index], route[index + 1]));
    }
    return trafficSegments;
  }

  async getTrafficIncidents(location: GeoPoint, radius: number): Promise<TrafficIncident[]> {
    const locality = getLocalitySummary(location);
    if (locality.regionName !== 'DAR-ES-SALAAM' || radius < 3) {
      return [];
    }

    return [
      {
        type: 'event',
        severity: 'medium',
        location,
        description: 'High courier activity near central Dar es Salaam routes',
        estimatedDelay: 12,
        startTime: new Date(Date.now() - 30 * 60 * 1000)
      }
    ];
  }

  async calculateRouteWithTraffic(origin: GeoPoint, destination: GeoPoint): Promise<{
    optimalRoute: GeoPoint[];
    estimatedTime: number;
    trafficDelay: number;
    confidence: number;
  }> {
    const traffic = this.buildTraffic(origin, destination);
    return {
      optimalRoute: [origin, destination],
      estimatedTime: traffic.travelTime,
      trafficDelay: Math.max(0, traffic.travelTime - (traffic.averageSpeed > 0 ? Math.round((origin.distanceTo(destination) / traffic.averageSpeed) * 60) : 0)),
      confidence: traffic.confidence / 100
    };
  }

  private buildTraffic(origin: GeoPoint, destination: GeoPoint): TrafficData {
    const originLocality = getLocalitySummary(origin);
    const destinationLocality = getLocalitySummary(destination);
    const distanceKm = origin.distanceTo(destination);
    const isDarEsSalaam = originLocality.regionName === 'DAR-ES-SALAAM' || destinationLocality.regionName === 'DAR-ES-SALAAM';
    const isCrossRegion = originLocality.regionName !== destinationLocality.regionName;

    let congestionLevel = isDarEsSalaam ? 52 : 30;
    if (isCrossRegion) {
      congestionLevel += 12;
    }
    if (distanceKm > 20) {
      congestionLevel += 8;
    }
    if (distanceKm < 3) {
      congestionLevel -= 5;
    }

    congestionLevel = clamp(congestionLevel, 0, 100);
    const averageSpeed = clamp(isDarEsSalaam ? 24 : 34 - Math.min(8, distanceKm / 10), 15, 45);
    const travelTime = Math.max(1, Math.round((distanceKm / averageSpeed) * 60 * (1 + congestionLevel / 120)));
    const roadConditions: TrafficData['roadConditions'] = congestionLevel > 70 ? 'poor' : congestionLevel > 40 ? 'fair' : 'good';

    return {
      congestionLevel,
      averageSpeed,
      travelTime,
      incidents: congestionLevel > 60 ? this.buildIncidents(origin, destination) : [],
      roadConditions,
      confidence: clamp(100 - congestionLevel * 0.35, 55, 96)
    };
  }

  private buildIncidents(origin: GeoPoint, destination: GeoPoint): TrafficIncident[] {
    return [
      {
        type: 'construction',
        severity: 'medium',
        location: origin.distanceTo(destination) > 15 ? destination : origin,
        description: 'Local congestion hotspot from district-level traffic pressure',
        estimatedDelay: 10,
        startTime: new Date(Date.now() - 45 * 60 * 1000)
      }
    ];
  }
}
