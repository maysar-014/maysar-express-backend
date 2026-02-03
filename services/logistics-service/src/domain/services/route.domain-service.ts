import { DeliveryEntity } from '../entities/delivery.entity';
import { GeoPoint } from '../value-objects/geopoint.value-object';

export interface RouteStop {
  deliveryId: string;
  location: GeoPoint;
  type: 'pickup' | 'delivery';
  estimatedArrival: Date;
  timeWindow?: {
    start: Date;
    end: Date;
  };
  priority: number;
}

export interface OptimizedRoute {
  id: string;
  stops: RouteStop[];
  totalDistance: number;
  estimatedDuration: number;
  startLocation: GeoPoint;
  endLocation?: GeoPoint;
  optimizationScore: number;
}

export class RouteDomainService {
  /**
   * Optimize route for multiple deliveries using advanced algorithms
   */
  public optimizeRoute(
    deliveries: DeliveryEntity[],
    startLocation: GeoPoint,
    endLocation?: GeoPoint,
    constraints?: {
      maxDistance?: number;
      maxDuration?: number;
      vehicleCapacity?: number;
    }
  ): OptimizedRoute {
    // Create stops from deliveries
    const stops = this.createStopsFromDeliveries(deliveries);
    
    // Apply optimization algorithm
    const optimizedStops = this.applyOptimizationAlgorithm(stops, startLocation, endLocation, constraints);
    
    // Calculate route metrics
    const totalDistance = this.calculateTotalDistance(optimizedStops, startLocation, endLocation);
    const estimatedDuration = this.calculateEstimatedDuration(optimizedStops, totalDistance);
    const optimizationScore = this.calculateOptimizationScore(optimizedStops, totalDistance, estimatedDuration);

    return {
      id: this.generateRouteId(),
      stops: optimizedStops,
      totalDistance,
      estimatedDuration,
      startLocation,
      endLocation,
      optimizationScore,
    };
  }

  /**
   * Validate route feasibility and constraints
   */
  public validateRoute(route: OptimizedRoute, constraints?: {
    maxDistance?: number;
    maxDuration?: number;
    workingHours?: { start: number; end: number };
  }): {
    isValid: boolean;
    violations: string[];
    suggestions: string[];
  } {
    const violations: string[] = [];
    const suggestions: string[] = [];

    // Check distance constraints
    if (constraints?.maxDistance && route.totalDistance > constraints.maxDistance) {
      violations.push(`Route distance (${route.totalDistance.toFixed(1)}km) exceeds maximum (${constraints.maxDistance}km)`);
      suggestions.push('Consider splitting the route or removing some deliveries');
    }

    // Check duration constraints
    if (constraints?.maxDuration && route.estimatedDuration > constraints.maxDuration) {
      violations.push(`Route duration (${route.estimatedDuration.toFixed(1)}h) exceeds maximum (${constraints.maxDuration}h)`);
      suggestions.push('Optimize stop sequence or reduce number of deliveries');
    }

    // Check time window violations
    const timeWindowViolations = this.checkTimeWindowViolations(route.stops);
    violations.push(...timeWindowViolations);

    // Check working hours if specified
    if (constraints?.workingHours) {
      const workingHourViolations = this.checkWorkingHourViolations(route.stops, constraints.workingHours);
      violations.push(...workingHourViolations);
    }

    // Provide optimization suggestions
    if (route.optimizationScore < 70) {
      suggestions.push('Route optimization score is low - consider reordering stops');
    }

    return {
      isValid: violations.length === 0,
      violations,
      suggestions,
    };
  }

  /**
   * Calculate route efficiency metrics
   */
  public calculateRouteEfficiency(route: OptimizedRoute): {
    distanceEfficiency: number;
    timeEfficiency: number;
    priorityScore: number;
    overallEfficiency: number;
  } {
    // Calculate distance efficiency (compared to direct routes)
    const directDistance = this.calculateDirectDistance(route.stops);
    const distanceEfficiency = Math.max(0, 100 - ((route.totalDistance - directDistance) / directDistance * 100));

    // Calculate time efficiency (based on optimal time windows)
    const timeEfficiency = this.calculateTimeEfficiency(route.stops);

    // Calculate priority score (how well high-priority deliveries are handled)
    const priorityScore = this.calculatePriorityScore(route.stops);

    // Overall efficiency (weighted average)
    const overallEfficiency = (
      distanceEfficiency * 0.4 +
      timeEfficiency * 0.35 +
      priorityScore * 0.25
    );

    return {
      distanceEfficiency: Math.round(distanceEfficiency),
      timeEfficiency: Math.round(timeEfficiency),
      priorityScore: Math.round(priorityScore),
      overallEfficiency: Math.round(overallEfficiency),
    };
  }

  /**
   * Update route progress and recalculate remaining stops
   */
  public updateRouteProgress(
    route: OptimizedRoute,
    currentLocation: GeoPoint,
    completedStops: string[]
  ): {
    updatedRoute: OptimizedRoute;
    nextStop?: RouteStop;
    estimatedCompletion: Date;
    remainingDistance: number;
  } {
    // Filter out completed stops
    const remainingStops = route.stops.filter(stop => !completedStops.includes(stop.deliveryId));
    
    // Recalculate distances and times from current location
    const updatedStops = this.recalculateStopsFromLocation(remainingStops, currentLocation);
    
    const remainingDistance = this.calculateRemainingDistance(updatedStops, currentLocation);
    const estimatedCompletion = this.calculateEstimatedCompletion(updatedStops);
    
    const updatedRoute: OptimizedRoute = {
      ...route,
      stops: updatedStops,
      totalDistance: remainingDistance,
      estimatedDuration: this.calculateEstimatedDuration(updatedStops, remainingDistance),
    };

    return {
      updatedRoute,
      nextStop: updatedStops[0],
      estimatedCompletion,
      remainingDistance,
    };
  }

  /**
   * Find alternative routes in case of traffic or other issues
   */
  public findAlternativeRoutes(
    originalRoute: OptimizedRoute,
    avoidLocations: GeoPoint[] = [],
    trafficData?: any
  ): OptimizedRoute[] {
    const alternatives: OptimizedRoute[] = [];
    
    // Generate alternative route by reordering stops
    const reorderedRoute = this.generateReorderedRoute(originalRoute);
    if (reorderedRoute) alternatives.push(reorderedRoute);
    
    // Generate route avoiding traffic areas
    if (trafficData) {
      const trafficAvoidingRoute = this.generateTrafficAvoidingRoute(originalRoute, trafficData);
      if (trafficAvoidingRoute) alternatives.push(trafficAvoidingRoute);
    }
    
    // Generate route avoiding specific locations
    if (avoidLocations.length > 0) {
      const avoidingRoute = this.generateLocationAvoidingRoute(originalRoute, avoidLocations);
      if (avoidingRoute) alternatives.push(avoidingRoute);
    }

    // Sort alternatives by optimization score
    return alternatives.sort((a, b) => b.optimizationScore - a.optimizationScore);
  }

  private createStopsFromDeliveries(deliveries: DeliveryEntity[]): RouteStop[] {
    const stops: RouteStop[] = [];

    deliveries.forEach(delivery => {
      // Add pickup stop
      stops.push({
        deliveryId: delivery.id,
        location: GeoPoint.fromCoordinates(
          delivery.pickupAddress.coordinates?.lat || 0,
          delivery.pickupAddress.coordinates?.lng || 0,
          `${delivery.pickupAddress.street}, ${delivery.pickupAddress.city}, ${delivery.pickupAddress.region}`
        ),
        type: 'pickup',
        estimatedArrival: new Date(delivery.createdAt),
        timeWindow: undefined, // DeliveryEntity doesn't have timeWindow
        priority: 5, // Default priority since DeliveryEntity doesn't have priority
      });

      // Add delivery stop
      stops.push({
        deliveryId: delivery.id,
        location: GeoPoint.fromCoordinates(
          delivery.deliveryAddress.coordinates?.lat || 0,
          delivery.deliveryAddress.coordinates?.lng || 0,
          `${delivery.deliveryAddress.street}, ${delivery.deliveryAddress.city}, ${delivery.deliveryAddress.region}`
        ),
        type: 'delivery',
        estimatedArrival: new Date(delivery.estimatedDeliveryTime || delivery.createdAt),
        timeWindow: undefined, // DeliveryEntity doesn't have timeWindow
        priority: 5, // Default priority since DeliveryEntity doesn't have priority
      });
    });

    return stops;
  }

  private applyOptimizationAlgorithm(
    stops: RouteStop[],
    startLocation: GeoPoint,
    endLocation?: GeoPoint,
    constraints?: any
  ): RouteStop[] {
    // Implement nearest neighbor algorithm with priority weighting
    const optimizedStops: RouteStop[] = [];
    const remainingStops = [...stops];
    let currentLocation = startLocation;

    while (remainingStops.length > 0) {
      let bestStop: RouteStop | null = null;
      let bestScore = -1;

      for (const stop of remainingStops) {
        const distance = currentLocation.distanceTo(stop.location);
        const priorityWeight = stop.priority / 10;
        const timeWindowWeight = this.calculateTimeWindowWeight(stop);
        
        // Combined score considering distance, priority, and time windows
        const score = (1 / (distance + 1)) * priorityWeight * timeWindowWeight;
        
        if (score > bestScore) {
          bestScore = score;
          bestStop = stop;
        }
      }

      if (bestStop) {
        optimizedStops.push(bestStop);
        remainingStops.splice(remainingStops.indexOf(bestStop), 1);
        currentLocation = bestStop.location;
      }
    }

    return optimizedStops;
  }

  private calculateTotalDistance(stops: RouteStop[], startLocation: GeoPoint, endLocation?: GeoPoint): number {
    let totalDistance = 0;
    let currentLocation = startLocation;

    for (const stop of stops) {
      totalDistance += currentLocation.distanceTo(stop.location);
      currentLocation = stop.location;
    }

    if (endLocation) {
      totalDistance += currentLocation.distanceTo(endLocation);
    }

    return totalDistance;
  }

  private calculateEstimatedDuration(stops: RouteStop[], totalDistance: number): number {
    const averageSpeed = 25; // km/h in urban areas
    const stopTime = 0.25; // 15 minutes per stop
    
    return (totalDistance / averageSpeed) + (stops.length * stopTime);
  }

  private calculateOptimizationScore(stops: RouteStop[], totalDistance: number, estimatedDuration: number): number {
    // Score based on efficiency metrics
    const distanceScore = Math.max(0, 100 - (totalDistance / stops.length * 2));
    const timeScore = Math.max(0, 100 - (estimatedDuration / stops.length * 10));
    const priorityScore = this.calculatePriorityScore(stops);
    
    return (distanceScore + timeScore + priorityScore) / 3;
  }

  private generateRouteId(): string {
    return `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPriorityScore(priority: string): number {
    const scores = { urgent: 10, express: 7, standard: 5 };
    return scores[priority as keyof typeof scores] || 5;
  }

  private calculateTimeWindowWeight(stop: RouteStop): number {
    if (!stop.timeWindow) return 1;
    
    const now = new Date();
    const windowStart = stop.timeWindow.start;
    const windowEnd = stop.timeWindow.end;
    
    if (now >= windowStart && now <= windowEnd) return 2; // In window
    if (now < windowStart) return 1.5; // Before window
    return 0.5; // After window
  }

  private checkTimeWindowViolations(stops: RouteStop[]): string[] {
    const violations: string[] = [];
    let currentTime = new Date();
    
    for (const stop of stops) {
      if (stop.timeWindow && currentTime > stop.timeWindow.end) {
        violations.push(`Stop ${stop.deliveryId} violates time window constraint`);
      }
      currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000); // Add 15 minutes per stop
    }
    
    return violations;
  }

  private checkWorkingHourViolations(stops: RouteStop[], workingHours: { start: number; end: number }): string[] {
    const violations: string[] = [];
    
    for (const stop of stops) {
      const hour = stop.estimatedArrival.getHours();
      if (hour < workingHours.start || hour > workingHours.end) {
        violations.push(`Stop ${stop.deliveryId} is outside working hours`);
      }
    }
    
    return violations;
  }

  private calculateDirectDistance(stops: RouteStop[]): number {
    // Calculate sum of direct distances between consecutive stops
    let totalDirect = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      totalDirect += stops[i].location.distanceTo(stops[i + 1].location);
    }
    return totalDirect;
  }

  private calculateTimeEfficiency(stops: RouteStop[]): number {
    // Calculate how well the route respects time windows
    let score = 100;
    let currentTime = new Date();
    
    for (const stop of stops) {
      if (stop.timeWindow) {
        if (currentTime > stop.timeWindow.end) {
          score -= 20; // Penalty for missing time window
        } else if (currentTime < stop.timeWindow.start) {
          score -= 5; // Small penalty for being early
        }
      }
      currentTime = new Date(currentTime.getTime() + 15 * 60 * 1000);
    }
    
    return Math.max(0, score);
  }

  private calculatePriorityScore(stops: RouteStop[]): number {
    // Calculate how well high-priority stops are positioned early in route
    let score = 0;
    const totalStops = stops.length;
    
    stops.forEach((stop, index) => {
      const positionScore = (totalStops - index) / totalStops * 100;
      const priorityWeight = stop.priority / 10;
      score += positionScore * priorityWeight;
    });
    
    return score / totalStops;
  }

  private recalculateStopsFromLocation(stops: RouteStop[], currentLocation: GeoPoint): RouteStop[] {
    // Update estimated arrival times based on current location
    let estimatedTime = new Date();
    let location = currentLocation;
    
    return stops.map(stop => {
      const distance = location.distanceTo(stop.location);
      const travelTime = (distance / 25) * 60; // minutes at 25 km/h
      estimatedTime = new Date(estimatedTime.getTime() + travelTime * 60 * 1000);
      
      const updatedStop = { ...stop, estimatedArrival: new Date(estimatedTime) };
      location = stop.location;
      estimatedTime = new Date(estimatedTime.getTime() + 15 * 60 * 1000); // 15 min stop time
      
      return updatedStop;
    });
  }

  private calculateRemainingDistance(stops: RouteStop[], currentLocation: GeoPoint): number {
    if (stops.length === 0) return 0;
    
    let distance = currentLocation.distanceTo(stops[0].location);
    for (let i = 0; i < stops.length - 1; i++) {
      distance += stops[i].location.distanceTo(stops[i + 1].location);
    }
    
    return distance;
  }

  private calculateEstimatedCompletion(stops: RouteStop[]): Date {
    if (stops.length === 0) return new Date();
    
    const lastStop = stops[stops.length - 1];
    return new Date(lastStop.estimatedArrival.getTime() + 15 * 60 * 1000); // Add 15 minutes for last stop
  }

  private generateReorderedRoute(originalRoute: OptimizedRoute): OptimizedRoute | null {
    // Simple reordering by reversing the route
    const reorderedStops = [...originalRoute.stops].reverse();
    
    return {
      ...originalRoute,
      id: this.generateRouteId(),
      stops: reorderedStops,
      optimizationScore: originalRoute.optimizationScore * 0.9, // Slightly lower score
    };
  }

  private generateTrafficAvoidingRoute(originalRoute: OptimizedRoute, trafficData: any): OptimizedRoute | null {
    // Simplified implementation - in reality, this would use real traffic data
    return {
      ...originalRoute,
      id: this.generateRouteId(),
      totalDistance: originalRoute.totalDistance * 1.1, // Slightly longer to avoid traffic
      estimatedDuration: originalRoute.estimatedDuration * 0.9, // But faster due to less traffic
      optimizationScore: originalRoute.optimizationScore * 1.1,
    };
  }

  private generateLocationAvoidingRoute(originalRoute: OptimizedRoute, avoidLocations: GeoPoint[]): OptimizedRoute | null {
    // Filter out stops near avoid locations
    const filteredStops = originalRoute.stops.filter(stop => 
      !avoidLocations.some(avoid => stop.location.distanceTo(avoid) < 1) // 1km threshold
    );
    
    if (filteredStops.length === originalRoute.stops.length) return null;
    
    return {
      ...originalRoute,
      id: this.generateRouteId(),
      stops: filteredStops,
      totalDistance: this.calculateTotalDistance(filteredStops, originalRoute.startLocation, originalRoute.endLocation),
      optimizationScore: originalRoute.optimizationScore * 0.8,
    };
  }
}
