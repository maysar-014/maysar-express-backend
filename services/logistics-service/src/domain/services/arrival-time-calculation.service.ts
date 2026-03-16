import { GeoPoint } from '../value-objects/geopoint.value-object';
import { RouteDomainService } from './route.domain-service';

export interface ArrivalTimeFactors {
  distance: number; // in kilometers
  trafficMultiplier: number; // 1.0 = normal, 1.5 = heavy traffic, etc.
  weatherMultiplier: number; // 1.0 = clear, 1.2 = rain, 1.5 = snow, etc.
  timeOfDayMultiplier: number; // peak hours have higher multiplier
}

export interface EstimatedArrivalResult {
  estimatedMinutes: number;
  distanceKm: number;
  factors: ArrivalTimeFactors;
  confidence: number; // 0-100, how confident we are in this estimate
}

export class ArrivalTimeCalculationService {
  constructor(
    private routeService: RouteDomainService,
    private trafficProvider?: any,
    private weatherProvider?: any
  ) {}

  /**
   * Calculate estimated arrival time from courier's current location to destination
   */
  async calculateEstimatedArrivalTime(
    courierLocation: GeoPoint,
    destination: GeoPoint,
    vehicleType: string,
    currentTime: Date = new Date()
  ): Promise<EstimatedArrivalResult> {
    // Calculate base distance and travel time
    const distance = courierLocation.distanceTo(destination);
    const baseSpeed = this.getVehicleSpeed(vehicleType);
    const baseTravelTime = (distance / baseSpeed) * 60; // convert hours to minutes

    // Get traffic multiplier
    const trafficMultiplier = await this.getTrafficMultiplier(courierLocation, destination, currentTime);

    // Get weather multiplier
    const weatherMultiplier = await this.getWeatherMultiplier(courierLocation, currentTime);

    // Get time of day multiplier
    const timeOfDayMultiplier = this.getTimeOfDayMultiplier(currentTime);

    // Calculate total estimated time
    const estimatedMinutes = Math.ceil(
      baseTravelTime * trafficMultiplier * weatherMultiplier * timeOfDayMultiplier
    );

    // Calculate confidence based on data availability
    const confidence = this.calculateConfidence({
      hasTrafficData: this.trafficProvider !== undefined,
      hasWeatherData: this.weatherProvider !== undefined,
      distance
    });

    return {
      estimatedMinutes,
      distanceKm: distance,
      factors: {
        distance,
        trafficMultiplier,
        weatherMultiplier,
        timeOfDayMultiplier
      },
      confidence
    };
  }

  /**
   * Get average speed for different vehicle types (km/h)
   */
  private getVehicleSpeed(vehicleType: string): number {
    const speeds: Record<string, number> = {
      bicycle: 15,
      motorcycle: 35,
      scooter: 25,
      car: 30,
      van: 25,
      truck: 20
    };

    return speeds[vehicleType.toLowerCase()] || 25; // default to 25 km/h
  }

  /**
   * Get traffic multiplier based on current conditions
   */
  private async getTrafficMultiplier(
    from: GeoPoint,
    to: GeoPoint,
    currentTime: Date
  ): Promise<number> {
    if (!this.trafficProvider) {
      // Fallback: use time-based estimation
      return this.getTimeBasedTrafficMultiplier(currentTime);
    }

    try {
      const trafficData = await this.trafficProvider.getTrafficData(from, to, currentTime);
      return trafficData.multiplier || 1.0;
    } catch (error) {
      console.warn('Failed to get traffic data, using fallback:', error);
      return this.getTimeBasedTrafficMultiplier(currentTime);
    }
  }

  /**
   * Get weather multiplier based on current conditions
   */
  private async getWeatherMultiplier(location: GeoPoint, currentTime: Date): Promise<number> {
    if (!this.weatherProvider) {
      return 1.0; // no weather impact
    }

    try {
      const weatherData = await this.weatherProvider.getWeatherData(location, currentTime);

      // Basic weather impact calculation
      switch (weatherData.condition?.toLowerCase()) {
        case 'clear':
        case 'sunny':
          return 1.0;
        case 'cloudy':
        case 'overcast':
          return 1.05;
        case 'rain':
        case 'drizzle':
          return 1.15;
        case 'heavy rain':
        case 'storm':
          return 1.3;
        case 'snow':
        case 'sleet':
          return 1.5;
        case 'fog':
        case 'mist':
          return 1.2;
        default:
          return 1.0;
      }
    } catch (error) {
      console.warn('Failed to get weather data:', error);
      return 1.0;
    }
  }

  /**
   * Get time-of-day traffic multiplier
   */
  private getTimeOfDayMultiplier(currentTime: Date): number {
    const hour = currentTime.getHours();

    // Peak hours: 7-9 AM and 4-7 PM
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)) {
      return 1.3; // 30% slower during peak hours
    }

    // Off-peak night hours: 10 PM - 5 AM
    if (hour >= 22 || hour <= 5) {
      return 0.9; // 10% faster at night
    }

    // Normal hours
    return 1.0;
  }

  /**
   * Fallback traffic multiplier based on time of day
   */
  private getTimeBasedTrafficMultiplier(currentTime: Date): number {
    return this.getTimeOfDayMultiplier(currentTime);
  }

  /**
   * Calculate confidence in the estimate (0-100)
   */
  private calculateConfidence(factors: {
    hasTrafficData: boolean;
    hasWeatherData: boolean;
    distance: number;
  }): number {
    let confidence = 70; // base confidence

    if (factors.hasTrafficData) confidence += 15;
    if (factors.hasWeatherData) confidence += 10;

    // Distance affects confidence - shorter distances are more predictable
    if (factors.distance < 2) confidence += 10;
    else if (factors.distance > 20) confidence -= 15;

    return Math.min(100, Math.max(0, confidence));
  }

  /**
   * Calculate estimated arrival time for multiple destinations (useful for route optimization)
   */
  async calculateMultipleArrivalTimes(
    courierLocation: GeoPoint,
    destinations: GeoPoint[],
    vehicleType: string,
    currentTime: Date = new Date()
  ): Promise<EstimatedArrivalResult[]> {
    const results: EstimatedArrivalResult[] = [];

    for (const destination of destinations) {
      const result = await this.calculateEstimatedArrivalTime(
        courierLocation,
        destination,
        vehicleType,
        currentTime
      );
      results.push(result);

      // Update current time for next calculation (simulating sequential visits)
      currentTime = new Date(currentTime.getTime() + result.estimatedMinutes * 60 * 1000);
    }

    return results;
  }
}
