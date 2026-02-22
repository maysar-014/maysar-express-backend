import { CourierEntity } from '../entities/courier.entity';
import { Weight } from '../value-objects/weight.value-object';
import { GeoPoint } from '../value-objects/geopoint.value-object';

export interface CourierAssignmentCriteria {
  pickupLocation: GeoPoint;
  deliveryLocation: GeoPoint;
  weight: Weight;
  priority: 'standard' | 'express' | 'urgent';
  specialRequirements?: string[];
}

export interface CourierScore {
  courier: CourierEntity;
  totalScore: number;
  breakdown: {
    distance: number;
    rating: number;
    completionRate: number;
    vehicleMatch: number;
    weatherSuitability: number;
    trafficExperience: number;
  };
}

export class CourierAssignmentPolicy {
  private readonly MAX_DISTANCE_KM = 50;
  private readonly MIN_RATING = 4.0;
  private readonly MIN_COMPLETION_RATE = 0.95;

  canAssignCourier(courier: CourierEntity, criteria: CourierAssignmentCriteria): boolean {
    // Basic eligibility checks
    if (!courier.isAvailable) {
      return false;
    }

    if (courier.rating < this.MIN_RATING) {
      return false;
    }

    if (courier.completionRate < this.MIN_COMPLETION_RATE) {
      return false;
    }

    // Vehicle capacity check
    if (!this.isVehicleSuitable(courier, criteria.weight)) {
      return false;
    }

    // Distance check
    const distance = criteria.pickupLocation.distanceTo(courier.currentLocation);
    if (distance > this.MAX_DISTANCE_KM) {
      return false;
    }

    // Special requirements check
    if (!this.meetsSpecialRequirements(courier, criteria.specialRequirements)) {
      return false;
    }

    return true;
  }

  calculateCourierScore(courier: CourierEntity, criteria: CourierAssignmentCriteria): CourierScore {
    const distance = criteria.pickupLocation.distanceTo(courier.currentLocation);
    const distanceScore = Math.max(0, (this.MAX_DISTANCE_KM - distance) / this.MAX_DISTANCE_KM);

    const ratingScore = courier.rating / 5.0;
    const completionRateScore = courier.completionRate;
    const vehicleMatchScore = this.calculateVehicleMatchScore(courier, criteria.weight);
    const weatherSuitabilityScore = this.calculateWeatherSuitabilityScore(courier, criteria.priority);
    const trafficExperienceScore = courier.trafficExperience || 0.8;

    const totalScore = (
      distanceScore * 0.25 +
      ratingScore * 0.20 +
      completionRateScore * 0.20 +
      vehicleMatchScore * 0.15 +
      weatherSuitabilityScore * 0.10 +
      trafficExperienceScore * 0.10
    ) * 100;

    return {
      courier,
      totalScore: Math.round(totalScore * 100) / 100,
      breakdown: {
        distance: distanceScore,
        rating: ratingScore,
        completionRate: completionRateScore,
        vehicleMatch: vehicleMatchScore,
        weatherSuitability: weatherSuitabilityScore,
        trafficExperience: trafficExperienceScore
      }
    };
  }

  selectOptimalCourier(couriers: CourierEntity[], criteria: CourierAssignmentCriteria): CourierEntity | null {
    const eligibleCouriers = couriers.filter(courier => this.canAssignCourier(courier, criteria));

    if (eligibleCouriers.length === 0) {
      return null;
    }

    const scoredCouriers = eligibleCouriers.map(courier =>
      this.calculateCourierScore(courier, criteria)
    );

    // Sort by total score descending
    scoredCouriers.sort((a, b) => b.totalScore - a.totalScore);

    // Return the highest scoring courier
    return scoredCouriers[0].courier;
  }

  private isVehicleSuitable(courier: CourierEntity, weight: Weight): boolean {
    const weightKg = weight.toKilograms();
    return courier.vehicle.capacity.maxWeight >= weightKg &&
           courier.vehicle.capacity.maxVolume >= 1; // Assuming minimum volume requirement
  }

  private meetsSpecialRequirements(courier: CourierEntity, requirements?: string[]): boolean {
    if (!requirements || requirements.length === 0) {
      return true;
    }

    // For now, assume all couriers can handle basic requirements
    // This can be extended with specific capability checks
    const supportedRequirements = [
      'fragile',
      'perishable',
      'hazardous',
      'oversized',
      'express'
    ];

    return requirements.every(req => supportedRequirements.includes(req));
  }

  private calculateVehicleMatchScore(courier: CourierEntity, weight: Weight): number {
    const weightKg = weight.toKilograms();
    const capacityRatio = weightKg / courier.vehicle.capacity.maxWeight;

    if (capacityRatio <= 0.5) return 1.0; // Perfect match
    if (capacityRatio <= 0.8) return 0.8; // Good match
    if (capacityRatio <= 1.0) return 0.6; // Acceptable match
    return 0.3; // Over capacity
  }

  private calculateWeatherSuitabilityScore(courier: CourierEntity, priority: string): number {
    // Higher priority deliveries need more reliable couriers in all conditions
    if (priority === 'urgent') {
      return courier.trafficExperience > 0.9 ? 1.0 : 0.8;
    }
    if (priority === 'express') {
      return courier.trafficExperience >= 0.8 ? 0.9 : 0.85;
    }
    return 0.85; // Standard priority
  }

  getAssignmentConstraints(criteria: CourierAssignmentCriteria): {
    maxDistance: number;
    minRating: number;
    minCompletionRate: number;
  } {
    return {
      maxDistance: this.MAX_DISTANCE_KM,
      minRating: this.MIN_RATING,
      minCompletionRate: this.MIN_COMPLETION_RATE
    };
  }
}
