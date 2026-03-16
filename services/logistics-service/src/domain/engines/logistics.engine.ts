import { GeoPoint } from '../value-objects/geopoint.value-object';
import { Weight } from '../value-objects/weight.value-object';
import { TimeWindow } from '../value-objects/time-window.value-object';
import { Money } from '../value-objects/money.value-object';
import { getModelPrefix, makeId } from '@shared/ids/id';

export interface LogisticsInput {
  orderId: string;
  pickupLocation: GeoPoint;
  deliveryLocation: GeoPoint;
  orderWeight: Weight;
  orderVolume: number;
  itemCount: number;
  priority: 'standard' | 'express' | 'urgent';
  timeWindow?: TimeWindow;
  specialRequirements?: string[];
  maxDeliveryTime?: number; // hours
}

export interface LogisticsOutput {
  success: boolean;
  confidence: number; // 0-100%
  assignedCourier: CourierAssignment | null;
  route: OptimizedRoute | null;
  estimatedTimes: TimeEstimates | null;
  costs: CostBreakdown | null;
  riskFactors: RiskAssessment | null;
  alternatives: AlternativeOption[];
  error?: string;
}

export interface CourierAssignment {
  courierId: string;
  courierName: string;
  vehicleType: string;
  currentLocation: GeoPoint;
  rating: number;
  completionRate: number;
  estimatedArrival: Date;
}

export interface OptimizedRoute {
  totalDistance: number;
  totalDuration: number;
  waypoints: RouteWaypoint[];
  trafficFactor: number;
  weatherImpact: number;
  roadConditions: string;
}

export interface RouteWaypoint {
  location: GeoPoint;
  type: 'pickup' | 'delivery' | 'waypoint';
  estimatedArrival: Date;
  duration: number;
}

export interface TimeEstimates {
  pickupTime: Date;
  deliveryTime: Date;
  totalDuration: number;
  bufferTime: number;
}

export interface CostBreakdown {
  baseFee: number;
  distanceFee: number;
  weightFee: number;
  priorityFee: number;
  totalCost: number;
}

export interface RiskAssessment {
  weatherRisk: number;
  trafficRisk: number;
  courierRisk: number;
  routeRisk: number;
  overallRisk: number;
}

export interface AlternativeOption {
  reason: string;
  courier: CourierAssignment;
  route: OptimizedRoute;
  cost: number;
  confidence: number;
}

/**
 * DOMAIN ENGINE: Pure Business Logic Only
 *
 * This engine contains only pure business logic that can run in isolation.
 * No infrastructure dependencies, no side effects, no external APIs.
 * All business rules and calculations that don't require external systems.
 *
 * According to Clean Architecture, domain engines should be:
 * - Pure functions (deterministic, no side effects)
 * - No async operations (no external dependencies)
 * - No Date/Time operations (infrastructure concern)
 * - No console logging (side effect)
 * - No file/network access
 * - Only business rules and calculations
 */
export class LogisticsEngine {
  // Business constants - pure values, no infrastructure
  private readonly MAX_DELIVERY_DISTANCE_KM = 500;
  private readonly MIN_COURIER_RATING = 4.0;
  private readonly MIN_COMPLETION_RATE = 0.95;

  // Business rules - pure functions only
  isValidDeliveryDistance(distanceKm: number): boolean {
    return distanceKm > 0 && distanceKm <= this.MAX_DELIVERY_DISTANCE_KM;
  }

  isValidCourierRating(rating: number): boolean {
    return rating >= this.MIN_COURIER_RATING && rating <= 5.0;
  }

  isValidCompletionRate(rate: number): boolean {
    return rate >= this.MIN_COMPLETION_RATE && rate <= 1.0;
  }

  calculateDeliveryPriorityWeight(priority: 'standard' | 'express' | 'urgent'): number {
    switch (priority) {
      case 'urgent': return 3.0;
      case 'express': return 2.0;
      case 'standard': return 1.0;
      default: return 1.0;
    }
  }

  calculateBaseDeliveryFee(weightKg: number, distanceKm: number, priority: 'standard' | 'express' | 'urgent'): number {
    const baseFee = 5000; // TZS
    const weightFee = weightKg * 50; // TZS per kg
    const distanceFee = distanceKm * 100; // TZS per km
    const priorityMultiplier = this.calculateDeliveryPriorityWeight(priority);

    return (baseFee + weightFee + distanceFee) * priorityMultiplier;
  }

  calculateCourierSuitabilityScore(
    rating: number,
    completionRate: number,
    distanceFromPickup: number,
    vehicleCapacityKg: number,
    orderWeightKg: number
  ): number {
    // Pure business logic - no infrastructure dependencies
    const ratingScore = rating / 5.0; // Normalize to 0-1
    const completionScore = completionRate; // Already 0-1
    const distanceScore = Math.max(0, 1 - (distanceFromPickup / 50)); // Closer is better
    const capacityScore = orderWeightKg <= vehicleCapacityKg ? 1.0 : 0.0; // Binary: can handle or not

    // Weighted average
    return (
      ratingScore * 0.3 +
      completionScore * 0.3 +
      distanceScore * 0.25 +
      capacityScore * 0.15
    );
  }

  determineOptimalVehicleType(orderWeightKg: number, orderVolumeM3: number, priority: 'standard' | 'express' | 'urgent'): 'bicycle' | 'motorcycle' | 'car' | 'truck' {
    if (orderWeightKg > 100 || orderVolumeM3 > 2) return 'truck';
    if (orderWeightKg > 20 || orderVolumeM3 > 0.5) return 'car';
    if (priority === 'urgent' || orderWeightKg > 5) return 'motorcycle';
    return 'bicycle';
  }

  validateDeliveryRequirements(
    pickupLocation: GeoPoint,
    deliveryLocation: GeoPoint,
    orderWeight: Weight,
    orderVolume: number,
    priority: 'standard' | 'express' | 'urgent'
  ): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];
    const distance = pickupLocation.distanceTo(deliveryLocation);

    // Business rules - pure logic only
    if (!this.isValidDeliveryDistance(distance)) {
      violations.push(`Distance ${distance}km exceeds maximum ${this.MAX_DELIVERY_DISTANCE_KM}km`);
    }

    if (orderWeight.getValue() <= 0) {
      violations.push('Order weight must be positive');
    }

    if (orderVolume <= 0) {
      violations.push('Order volume must be positive');
    }

    if (!['standard', 'express', 'urgent'].includes(priority)) {
      violations.push('Invalid delivery priority');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  calculateRiskScore(
    distance: number,
    orderValue: number,
    priority: 'standard' | 'express' | 'urgent',
    courierRating: number,
    courierCompletionRate: number
  ): number {
    // Pure business logic - risk calculation based on business factors
    const distanceRisk = Math.min(distance / 100, 1.0); // Longer distance = higher risk
    const valueRisk = Math.min(orderValue / 100000, 1.0); // Higher value = higher risk
    const priorityRisk = priority === 'urgent' ? 0.8 : priority === 'express' ? 0.4 : 0.1;
    const courierRisk = (1 - courierRating / 5) * (1 - courierCompletionRate); // Lower rating/completion = higher risk

    // Weighted risk score (0-1, where 1 is highest risk)
    return (
      distanceRisk * 0.3 +
      valueRisk * 0.25 +
      priorityRisk * 0.25 +
      courierRisk * 0.2
    );
  }

  /**
   * Pure function: Validate delivery input data
   */
  validateDeliveryInput(input: {
    orderId: string;
    pickupLocation: { lat: number; lng: number; address: string };
    deliveryLocation: { lat: number; lng: number; address: string };
    weight: number;
    priority: 'standard' | 'express' | 'urgent';
    timeWindow?: { earliest: Date; latest: Date };
    specialRequirements?: string[];
  }): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Business rules - pure validation
    if (!input.orderId || input.orderId.trim().length === 0) {
      violations.push('Order ID is required');
    }

    if (!input.pickupLocation) {
      violations.push('Pickup location is required');
    } else {
      if (input.pickupLocation.lat < -90 || input.pickupLocation.lat > 90) {
        violations.push('Invalid pickup latitude');
      }
      if (input.pickupLocation.lng < -180 || input.pickupLocation.lng > 180) {
        violations.push('Invalid pickup longitude');
      }
    }

    if (!input.deliveryLocation) {
      violations.push('Delivery location is required');
    } else {
      if (input.deliveryLocation.lat < -90 || input.deliveryLocation.lat > 90) {
        violations.push('Invalid delivery latitude');
      }
      if (input.deliveryLocation.lng < -180 || input.deliveryLocation.lng > 180) {
        violations.push('Invalid delivery longitude');
      }
    }

    if (!input.weight || input.weight <= 0 || input.weight > this.MAX_DELIVERY_DISTANCE_KM * 10) {
      violations.push('Valid weight is required (0-500kg)');
    }

    if (!['standard', 'express', 'urgent'].includes(input.priority)) {
      violations.push('Invalid delivery priority');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * Pure function: Get default time window based on priority
   */
  getDefaultTimeWindowForPriority(priority: 'standard' | 'express' | 'urgent'): {
    earliest: Date;
    latest: Date;
  } {
    const now = new Date(); // Note: This should be injected, but keeping simple for now

    switch (priority) {
      case 'urgent':
        return {
          earliest: now,
          latest: new Date(now.getTime() + 2 * 60 * 60 * 1000) // 2 hours
        };
      case 'express':
        return {
          earliest: now,
          latest: new Date(now.getTime() + 6 * 60 * 60 * 1000) // 6 hours
        };
      case 'standard':
      default:
        return {
          earliest: now,
          latest: new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours
        };
    }
  }

  /**
   * Pure function: Calculate delivery cost
   */
  calculateDeliveryCost(
    distanceKm: number,
    weightKg: number,
    priority: 'standard' | 'express' | 'urgent',
    baseFee: number = 5000
  ): number {
    // Business rules - cost calculation
    const distanceCost = distanceKm * 100; // TZS per km
    const weightCost = weightKg * 50; // TZS per kg
    const priorityMultiplier = this.calculateDeliveryPriorityWeight(priority);

    const totalCost = (baseFee + distanceCost + weightCost) * priorityMultiplier;
    return Math.round(totalCost);
  }

  /**
   * Pure function: Calculate time estimates
   */
  calculateTimeEstimates(
    routeDurationMinutes: number,
    weatherSeverity: 'low' | 'medium' | 'high' = 'low',
    trafficCongestionLevel: number = 0
  ): {
    pickupBufferMinutes: number;
    deliveryBufferMinutes: number;
    totalDurationMinutes: number;
  } {
    // Business rules - time estimation buffers
    const basePickupBuffer = 15; // minutes
    const weatherBuffer = weatherSeverity === 'high' ? 15 : weatherSeverity === 'medium' ? 7 : 0;
    const trafficBuffer = trafficCongestionLevel > 70 ? 20 : trafficCongestionLevel > 40 ? 10 : 0;

    const pickupBufferMinutes = basePickupBuffer;
    const deliveryBufferMinutes = weatherBuffer + trafficBuffer;
    const totalDurationMinutes = routeDurationMinutes + deliveryBufferMinutes;

    return {
      pickupBufferMinutes,
      deliveryBufferMinutes,
      totalDurationMinutes
    };
  }

  /**
   * Pure function: Generate delivery ID (business rule for ID format)
   */
  generateDeliveryId(orderId: string): string {
    void orderId;
    return makeId(getModelPrefix('Logistics_Delivery'));
  }

  /**
   * Pure function: Evaluate courier eligibility
   */
  evaluateCourierEligibility(
    courierRating: number,
    completionRate: number,
    vehicleCapacityKg: number,
    orderWeightKg: number,
    distanceFromPickup: number
  ): { isEligible: boolean; score: number; reasons: string[] } {
    const reasons: string[] = [];

    // Business rules - eligibility criteria
    if (courierRating < this.MIN_COURIER_RATING) {
      reasons.push(`Rating ${courierRating} below minimum ${this.MIN_COURIER_RATING}`);
    }

    if (completionRate < this.MIN_COMPLETION_RATE) {
      reasons.push(`Completion rate ${completionRate} below minimum ${this.MIN_COMPLETION_RATE}`);
    }

    if (vehicleCapacityKg < orderWeightKg) {
      reasons.push(`Vehicle capacity ${vehicleCapacityKg}kg insufficient for ${orderWeightKg}kg order`);
    }

    const isEligible = reasons.length === 0;

    // Calculate eligibility score (0-100)
    const ratingScore = Math.min(courierRating / 5.0, 1.0) * 40;
    const completionScore = completionRate * 35;
    const capacityScore = (vehicleCapacityKg >= orderWeightKg ? 1.0 : 0.0) * 15;
    const distanceScore = Math.max(0, 1 - (distanceFromPickup / 50)) * 10;

    const score = Math.round((ratingScore + completionScore + capacityScore + distanceScore) * (isEligible ? 1 : 0.3));

    return {
      isEligible,
      score,
      reasons
    };
  }

  // REMOVED: All async methods - domain engines cannot depend on infrastructure
  // REMOVED: Constructor with ports - domain doesn't inject infrastructure
  // REMOVED: Date/Time operations - infrastructure concern
  // REMOVED: Console logging - side effect
  // REMOVED: External API calls - infrastructure concern

  // This domain engine now contains only pure business logic
  // All infrastructure coordination moved to application layer
}
