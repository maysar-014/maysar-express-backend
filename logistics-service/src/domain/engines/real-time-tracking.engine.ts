export interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: Date;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export interface RouteData {
  routeId: string;
  startLocation: LocationPoint;
  endLocation?: LocationPoint;
  waypoints: LocationPoint[];
  totalDistance: number;
  estimatedDuration: number;
  actualDuration?: number;
}

export interface AccuracyData {
  timestamp: Date;
  accuracy: number;
  satelliteCount: number;
  signalStrength: number;
}

export interface LocationHistory {
  courierId: string;
  locations: LocationPoint[];
  route: RouteData;
  timestamps: Date[];
  accuracy: AccuracyData[];
}

export interface Pattern {
  type: 'speed' | 'route' | 'stop' | 'efficiency';
  description: string;
  frequency: number;
  locations: LocationPoint[];
  timePattern: string;
  significance: 'high' | 'medium' | 'low';
}

export interface Anomaly {
  type: 'speed_violation' | 'route_deviation' | 'extended_stop' | 'location_jump';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  location: LocationPoint;
  detectedAt: Date;
  resolved: boolean;
}

export interface AccuracyTrend {
  period: string;
  averageAccuracy: number;
  trend: 'improving' | 'stable' | 'declining';
  changePercentage: number;
}

export interface SignalMetrics {
  averageStrength: number;
  consistency: number;
  dropoutFrequency: number;
  reliabilityScore: number;
}

export interface LocationPrediction {
  predictedLocation: LocationPoint;
  confidence: number;
  timeframe: number; // minutes
  factors: string[];
}

export interface RouteOptimization {
  currentRoute: RouteData;
  optimizedRoute: RouteData;
  timeSavings: number;
  distanceSavings: number;
  fuelSavings: number;
}

export interface GPSAnalytics {
  accuracyTrends: AccuracyTrend[];
  signalQualityMetrics: SignalMetrics;
  locationPredictions: LocationPrediction[];
  routeOptimizations: RouteOptimization[];
}

export interface AccuracyPrediction {
  expectedAccuracy: number;
  confidence: number;
  factors: string[];
  recommendations: string[];
}

export interface OptimizationResult {
  settingsApplied: Record<string, any>;
  expectedImprovement: number;
  estimatedBatteryImpact: string;
  recommendations: string[];
}

/**
 * DOMAIN ENGINE: Pure Business Logic Only
 *
 * Real-time tracking business rules that can run without external systems.
 * Pure functions for anomaly detection, pattern analysis, and validation.
 */
export class RealTimeTrackingEngine {
  // Business constants - pure values, no infrastructure
  private readonly MAX_ANOMALY_SPEED_KMH = 80;
  private readonly MIN_LOCATION_ACCURACY_METERS = 5;
  private readonly MAX_TIME_GAP_MINUTES = 10;
  private readonly EARTH_RADIUS_KM = 6371;

  /**
   * Pure function: Validate location data quality
   */
  validateLocationData(location: LocationPoint): { isValid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Business rules - pure validation
    if (location.lat < -90 || location.lat > 90) {
      violations.push('Invalid latitude range');
    }
    if (location.lng < -180 || location.lng > 180) {
      violations.push('Invalid longitude range');
    }
    if (location.accuracy < 0 || location.accuracy > 100) {
      violations.push('Invalid accuracy range');
    }
    if (location.speed && (location.speed < 0 || location.speed > 200)) {
      violations.push('Invalid speed range');
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }

  /**
   * Pure function: Detect speed anomalies
   */
  detectSpeedAnomaly(currentSpeed: number, speedLimit: number = 80): {
    isAnomaly: boolean;
    severity: 'low' | 'medium' | 'high';
    description: string;
  } {
    if (currentSpeed <= speedLimit) {
      return {
        isAnomaly: false,
        severity: 'low',
        description: 'Speed within limits'
      };
    }

    const overLimit = currentSpeed - speedLimit;
    const severity = overLimit > 30 ? 'high' : overLimit > 15 ? 'medium' : 'low';

    return {
      isAnomaly: true,
      severity,
      description: `Speed violation: ${currentSpeed} km/h (limit: ${speedLimit} km/h)`
    };
  }

  /**
   * Pure function: Calculate distance between two points (Haversine formula)
   */
  calculateDistance(point1: LocationPoint, point2: LocationPoint): number {
    const lat1Rad = (point1.lat * Math.PI) / 180;
    const lat2Rad = (point2.lat * Math.PI) / 180;
    const deltaLatRad = ((point2.lat - point1.lat) * Math.PI) / 180;
    const deltaLngRad = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
              Math.cos(lat1Rad) * Math.cos(lat2Rad) *
              Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return this.EARTH_RADIUS_KM * c;
  }

  /**
   * Pure function: Detect location jump anomalies
   */
  detectLocationJump(
    previousLocation: LocationPoint,
    currentLocation: LocationPoint,
    maxSpeedKmh: number = 100
  ): { isAnomaly: boolean; severity: 'low' | 'medium' | 'high'; description: string } {
    const distance = this.calculateDistance(previousLocation, currentLocation);
    const timeDiffHours = Math.abs(currentLocation.timestamp.getTime() - previousLocation.timestamp.getTime()) / (1000 * 60 * 60);

    if (timeDiffHours <= 0) {
      return {
        isAnomaly: true,
        severity: 'high',
        description: 'Invalid timestamp sequence'
      };
    }

    const requiredSpeed = distance / timeDiffHours; // km/h

    if (requiredSpeed <= maxSpeedKmh) {
      return {
        isAnomaly: false,
        severity: 'low',
        description: 'Movement within speed limits'
      };
    }

    const severity = requiredSpeed > maxSpeedKmh * 2 ? 'high' : 'medium';

    return {
      isAnomaly: true,
      severity,
      description: `Location jump detected: ${distance.toFixed(1)}km in ${timeDiffHours.toFixed(2)}h (${requiredSpeed.toFixed(1)} km/h)`
    };
  }

  /**
   * Pure function: Calculate GPS accuracy score
   */
  calculateAccuracyScore(accuracyMeters: number): number {
    // Lower accuracy (meters) = higher score (0-100)
    // 5m accuracy = 100, 100m accuracy = 0
    const maxAccuracy = 100;
    const minAccuracy = 5;

    if (accuracyMeters <= minAccuracy) return 100;
    if (accuracyMeters >= maxAccuracy) return 0;

    return Math.round(100 * (maxAccuracy - accuracyMeters) / (maxAccuracy - minAccuracy));
  }

  /**
   * Pure function: Validate tracking data quality
   */
  assessTrackingQuality(locations: LocationPoint[]): {
    overallScore: number;
    accuracyScore: number;
    consistencyScore: number;
    coverageScore: number;
  } {
    if (locations.length === 0) {
      return { overallScore: 0, accuracyScore: 0, consistencyScore: 0, coverageScore: 0 };
    }

    // Accuracy score - average of individual accuracy scores
    const accuracyScore = locations.reduce((sum, loc) =>
      sum + this.calculateAccuracyScore(loc.accuracy), 0) / locations.length;

    // Consistency score - how consistent accuracy is
    const accuracies = locations.map(loc => loc.accuracy);
    const avgAccuracy = accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length;
    const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - avgAccuracy, 2), 0) / accuracies.length;
    const consistencyScore = Math.max(0, 100 - Math.sqrt(variance));

    // Coverage score - how well time periods are covered
    const coverageScore = locations.length > 10 ? 100 : (locations.length / 10) * 100;

    // Overall weighted score
    const overallScore = Math.round(
      accuracyScore * 0.4 +
      consistencyScore * 0.3 +
      coverageScore * 0.3
    );

    return {
      overallScore,
      accuracyScore: Math.round(accuracyScore),
      consistencyScore: Math.round(consistencyScore),
      coverageScore: Math.round(coverageScore)
    };
  }

  /**
   * Pure function: Calculate route efficiency
   */
  calculateRouteEfficiency(totalDistance: number, straightLineDistance: number): number {
    if (straightLineDistance <= 0) return 0;

    const efficiency = straightLineDistance / totalDistance;
    return Math.round(efficiency * 100); // 0-100%
  }

  /**
   * Pure function: Validate tracking frequency
   */
  validateTrackingFrequency(
    locations: LocationPoint[],
    expectedIntervalSeconds: number = 30
  ): { isValid: boolean; gaps: number; averageInterval: number } {
    if (locations.length < 2) {
      return { isValid: false, gaps: 0, averageInterval: 0 };
    }

    const intervals: number[] = [];
    let gaps = 0;

    for (let i = 1; i < locations.length; i++) {
      const interval = (locations[i].timestamp.getTime() - locations[i-1].timestamp.getTime()) / 1000;
      intervals.push(interval);

      if (interval > expectedIntervalSeconds * 3) { // 3x expected interval = gap
        gaps++;
      }
    }

    const averageInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;

    return {
      isValid: gaps === 0,
      gaps,
      averageInterval: Math.round(averageInterval)
    };
  }

  // REMOVED: All infrastructure-dependent methods
  // Domain engines cannot perform async operations, use Date, console, etc.
  // All infrastructure coordination moved to application layer
}
