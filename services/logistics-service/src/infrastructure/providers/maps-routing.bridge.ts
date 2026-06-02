import { RouteOptimizationPort, OptimizedRoute, RouteConstraints, RouteSegment } from '../../domain/engines/ports/route-optimization.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { getLocalitySummary } from './local-tanzania-locations';

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export class MapsRoutingBridge implements RouteOptimizationPort {
  constructor(private readonly provider?: RouteOptimizationPort) {}

  async calculateOptimalRoute(origin: GeoPoint, destination: GeoPoint, constraints?: RouteConstraints): Promise<OptimizedRoute> {
    if (this.provider) {
      return this.provider.calculateOptimalRoute(origin, destination, constraints);
    }

    return this.buildRoute([origin, destination], constraints);
  }

  async calculateMultiStopRoute(waypoints: GeoPoint[], constraints?: RouteConstraints): Promise<OptimizedRoute> {
    if (this.provider) {
      return this.provider.calculateMultiStopRoute(waypoints, constraints);
    }

    return this.buildRoute(waypoints, constraints);
  }

  async getRouteAlternatives(origin: GeoPoint, destination: GeoPoint, count: number): Promise<OptimizedRoute[]> {
    if (this.provider) {
      return this.provider.getRouteAlternatives(origin, destination, count);
    }

    const requestedCount = Math.max(1, count);
    const priorities: Array<RouteConstraints['priority']> = ['fastest', 'shortest', 'safest'];
    const alternatives: OptimizedRoute[] = [];

    for (let index = 0; index < requestedCount; index++) {
      const priority = priorities[index % priorities.length];
      alternatives.push(await this.buildRoute([origin, destination], { priority }));
    }

    return alternatives;
  }

  async validateRoute(route: GeoPoint[]): Promise<{ isValid: boolean; issues: string[]; optimizedVersion?: OptimizedRoute; }> {
    if (this.provider) {
      return this.provider.validateRoute(route);
    }

    if (route.length < 2) {
      return {
        isValid: false,
        issues: ['Route must have at least 2 points']
      };
    }

    const invalidPoints = route.filter(point => {
      const coordinates = point.getCoordinates();
      return coordinates.lat < -90 || coordinates.lat > 90 || coordinates.lng < -180 || coordinates.lng > 180;
    });

    if (invalidPoints.length > 0) {
      return {
        isValid: false,
        issues: ['Invalid coordinates in route']
      };
    }

    return {
      isValid: true,
      issues: [],
      optimizedVersion: await this.buildRoute(route)
    };
  }

  private async buildRoute(waypoints: GeoPoint[], constraints?: RouteConstraints): Promise<OptimizedRoute> {
    if (waypoints.length < 2) {
      return {
        segments: [],
        totalDistance: 0,
        totalDuration: 0,
        waypoints,
        efficiency: 100,
        confidence: 1,
        alternatives: []
      };
    }

    const routeProfile = this.inferRouteProfile(waypoints, constraints);
    const segments: RouteSegment[] = [];
    let totalDistance = 0;
    let totalDuration = 0;

    for (let index = 0; index < waypoints.length - 1; index++) {
      const start = waypoints[index];
      const end = waypoints[index + 1];
      const straightDistance = start.distanceTo(end);
      const segmentDistance = straightDistance * routeProfile.distanceInflation;
      const segmentDuration = Math.max(1, Math.round((segmentDistance / routeProfile.averageSpeedKmh) * 60));
      const roadType = this.getRoadType(segmentDistance);
      const trafficLevel = this.getTrafficLevel(routeProfile, segmentDistance);

      totalDistance += segmentDistance;
      totalDuration += segmentDuration;

      segments.push({
        start,
        end,
        distance: Math.round(segmentDistance * 100) / 100,
        duration: segmentDuration,
        roadType,
        trafficLevel
      });
    }

    return {
      segments,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalDuration,
      waypoints,
      efficiency: this.calculateEfficiency(routeProfile),
      confidence: this.calculateConfidence(routeProfile),
      alternatives: [segments]
    };
  }

  private inferRouteProfile(waypoints: GeoPoint[], constraints?: RouteConstraints): {
    distanceInflation: number;
    averageSpeedKmh: number;
    locality: 'same_ward' | 'same_district' | 'same_region' | 'cross_region';
  } {
    const firstLocation = getLocalitySummary(waypoints[0]);
    const lastLocation = getLocalitySummary(waypoints[waypoints.length - 1]);

    let locality: 'same_ward' | 'same_district' | 'same_region' | 'cross_region' = 'cross_region';
    if (firstLocation.wardName && firstLocation.wardName === lastLocation.wardName) {
      locality = 'same_ward';
    } else if (firstLocation.districtName && firstLocation.districtName === lastLocation.districtName) {
      locality = 'same_district';
    } else if (firstLocation.regionName && firstLocation.regionName === lastLocation.regionName) {
      locality = 'same_region';
    }

    let distanceInflation = 1.28;
    let averageSpeedKmh = 32;

    switch (locality) {
      case 'same_ward':
        distanceInflation = 1.06;
        averageSpeedKmh = 24;
        break;
      case 'same_district':
        distanceInflation = 1.11;
        averageSpeedKmh = 26;
        break;
      case 'same_region':
        distanceInflation = 1.18;
        averageSpeedKmh = 30;
        break;
      case 'cross_region':
        distanceInflation = 1.3;
        averageSpeedKmh = 35;
        break;
    }

    if (firstLocation.regionName === 'DAR-ES-SALAAM' || lastLocation.regionName === 'DAR-ES-SALAAM') {
      distanceInflation += 0.04;
      averageSpeedKmh -= 4;
    }

    if (constraints?.priority === 'fastest') {
      averageSpeedKmh += 4;
      distanceInflation = Math.max(1.02, distanceInflation - 0.03);
    } else if (constraints?.priority === 'shortest') {
      distanceInflation = Math.max(1.02, distanceInflation - 0.02);
      averageSpeedKmh -= 1;
    } else if (constraints?.priority === 'safest') {
      averageSpeedKmh -= 2;
    }

    if (constraints?.avoidHighways) {
      averageSpeedKmh -= 1;
    }

    if (constraints?.avoidTolls) {
      distanceInflation = Math.max(1.02, distanceInflation - 0.01);
    }

    return {
      distanceInflation: clamp(distanceInflation, 1.02, 1.45),
      averageSpeedKmh: clamp(averageSpeedKmh, 18, 50),
      locality
    };
  }

  private getRoadType(distanceKm: number): RouteSegment['roadType'] {
    if (distanceKm < 1) {
      return 'alley';
    }
    if (distanceKm < 4) {
      return 'local_street';
    }
    if (distanceKm < 20) {
      return 'main_road';
    }
    return 'highway';
  }

  private getTrafficLevel(profile: { locality: string; averageSpeedKmh: number }, distanceKm: number): number {
    const localityPenalty = profile.locality === 'cross_region' ? 18 : profile.locality === 'same_region' ? 10 : 6;
    const distancePenalty = distanceKm > 20 ? 12 : distanceKm > 5 ? 8 : 4;
    return clamp(localityPenalty + distancePenalty + (profile.averageSpeedKmh < 28 ? 8 : 0), 0, 100);
  }

  private calculateEfficiency(profile: { locality: string; averageSpeedKmh: number }): number {
    const localityBonus = profile.locality === 'same_ward' ? 28 : profile.locality === 'same_district' ? 22 : profile.locality === 'same_region' ? 16 : 10;
    return clamp(55 + localityBonus + (profile.averageSpeedKmh > 30 ? 4 : 0), 0, 100);
  }

  private calculateConfidence(profile: { locality: string; averageSpeedKmh: number }): number {
    const localityConfidence = profile.locality === 'cross_region' ? 0.82 : profile.locality === 'same_region' ? 0.9 : 0.95;
    const speedFactor = profile.averageSpeedKmh / 40;
    return clamp(localityConfidence * speedFactor, 0.55, 0.97);
  }
}
