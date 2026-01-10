import { Route } from '../entities/route.entity';
import { RouteStatus } from '../enums/route-status.enum';
import { RouteProgress } from '../value-objects/route-progress.value-object';
import { GeoPoint } from '../value-objects/geopoint.value-object';
import { Weight } from '../value-objects/weight.value-object';
import { CourierEntity } from '../entities/courier.entity';
import { RouteOptimizationPort } from '../engines/ports/route-optimization.port';
import { DistanceCalculationAlgorithm } from '../algorithms/distance-calculation.algorithm';

export interface DeliveryForRoute {
  id: string;
  pickupLocation: GeoPoint;
  deliveryLocation: GeoPoint;
  weight: Weight;
  priority: 'standard' | 'express' | 'urgent';
  timeWindow?: {
    earliest: Date;
    latest: Date;
  };
}

export interface RouteCreationConstraints {
  maxDeliveriesPerRoute?: number;
  maxRouteDurationHours?: number;
  maxTotalWeightKg?: number;
  optimizationPreference?: 'fastest' | 'shortest' | 'balanced';
}

export interface RouteCreationResult {
  route: Route;
  assignedDeliveries: DeliveryForRoute[];
  optimizationScore: number;
  estimatedSavings: {
    timeMinutes: number;
    distanceKm: number;
    fuelLiters: number;
  };
}

/**
 * Route Creation Service - Domain Service
 *
 * Business Logic for Route Creation:
 * - Courier capacity validation
 * - Multi-stop route optimization
 * - Delivery sequencing algorithms
 * - Time window constraints
 * - Weight and volume limits
 */
export class RouteCreationService {
  constructor(
    private routeOptimizationPort: RouteOptimizationPort,
    private distanceAlgorithm: DistanceCalculationAlgorithm
  ) {}

  /**
   * Create optimized route for courier with assigned deliveries
   */
  async createRouteForCourier(
    courier: CourierEntity,
    deliveries: DeliveryForRoute[],
    constraints: RouteCreationConstraints = {}
  ): Promise<RouteCreationResult> {
    // Apply business rules for route creation
    const validDeliveries = this.validateDeliveriesForCourier(courier, deliveries, constraints);

    if (validDeliveries.length === 0) {
      throw new Error('No deliveries can be assigned to this courier under current constraints');
    }

    // Optimize delivery sequence using route optimization
    const optimizedSequence = await this.optimizeDeliverySequence(
      courier,
      validDeliveries,
      constraints.optimizationPreference || 'balanced'
    );

    // Calculate route metrics
    const routeMetrics = await this.calculateRouteMetrics(courier, optimizedSequence);

    // Create route entity
    const routeId = this.generateRouteId(courier.id);
    const waypoints = this.buildWaypoints(courier, optimizedSequence);

    const initialProgress = RouteProgress.create(
      0, // completed stops
      waypoints.length, // total stops
      courier.currentLocation, // current location
      new Date(), // last update time
      undefined, // estimated completion time (calculated later)
      `Route created for courier ${courier.name}`
    );

    const route = Route.create({
      id: routeId,
      courierId: courier.id,
      status: RouteStatus.PLANNED,
      totalDistance: routeMetrics.totalDistance,
      estimatedDuration: routeMetrics.estimatedDuration,
      waypoints,
      progress: initialProgress,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Calculate optimization savings
    const baselineMetrics = this.calculateBaselineMetrics(courier, validDeliveries);
    const estimatedSavings = {
      timeMinutes: Math.max(0, baselineMetrics.estimatedDuration - routeMetrics.estimatedDuration),
      distanceKm: Math.max(0, baselineMetrics.totalDistance - routeMetrics.totalDistance),
      fuelLiters: Math.max(0, (baselineMetrics.totalDistance - routeMetrics.totalDistance) * 0.08) // 8L per 100km average
    };

    const optimizationScore = this.calculateOptimizationScore(routeMetrics, baselineMetrics);

    return {
      route,
      assignedDeliveries: optimizedSequence,
      optimizationScore,
      estimatedSavings
    };
  }

  /**
   * Create route for single delivery (simplified case)
   */
  async createRouteForSingleDelivery(
    courier: CourierEntity,
    delivery: DeliveryForRoute
  ): Promise<RouteCreationResult> {
    return this.createRouteForCourier(courier, [delivery]);
  }

  /**
   * Validate which deliveries can be assigned to a courier
   */
  private validateDeliveriesForCourier(
    courier: CourierEntity,
    deliveries: DeliveryForRoute[],
    constraints: RouteCreationConstraints
  ): DeliveryForRoute[] {
    const maxDeliveries = constraints.maxDeliveriesPerRoute || 5;
    const maxWeightKg = constraints.maxTotalWeightKg || courier.vehicle.capacity.maxWeight;
    const maxDurationHours = constraints.maxRouteDurationHours || 6;

    let totalWeight = 0;
    let totalEstimatedTime = 0;
    const validDeliveries: DeliveryForRoute[] = [];

    for (const delivery of deliveries) {
      // Check delivery limit
      if (validDeliveries.length >= maxDeliveries) break;

      // Check weight capacity
      if (totalWeight + delivery.weight.getValue() > maxWeightKg) continue;

      // Check time constraints
      const deliveryTimeEstimate = this.estimateDeliveryTime(courier, delivery);
      if (totalEstimatedTime + deliveryTimeEstimate > maxDurationHours * 60) continue;

      // Check time windows if specified
      if (delivery.timeWindow && !this.isTimeWindowCompatible(delivery.timeWindow)) continue;

      validDeliveries.push(delivery);
      totalWeight += delivery.weight.getValue();
      totalEstimatedTime += deliveryTimeEstimate;
    }

    return validDeliveries;
  }

  /**
   * Optimize the sequence of deliveries for minimum time/distance
   */
  private async optimizeDeliverySequence(
    courier: CourierEntity,
    deliveries: DeliveryForRoute[],
    preference: 'fastest' | 'shortest' | 'balanced'
  ): Promise<DeliveryForRoute[]> {
    if (deliveries.length <= 1) return deliveries;

    try {
      // Convert deliveries to waypoints for route optimization
      const waypoints = deliveries.map(d => d.pickupLocation);

      // Get optimized route from external service
      const optimizedRoute = await this.routeOptimizationPort.calculateMultiStopRoute(
        waypoints,
        {
          priority: preference === 'balanced' ? 'fastest' : preference,
          avoidHighways: false,
          avoidTolls: false, // Business decision: prioritize speed over cost
          vehicleType: courier.vehicle.type
        }
      );

      // Reorder deliveries based on optimized waypoint sequence
      const orderedDeliveries: DeliveryForRoute[] = [];
      for (const waypoint of optimizedRoute.waypoints) {
        const matchingDelivery = deliveries.find(d =>
          d.pickupLocation.getCoordinates().lat === waypoint.getCoordinates().lat &&
          d.pickupLocation.getCoordinates().lng === waypoint.getCoordinates().lng
        );
        if (matchingDelivery) {
          orderedDeliveries.push(matchingDelivery);
        }
      }

      return orderedDeliveries;

    } catch (error) {
      console.warn('Route optimization failed, using fallback sequencing:', error);
      // Fallback: sort by distance from courier's current location
      return this.fallbackDeliverySequencing(courier, deliveries);
    }
  }

  /**
   * Fallback delivery sequencing when optimization service fails
   */
  private fallbackDeliverySequencing(
    courier: CourierEntity,
    deliveries: DeliveryForRoute[]
  ): DeliveryForRoute[] {
    const courierLocation = courier.currentLocation;

    return deliveries.sort((a, b) => {
      const distanceA = courierLocation.distanceTo(a.pickupLocation);
      const distanceB = courierLocation.distanceTo(b.pickupLocation);
      return distanceA - distanceB;
    });
  }

  /**
   * Calculate comprehensive route metrics
   */
  private async calculateRouteMetrics(
    courier: CourierEntity,
    deliveries: DeliveryForRoute[]
  ): Promise<{
    totalDistance: number;
    estimatedDuration: number;
    waypoints: GeoPoint[];
  }> {
    const waypoints = this.buildWaypoints(courier, deliveries);

    if (waypoints.length <= 1) {
      return {
        totalDistance: 0,
        estimatedDuration: 0,
        waypoints
      };
    }

    try {
      // Use route optimization service for accurate metrics
      const routeResult = await this.routeOptimizationPort.calculateMultiStopRoute(
        waypoints,
        { priority: 'fastest' }
      );

      return {
        totalDistance: routeResult.totalDistance,
        estimatedDuration: routeResult.totalDuration,
        waypoints: routeResult.waypoints
      };

    } catch (error) {
      console.warn('Route metrics calculation failed, using approximations:', error);
      // Fallback calculation
      return this.approximateRouteMetrics(courier, deliveries);
    }
  }

  /**
   * Approximate route metrics when optimization service unavailable
   */
  private approximateRouteMetrics(
    courier: CourierEntity,
    deliveries: DeliveryForRoute[]
  ): { totalDistance: number; estimatedDuration: number; waypoints: GeoPoint[] } {
    const waypoints = this.buildWaypoints(courier, deliveries);
    let totalDistance = 0;
    let estimatedDuration = 0;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const segmentDistance = waypoints[i].distanceTo(waypoints[i + 1]);
      totalDistance += segmentDistance;

      // Estimate time based on distance and courier experience
      const baseSpeed = 25; // km/h average urban speed
      const experienceMultiplier = courier.trafficExperience > 0.8 ? 1.2 : 0.9;
      const segmentTime = (segmentDistance / baseSpeed) * 60 * experienceMultiplier; // minutes
      estimatedDuration += segmentTime;

      // Add stop time for each delivery
      if (i > 0) { // Skip courier starting point
        estimatedDuration += 5; // 5 minutes per stop
      }
    }

    return {
      totalDistance,
      estimatedDuration: Math.round(estimatedDuration),
      waypoints
    };
  }

  /**
   * Build complete waypoint sequence including courier start location
   */
  private buildWaypoints(courier: CourierEntity, deliveries: DeliveryForRoute[]): GeoPoint[] {
    const waypoints: GeoPoint[] = [courier.currentLocation];

    // Add pickup and delivery points for each delivery
    for (const delivery of deliveries) {
      waypoints.push(delivery.pickupLocation);
      waypoints.push(delivery.deliveryLocation);
    }

    return waypoints;
  }

  /**
   * Calculate baseline metrics for comparison (unoptimized route)
   */
  private calculateBaselineMetrics(
    courier: CourierEntity,
    deliveries: DeliveryForRoute[]
  ): { totalDistance: number; estimatedDuration: number } {
    // Simple baseline: courier to each pickup then to each delivery
    const courierLocation = courier.currentLocation;
    let totalDistance = 0;
    let estimatedDuration = 0;

    for (const delivery of deliveries) {
      // To pickup
      const toPickupDistance = courierLocation.distanceTo(delivery.pickupLocation);
      totalDistance += toPickupDistance;
      estimatedDuration += (toPickupDistance / 25) * 60; // 25 km/h average

      // At pickup (loading time)
      estimatedDuration += 3;

      // To delivery
      const toDeliveryDistance = delivery.pickupLocation.distanceTo(delivery.deliveryLocation);
      totalDistance += toDeliveryDistance;
      estimatedDuration += (toDeliveryDistance / 25) * 60;

      // At delivery (unloading time)
      estimatedDuration += 5;
    }

    return {
      totalDistance,
      estimatedDuration: Math.round(estimatedDuration)
    };
  }

  /**
   * Calculate optimization score (0-100)
   */
  private calculateOptimizationScore(
    optimized: { totalDistance: number; estimatedDuration: number },
    baseline: { totalDistance: number; estimatedDuration: number }
  ): number {
    const timeImprovement = Math.max(0, baseline.estimatedDuration - optimized.estimatedDuration);
    const distanceImprovement = Math.max(0, baseline.totalDistance - optimized.totalDistance);

    // Weighted score: time is more valuable than distance
    const timeScore = Math.min(50, (timeImprovement / baseline.estimatedDuration) * 50);
    const distanceScore = Math.min(50, (distanceImprovement / baseline.totalDistance) * 50);

    return Math.round(timeScore + distanceScore);
  }

  /**
   * Estimate time for single delivery
   */
  private estimateDeliveryTime(courier: CourierEntity, delivery: DeliveryForRoute): number {
    const pickupToDelivery = delivery.pickupLocation.distanceTo(delivery.deliveryLocation);
    const speed = 25; // km/h average urban speed
    const travelTime = (pickupToDelivery / speed) * 60; // minutes
    const stopTime = 8; // loading + unloading

    // Adjust for courier experience and priority
    const experienceMultiplier = courier.trafficExperience > 0.8 ? 0.9 : 1.1;
    const priorityMultiplier = delivery.priority === 'urgent' ? 1.2 : delivery.priority === 'express' ? 1.1 : 1.0;

    return Math.round((travelTime + stopTime) * experienceMultiplier * priorityMultiplier);
  }

  /**
   * Check if delivery time window is compatible with current time
   */
  private isTimeWindowCompatible(timeWindow: { earliest: Date; latest: Date }): boolean {
    const now = new Date();
    const bufferHours = 2; // 2 hour buffer for scheduling

    const earliestWithBuffer = new Date(timeWindow.earliest.getTime() - (bufferHours * 60 * 60 * 1000));
    const latestWithBuffer = new Date(timeWindow.latest.getTime() + (bufferHours * 60 * 60 * 1000));

    return now >= earliestWithBuffer && now <= latestWithBuffer;
  }

  /**
   * Generate unique route ID
   */
  private generateRouteId(courierId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `route_${courierId}_${timestamp}_${random}`;
  }
}
