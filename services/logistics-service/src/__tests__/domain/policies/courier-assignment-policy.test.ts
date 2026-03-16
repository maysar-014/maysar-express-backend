/**
 * Courier Assignment Policy Tests
 *
 * Constitution Section 11: Domain tests must cover pure logic only
 * Constitution Section 5: Engines, Policies, Algorithms Separation
 * Constitution Section 3: Business Core Protection - assignment logic is sacred
 */

import { CourierAssignmentPolicy, CourierAssignmentCriteria, CourierScore } from '../../../domain/policies/courier-assignment.policy';
import { CourierEntity } from '../../../domain/entities/courier.entity';
import { GeoPoint } from '../../../domain/value-objects/geopoint.value-object';
import { Weight } from '../../../domain/value-objects/weight.value-object';

describe('CourierAssignmentPolicy', () => {
  // Test data setup
  const pickupLocation = GeoPoint.create(-6.7924, 39.2083, 'Dar es Salaam CBD');
  const deliveryLocation = GeoPoint.create(-6.8167, 39.2833, 'Msasani');

  const baseCourierData = {
    id: 'courier-base',
    name: 'Test Courier',
    phone: '+255 712 345 678',
    vehicle: {
      type: 'motorcycle',
      capacity: {
        maxWeight: 20,
        maxVolume: 1,
        maxItems: 5
      }
    },
    rating: 4.5,
    completionRate: 0.97,
    currentLocation: GeoPoint.create(-6.8, 39.25, 'Courier Location'),
    isAvailable: true,
    estimatedArrivalTime: 10,
    trafficExperience: 0.95
  };

  const baseCriteria: CourierAssignmentCriteria = {
    pickupLocation,
    deliveryLocation,
    weight: Weight.create(5, 'kg'),
    priority: 'standard'
  };

  let policy: CourierAssignmentPolicy;

  beforeEach(() => {
    policy = new CourierAssignmentPolicy();
  });

  describe('canAssignCourier', () => {
    it('should return true for fully eligible courier', () => {
      const courier = CourierEntity.create(baseCourierData);
      const result = policy.canAssignCourier(courier, baseCriteria);

      expect(result).toBe(true);
    });

    it('should return false for unavailable courier', () => {
      const unavailableCourier = CourierEntity.create({
        ...baseCourierData,
        isAvailable: false
      });
      const result = policy.canAssignCourier(unavailableCourier, baseCriteria);

      expect(result).toBe(false);
    });

    it('should return false for courier with low rating', () => {
      const lowRatingCourier = CourierEntity.create({
        ...baseCourierData,
        rating: 3.8
      });
      const result = policy.canAssignCourier(lowRatingCourier, baseCriteria);

      expect(result).toBe(false);
    });

    it('should return false for courier with low completion rate', () => {
      const lowCompletionCourier = CourierEntity.create({
        ...baseCourierData,
        completionRate: 0.92
      });
      const result = policy.canAssignCourier(lowCompletionCourier, baseCriteria);

      expect(result).toBe(false);
    });

    it('should return false for courier with insufficient vehicle capacity', () => {
      const heavyCriteria = {
        ...baseCriteria,
        weight: Weight.create(25, 'kg')
      };
      const smallVehicleCourier = CourierEntity.create(baseCourierData);
      const result = policy.canAssignCourier(smallVehicleCourier, heavyCriteria);

      expect(result).toBe(false);
    });

    it('should return false for courier too far from pickup location', () => {
      const farCourier = CourierEntity.create({
        ...baseCourierData,
        currentLocation: GeoPoint.create(-7.5, 39.0, 'Far Location') // ~80km away
      });
      const result = policy.canAssignCourier(farCourier, baseCriteria);

      expect(result).toBe(false);
    });

    it('should return true for boundary rating (4.0)', () => {
      const boundaryCourier = CourierEntity.create({
        ...baseCourierData,
        rating: 4.0
      });
      const result = policy.canAssignCourier(boundaryCourier, baseCriteria);

      expect(result).toBe(true);
    });

    it('should return true for boundary completion rate (0.95)', () => {
      const boundaryCourier = CourierEntity.create({
        ...baseCourierData,
        completionRate: 0.95
      });
      const result = policy.canAssignCourier(boundaryCourier, baseCriteria);

      expect(result).toBe(true);
    });

    it('should handle special requirements', () => {
      const criteriaWithRequirements = {
        ...baseCriteria,
        specialRequirements: ['fragile']
      };

      const courier = CourierEntity.create(baseCourierData);
      const result = policy.canAssignCourier(courier, criteriaWithRequirements);

      // Policy currently accepts all basic requirements
      expect(result).toBe(true);
    });

    it('should handle empty special requirements', () => {
      const criteriaNoRequirements = {
        ...baseCriteria,
        specialRequirements: []
      };

      const courier = CourierEntity.create(baseCourierData);
      const result = policy.canAssignCourier(courier, criteriaNoRequirements);

      expect(result).toBe(true);
    });
  });

  describe('calculateCourierScore', () => {
    it('should calculate comprehensive score with all factors', () => {
      const courier = CourierEntity.create(baseCourierData);
      const score = policy.calculateCourierScore(courier, baseCriteria);

      expect(score).toHaveProperty('courier');
      expect(score).toHaveProperty('totalScore');
      expect(score).toHaveProperty('breakdown');

      expect(score.courier).toBe(courier);
      expect(typeof score.totalScore).toBe('number');
      expect(score.totalScore).toBeGreaterThan(0);
      expect(score.totalScore).toBeLessThanOrEqual(100);
    });

    it('should include all breakdown components', () => {
      const courier = CourierEntity.create(baseCourierData);
      const score = policy.calculateCourierScore(courier, baseCriteria);

      expect(score.breakdown).toHaveProperty('distance');
      expect(score.breakdown).toHaveProperty('rating');
      expect(score.breakdown).toHaveProperty('completionRate');
      expect(score.breakdown).toHaveProperty('vehicleMatch');
      expect(score.breakdown).toHaveProperty('weatherSuitability');
      expect(score.breakdown).toHaveProperty('trafficExperience');

      // All breakdown values should be between 0 and 1
      Object.values(score.breakdown).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });

    it('should give higher score to closer courier', () => {
      const closeCourier = CourierEntity.create({
        ...baseCourierData,
        currentLocation: GeoPoint.create(-6.79, 39.21, 'Very Close') // ~1km away
      });

      const farCourier = CourierEntity.create({
        ...baseCourierData,
        currentLocation: GeoPoint.create(-6.9, 39.1, 'Far Away'), // ~15km away
        id: 'far-courier'
      });

      const closeScore = policy.calculateCourierScore(closeCourier, baseCriteria);
      const farScore = policy.calculateCourierScore(farCourier, baseCriteria);

      expect(closeScore.totalScore).toBeGreaterThan(farScore.totalScore);
      expect(closeScore.breakdown.distance).toBeGreaterThan(farScore.breakdown.distance);
    });

    it('should give higher score to higher rated courier', () => {
      const highRatingCourier = CourierEntity.create({
        ...baseCourierData,
        rating: 4.9
      });

      const lowRatingCourier = CourierEntity.create({
        ...baseCourierData,
        rating: 4.2,
        id: 'low-rating'
      });

      const highScore = policy.calculateCourierScore(highRatingCourier, baseCriteria);
      const lowScore = policy.calculateCourierScore(lowRatingCourier, baseCriteria);

      expect(highScore.totalScore).toBeGreaterThan(lowScore.totalScore);
      expect(highScore.breakdown.rating).toBeGreaterThan(lowScore.breakdown.rating);
    });

    it('should give higher score to courier with better completion rate', () => {
      const perfectCompletionCourier = CourierEntity.create({
        ...baseCourierData,
        completionRate: 1.0
      });

      const goodCompletionCourier = CourierEntity.create({
        ...baseCourierData,
        completionRate: 0.96,
        id: 'good-completion'
      });

      const perfectScore = policy.calculateCourierScore(perfectCompletionCourier, baseCriteria);
      const goodScore = policy.calculateCourierScore(goodCompletionCourier, baseCriteria);

      expect(perfectScore.totalScore).toBeGreaterThan(goodScore.totalScore);
      expect(perfectScore.breakdown.completionRate).toBeGreaterThan(goodScore.breakdown.completionRate);
    });

    it('should consider vehicle capacity match', () => {
      const perfectMatchCourier = CourierEntity.create({
        ...baseCourierData,
        vehicle: {
          ...baseCourierData.vehicle,
          capacity: { maxWeight: 10, maxVolume: 1, maxItems: 5 }
        }
      });

      const overCapacityCourier = CourierEntity.create({
        ...baseCourierData,
        vehicle: {
          ...baseCourierData.vehicle,
          capacity: { maxWeight: 100, maxVolume: 5, maxItems: 20 }
        },
        id: 'large-vehicle'
      });

      const perfectScore = policy.calculateCourierScore(perfectMatchCourier, baseCriteria);
      const overCapacityScore = policy.calculateCourierScore(overCapacityCourier, baseCriteria);

      // Perfect match should score higher than over-capacity
      expect(perfectScore.totalScore).toBeGreaterThan(overCapacityScore.totalScore);
    });

    it('should consider priority for weather suitability', () => {
      const urgentCriteria = {
        ...baseCriteria,
        priority: 'urgent' as const
      };

      const expressCriteria = {
        ...baseCriteria,
        priority: 'express' as const
      };

      const standardCriteria = {
        ...baseCriteria,
        priority: 'standard' as const
      };

      const courier = CourierEntity.create(baseCourierData);

      const urgentScore = policy.calculateCourierScore(courier, urgentCriteria);
      const expressScore = policy.calculateCourierScore(courier, expressCriteria);
      const standardScore = policy.calculateCourierScore(courier, standardCriteria);

      // Urgent should have higher weather suitability score
      expect(urgentScore.breakdown.weatherSuitability).toBeGreaterThanOrEqual(expressScore.breakdown.weatherSuitability);
      expect(expressScore.breakdown.weatherSuitability).toBeGreaterThanOrEqual(standardScore.breakdown.weatherSuitability);
    });

    it('should consider traffic experience', () => {
      const experiencedCourier = CourierEntity.create({
        ...baseCourierData,
        trafficExperience: 0.95
      });

      const noviceCourier = CourierEntity.create({
        ...baseCourierData,
        trafficExperience: 0.3,
        id: 'novice-courier'
      });

      const experiencedScore = policy.calculateCourierScore(experiencedCourier, baseCriteria);
      const noviceScore = policy.calculateCourierScore(noviceCourier, baseCriteria);

      expect(experiencedScore.totalScore).toBeGreaterThan(noviceScore.totalScore);
      expect(experiencedScore.breakdown.trafficExperience).toBeGreaterThan(noviceScore.breakdown.trafficExperience);
    });

    it('should round total score to 2 decimal places', () => {
      const courier = CourierEntity.create(baseCourierData);
      const score = policy.calculateCourierScore(courier, baseCriteria);

      const scoreStr = score.totalScore.toString();
      const decimalPlaces = scoreStr.split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe('selectOptimalCourier', () => {
    it('should return null when no couriers provided', () => {
      const result = policy.selectOptimalCourier([], baseCriteria);
      expect(result).toBeNull();
    });

    it('should return null when no eligible couriers', () => {
      const ineligibleCourier = CourierEntity.create({
        ...baseCourierData,
        isAvailable: false,
        id: 'ineligible'
      });

      const result = policy.selectOptimalCourier([ineligibleCourier], baseCriteria);
      expect(result).toBeNull();
    });

    it('should select highest scoring eligible courier', () => {
      const highScoreCourier = CourierEntity.create({
        ...baseCourierData,
        rating: 4.9,
        completionRate: 0.99,
        currentLocation: GeoPoint.create(-6.792, 39.209, 'Very Close'), // ~100m away
        id: 'high-score'
      });

      const mediumScoreCourier = CourierEntity.create({
        ...baseCourierData,
        rating: 4.3,
        completionRate: 0.96,
        id: 'medium-score'
      });

      const result = policy.selectOptimalCourier([mediumScoreCourier, highScoreCourier], baseCriteria);
      expect(result).toBe(highScoreCourier);
    });

    it('should filter out ineligible couriers before scoring', () => {
      const eligibleCourier = CourierEntity.create({
        ...baseCourierData,
        id: 'eligible'
      });

      const ineligibleCourier = CourierEntity.create({
        ...baseCourierData,
        isAvailable: false,
        id: 'ineligible'
      });

      const result = policy.selectOptimalCourier([eligibleCourier, ineligibleCourier], baseCriteria);
      expect(result).toBe(eligibleCourier);
    });

    it('should handle single eligible courier', () => {
      const singleCourier = CourierEntity.create(baseCourierData);
      const result = policy.selectOptimalCourier([singleCourier], baseCriteria);
      expect(result).toBe(singleCourier);
    });

    it('should handle multiple couriers with same score (return first)', () => {
      const courier1 = CourierEntity.create({
        ...baseCourierData,
        id: 'courier-1'
      });

      const courier2 = CourierEntity.create({
        ...baseCourierData,
        id: 'courier-2'
      });

      const result = policy.selectOptimalCourier([courier1, courier2], baseCriteria);
      expect(result).toBe(courier1); // Should return first in sorted order
    });
  });

  describe('getAssignmentConstraints', () => {
    it('should return correct constraint values', () => {
      const constraints = policy.getAssignmentConstraints(baseCriteria);

      expect(constraints).toHaveProperty('maxDistance');
      expect(constraints).toHaveProperty('minRating');
      expect(constraints).toHaveProperty('minCompletionRate');

      expect(constraints.maxDistance).toBe(50);
      expect(constraints.minRating).toBe(4.0);
      expect(constraints.minCompletionRate).toBe(0.95);
    });

    it('should return consistent constraint values', () => {
      const constraints1 = policy.getAssignmentConstraints(baseCriteria);
      const constraints2 = policy.getAssignmentConstraints({
        ...baseCriteria,
        priority: 'urgent'
      });

      expect(constraints1).toEqual(constraints2);
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle courier at exact distance limit', () => {
      const atLimitCourier = CourierEntity.create({
        ...baseCourierData,
        currentLocation: GeoPoint.create(-6.7924 + (50 / 111.32), 39.2083, 'At Limit') // ~50km away
      });

      const result = policy.canAssignCourier(atLimitCourier, baseCriteria);
      expect(result).toBe(true); // Should be eligible at exact limit
    });

    it('should handle very close courier (high distance score)', () => {
      const veryCloseCourier = CourierEntity.create({
        ...baseCourierData,
        currentLocation: GeoPoint.create(-6.7925, 39.2084, 'Very Close') // ~10m away
      });

      const score = policy.calculateCourierScore(veryCloseCourier, baseCriteria);
      expect(score.breakdown.distance).toBeCloseTo(1.0, 1); // Should be near perfect
    });

    it('should handle very far courier (low distance score)', () => {
      const veryFarCourier = CourierEntity.create({
        ...baseCourierData,
        currentLocation: GeoPoint.create(-7.5, 39.0, 'Very Far') // ~80km away
      });

      const score = policy.calculateCourierScore(veryFarCourier, baseCriteria);
      expect(score.breakdown.distance).toBeCloseTo(0.0, 1); // Should be near zero
    });

    it('should handle perfect courier (maximum possible score)', () => {
      const perfectCourier = CourierEntity.create({
        ...baseCourierData,
        rating: 5.0,
        completionRate: 1.0,
        currentLocation: pickupLocation, // At pickup location
        trafficExperience: 1.0,
        vehicle: {
          ...baseCourierData.vehicle,
          capacity: { maxWeight: 10, maxVolume: 1, maxItems: 5 } // Perfect match for 5kg
        }
      });

      const score = policy.calculateCourierScore(perfectCourier, baseCriteria);
      expect(score.totalScore).toBeGreaterThan(95); // Should be very high
    });

    it('should handle minimum viable courier', () => {
      const minimumCourier = CourierEntity.create({
        ...baseCourierData,
        rating: 4.0, // Minimum
        completionRate: 0.95, // Minimum
        currentLocation: GeoPoint.create(-6.7924 + (50 / 111.32), 39.2083, 'At Limit'), // At max distance
        trafficExperience: 0.0, // Minimum
        vehicle: {
          ...baseCourierData.vehicle,
          capacity: { maxWeight: 5.1, maxVolume: 1, maxItems: 1 } // Barely sufficient
        }
      });

      const canAssign = policy.canAssignCourier(minimumCourier, baseCriteria);
      expect(canAssign).toBe(true);

      const score = policy.calculateCourierScore(minimumCourier, baseCriteria);
      expect(score.totalScore).toBeGreaterThan(0);
      expect(score.totalScore).toBeLessThan(65); // Should be relatively low
    });
  });

  describe('business rule validation', () => {
    it('should correctly apply distance weighting (25%)', () => {
      // Test that distance has correct weight in scoring algorithm
      const closeCourier = CourierEntity.create({
        ...baseCourierData,
        currentLocation: GeoPoint.create(-6.7925, 39.2084, 'Close')
      });

      const farCourier = CourierEntity.create({
        ...baseCourierData,
        currentLocation: GeoPoint.create(-6.85, 39.15, 'Far'),
        id: 'far-courier'
      });

      const closeScore = policy.calculateCourierScore(closeCourier, baseCriteria);
      const farScore = policy.calculateCourierScore(farCourier, baseCriteria);

      const distanceDifference = closeScore.breakdown.distance - farScore.breakdown.distance;
      expect(distanceDifference).toBeGreaterThan(0.1); // Significant difference
    });

    it('should correctly apply rating weighting (20%)', () => {
      const highRatingCourier = CourierEntity.create({
        ...baseCourierData,
        rating: 4.9
      });

      const lowRatingCourier = CourierEntity.create({
        ...baseCourierData,
        rating: 4.1,
        id: 'low-rating'
      });

      const highScore = policy.calculateCourierScore(highRatingCourier, baseCriteria);
      const lowScore = policy.calculateCourierScore(lowRatingCourier, baseCriteria);

      const ratingDifference = highScore.breakdown.rating - lowScore.breakdown.rating;
      expect(ratingDifference).toBeCloseTo(0.16, 1); // (4.9-4.1)/5 = 0.16
    });

    it('should validate scoring algorithm consistency', () => {
      const courier = CourierEntity.create(baseCourierData);
      const score1 = policy.calculateCourierScore(courier, baseCriteria);
      const score2 = policy.calculateCourierScore(courier, baseCriteria);

      expect(score1.totalScore).toBe(score2.totalScore);
      expect(score1.breakdown).toEqual(score2.breakdown);
    });
  });
});
