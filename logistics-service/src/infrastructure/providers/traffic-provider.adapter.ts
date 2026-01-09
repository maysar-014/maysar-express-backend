import { TrafficServicePort, TrafficData, TrafficIncident } from '../../domain/engines/ports/traffic.port';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

export class TrafficProviderAdapter implements TrafficServicePort {
  constructor(private apiKey?: string) {}

  async getTrafficData(origin: GeoPoint, destination: GeoPoint): Promise<TrafficData> {
    try {
      if (!this.apiKey) {
        console.warn('No Google Maps API key provided, using fallback data');
        return this.getFallbackTrafficData(origin, destination);
      }

      const originCoords = origin.getCoordinates();
      const destCoords = destination.getCoordinates();

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${originCoords.lat},${originCoords.lng}&destination=${destCoords.lat},${destCoords.lng}&departure_time=now&traffic_model=best_guess&key=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Traffic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        throw new Error(`Invalid traffic API response: ${data.status}`);
      }

      return this.parseGoogleMapsResponse(data);

    } catch (error) {
      console.error('Error fetching traffic data:', error);
      return this.getFallbackTrafficData(origin, destination);
    }
  }

  private parseGoogleMapsResponse(data: any): TrafficData {
    const route = data.routes[0];
    const leg = route.legs[0];

    // Calculate overall metrics
    const totalDistance = leg.distance.value / 1000; // km
    const totalDuration = leg.duration_in_traffic ?
      leg.duration_in_traffic.value / 60 : // minutes
      leg.duration.value / 60; // Without traffic fallback

    const averageSpeed = (totalDistance / totalDuration) * 60; // km/h
    const congestionLevel = this.calculateCongestionLevel({ duration: leg.duration, duration_in_traffic: leg.duration_in_traffic });

    return {
      congestionLevel,
      averageSpeed,
      travelTime: totalDuration,
      incidents: [], // Google Maps doesn't provide incident data in basic API
      roadConditions: this.determineRoadConditions(congestionLevel),
      confidence: 85 // Google Maps typically has high confidence
    };
  }

  private calculateCongestionLevel(step: any): number {
    if (!step.duration_in_traffic) return 0;

    const normalTime = step.duration.value;
    const trafficTime = step.duration_in_traffic.value;
    const delayRatio = (trafficTime - normalTime) / normalTime;

    return Math.min(100, delayRatio * 100); // Cap at 100%
  }

  private calculateOverallCongestion(segments: any[]): number {
    if (segments.length === 0) return 0;

    const avgCongestion = segments.reduce((sum, segment) =>
      sum + segment.congestionLevel, 0) / segments.length;

    return Math.round(avgCongestion);
  }

  private mapRoadType(instructions: string): 'highway' | 'main' | 'local' {
    const instruction = instructions.toLowerCase();
    if (instruction.includes('highway') || instruction.includes('expressway')) {
      return 'highway';
    } else if (instruction.includes('main') || instruction.includes('avenue') || instruction.includes('street')) {
      return 'main';
    }
    return 'local';
  }

  private getFallbackTrafficData(origin: GeoPoint, destination: GeoPoint): TrafficData {
    const originCoords = origin.getCoordinates();
    const destCoords = destination.getCoordinates();

    // Calculate base distance and time
    const distance = Math.sqrt(
      Math.pow(destCoords.lat - originCoords.lat, 2) +
      Math.pow(destCoords.lng - originCoords.lng, 2)
    ) * 111; // Rough km conversion

    const baseTime = distance / 40 * 60; // 40 km/h average speed in minutes

    // Simulate traffic conditions based on coordinates and time
    const now = new Date();
    const hour = now.getHours();

    // Rush hour traffic (7-9 AM, 5-7 PM)
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);

    // Simulate traffic congestion
    const congestionLevel = isRushHour ?
      Math.random() * 60 + 20 : // 20-80% congestion
      Math.random() * 20; // 0-20% congestion

    const actualTime = baseTime * (1 + congestionLevel / 100);

    return {
      congestionLevel,
      averageSpeed: (distance / actualTime) * 60, // km/h
      travelTime: actualTime,
      incidents: this.generateMockIncidents(distance),
      roadConditions: this.determineRoadConditions(congestionLevel),
      confidence: 75 // Lower confidence for fallback data
    };
  }

  private determineRoadConditions(congestionLevel: number): 'good' | 'fair' | 'poor' | 'closed' {
    if (congestionLevel < 20) return 'good';
    if (congestionLevel < 50) return 'fair';
    if (congestionLevel < 80) return 'poor';
    return 'closed';
  }

  async getRouteTraffic(route: GeoPoint[]): Promise<TrafficData[]> {
    try {
      const trafficData: TrafficData[] = [];

      // Get traffic data for each segment of the route
      for (let i = 0; i < route.length - 1; i++) {
        const origin = route[i];
        const destination = route[i + 1];

        const segmentTraffic = await this.getTrafficData(origin, destination);
        trafficData.push(segmentTraffic);
      }

      return trafficData;
    } catch (error) {
      console.error('Error getting route traffic:', error);
      // Return fallback traffic data for each segment
      return route.slice(0, -1).map(() =>
        this.getFallbackTrafficData(route[0], route[route.length - 1])
      );
    }
  }

  async getTrafficIncidents(location: GeoPoint, radius: number): Promise<TrafficIncident[]> {
    try {
      // In a real implementation, this would call a traffic incidents API
      // For now, return mock incidents within the specified radius

      if (!this.apiKey) {
        console.warn('No Google Maps API key provided, using mock incidents');
        return this.generateMockIncidents(radius);
      }

      // Google Maps Directions API doesn't provide incident data directly
      // In production, you'd integrate with a dedicated traffic incidents API
      // For now, return mock data
      return this.generateMockIncidents(radius);

    } catch (error) {
      console.error('Error getting traffic incidents:', error);
      return [];
    }
  }

  async calculateRouteWithTraffic(origin: GeoPoint, destination: GeoPoint): Promise<{
    optimalRoute: GeoPoint[];
    estimatedTime: number;
    trafficDelay: number;
    confidence: number;
  }> {
    try {
      // Get traffic data for the direct route
      const trafficData = await this.getTrafficData(origin, destination);

      // Calculate traffic delay (difference from free-flow conditions)
      const distance = Math.sqrt(
        Math.pow(destination.getCoordinates().lat - origin.getCoordinates().lat, 2) +
        Math.pow(destination.getCoordinates().lng - origin.getCoordinates().lng, 2)
      ) * 111; // Rough km conversion

      const freeFlowTime = distance / 50 * 60; // Assume 50 km/h free flow
      const trafficDelay = Math.max(0, trafficData.travelTime - freeFlowTime);

      return {
        optimalRoute: [origin, destination], // Simplified - direct route
        estimatedTime: trafficData.travelTime,
        trafficDelay,
        confidence: trafficData.confidence
      };

    } catch (error) {
      console.error('Error calculating route with traffic:', error);

      // Fallback calculation
      const distance = Math.sqrt(
        Math.pow(destination.getCoordinates().lat - origin.getCoordinates().lat, 2) +
        Math.pow(destination.getCoordinates().lng - origin.getCoordinates().lng, 2)
      ) * 111;

      const estimatedTime = distance / 40 * 60; // 40 km/h average

      return {
        optimalRoute: [origin, destination],
        estimatedTime,
        trafficDelay: 0,
        confidence: 50
      };
    }
  }

  private generateMockIncidents(radius: number): TrafficIncident[] {
    const incidents: TrafficIncident[] = [];
    const incidentCount = Math.random() > 0.8 ? Math.floor(Math.random() * 3) + 1 : 0;

    for (let i = 0; i < incidentCount; i++) {
      const delayMinutes = Math.floor(Math.random() * 15) + 5;
      const incidentTypes: ('accident' | 'construction' | 'roadwork' | 'closure' | 'event')[] =
        ['accident', 'construction', 'roadwork', 'closure', 'event'];

      incidents.push({
        type: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
        severity: (['low', 'medium', 'high'] as const)[Math.floor(Math.random() * 3)],
        location: GeoPoint.create(
          -6.8 + Math.random() * 0.4 - 0.2,
          39.2 + Math.random() * 0.4 - 0.2,
          'Incident Location'
        ),
        description: this.getIncidentDescription(incidents[incidents.length - 1]?.type || 'accident'),
        estimatedDelay: delayMinutes,
        startTime: new Date(Date.now() - Math.random() * 3600000) // Within last hour
      });
    }

    return incidents;
  }

  private getIncidentDescription(type: string): string {
    const descriptions = {
      accident: 'Vehicle accident blocking lane',
      construction: 'Road construction work in progress',
      roadwork: 'Road maintenance and repair',
      closure: 'Road temporarily closed',
      event: 'Special event causing traffic'
    };

    return descriptions[type as keyof typeof descriptions] || 'Traffic incident';
  }
}
