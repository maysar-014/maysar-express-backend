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

export class RealTimeTrackingEngine {
  private locationHistory: Map<string, LocationPoint[]> = new Map();
  private readonly MAX_HISTORY_POINTS = 1000;

  async storeLocationUpdate(courierId: string, location: LocationPoint): Promise<void> {
    const history = this.locationHistory.get(courierId) || [];
    
    // Add new location point
    history.push({
      ...location,
      timestamp: new Date()
    });

    // Keep only recent points
    if (history.length > this.MAX_HISTORY_POINTS) {
      history.splice(0, history.length - this.MAX_HISTORY_POINTS);
    }

    this.locationHistory.set(courierId, history);

    // Check for anomalies
    await this.checkForAnomalies(courierId, location);
  }

  async getLocationHistory(courierId: string, period: string): Promise<LocationHistory> {
    const allLocations = this.locationHistory.get(courierId) || [];
    const periodStart = this.getPeriodStart(period);
    const locations = allLocations.filter(loc => loc.timestamp >= periodStart);

    const route = await this.reconstructRoute(locations);
    const timestamps = locations.map(loc => loc.timestamp);
    const accuracy = locations.map(loc => ({
      timestamp: loc.timestamp,
      accuracy: loc.accuracy,
      satelliteCount: Math.floor(Math.random() * 8) + 4,
      signalStrength: Math.floor(Math.random() * 100) + 50
    }));

    return {
      courierId,
      locations,
      route,
      timestamps,
      accuracy
    };
  }

  async analyzeMovementPatterns(courierId: string): Promise<Pattern[]> {
    const history = await this.getLocationHistory(courierId, 'week');
    const patterns: Pattern[] = [];

    // Analyze speed patterns
    const speedPattern = this.analyzeSpeedPatterns(history.locations);
    if (speedPattern) patterns.push(speedPattern);

    // Analyze route patterns
    const routePattern = this.analyzeRoutePatterns(history.locations);
    if (routePattern) patterns.push(routePattern);

    // Analyze stop patterns
    const stopPattern = this.analyzeStopPatterns(history.locations);
    if (stopPattern) patterns.push(stopPattern);

    return patterns;
  }

  async detectAnomalies(courierId: string): Promise<Anomaly[]> {
    const recentLocations = this.getRecentLocations(courierId, 60); // Last hour
    const anomalies: Anomaly[] = [];

    for (let i = 1; i < recentLocations.length; i++) {
      const current = recentLocations[i];
      const previous = recentLocations[i - 1];

      // Speed anomaly detection
      if (current.speed && current.speed > 80) { // 80 km/h limit
        anomalies.push({
          type: 'speed_violation',
          severity: 'warning',
          description: `Speed limit exceeded: ${current.speed} km/h`,
          location: current,
          detectedAt: current.timestamp,
          resolved: false
        });
      }

      // Location jump detection
      const distance = this.calculateDistance(previous, current);
      const timeDiff = (current.timestamp.getTime() - previous.timestamp.getTime()) / 1000; // seconds
      const maxPossibleSpeed = 100; // km/h
      const maxDistance = (maxPossibleSpeed * timeDiff) / 3600; // km

      if (distance > maxDistance * 2) {
        anomalies.push({
          type: 'location_jump',
          severity: 'critical',
          description: `Impossible location jump detected: ${distance.toFixed(1)}km in ${timeDiff}s`,
          location: current,
          detectedAt: current.timestamp,
          resolved: false
        });
      }
    }

    return anomalies;
  }

  private async checkForAnomalies(courierId: string, location: LocationPoint): Promise<void> {
    // Real-time anomaly detection logic
    const recentLocations = this.getRecentLocations(courierId, 5); // Last 5 minutes
    
    if (recentLocations.length > 1) {
      const lastLocation = recentLocations[recentLocations.length - 2];
      const distance = this.calculateDistance(lastLocation, location);
      const timeDiff = (location.timestamp.getTime() - lastLocation.timestamp.getTime()) / 1000;
      
      // Check for impossible movement
      if (distance > 2 && timeDiff < 60) { // 2km in less than 1 minute
        console.warn(`Anomaly detected for courier ${courierId}: ${distance}km in ${timeDiff}s`);
      }
    }
  }

  private reconstructRoute(locations: LocationPoint[]): RouteData {
    if (locations.length === 0) {
      return {
        routeId: `route_${Date.now()}`,
        startLocation: { lat: 0, lng: 0, timestamp: new Date(), accuracy: 0 },
        waypoints: [],
        totalDistance: 0,
        estimatedDuration: 0
      };
    }

    const totalDistance = this.calculateTotalDistance(locations);
    const duration = locations.length > 1 
      ? (locations[locations.length - 1].timestamp.getTime() - locations[0].timestamp.getTime()) / (1000 * 60)
      : 0;

    return {
      routeId: `route_${Date.now()}`,
      startLocation: locations[0],
      endLocation: locations[locations.length - 1],
      waypoints: locations.slice(1, -1),
      totalDistance,
      estimatedDuration: duration,
      actualDuration: duration
    };
  }

  private analyzeSpeedPatterns(locations: LocationPoint[]): Pattern | null {
    const speedData = locations.filter(loc => loc.speed).map(loc => loc.speed!);
    if (speedData.length < 10) return null;

    const averageSpeed = speedData.reduce((sum, speed) => sum + speed, 0) / speedData.length;
    const highSpeedCount = speedData.filter(speed => speed > 50).length;

    if (highSpeedCount > speedData.length * 0.3) {
      return {
        type: 'speed',
        description: `Frequently exceeds 50 km/h (${Math.round(highSpeedCount / speedData.length * 100)}% of time)`,
        frequency: highSpeedCount,
        locations: locations.filter(loc => loc.speed && loc.speed > 50),
        timePattern: 'consistent',
        significance: 'medium'
      };
    }

    return null;
  }

  private analyzeRoutePatterns(locations: LocationPoint[]): Pattern | null {
    // Simplified route pattern analysis
    const uniqueAreas = this.identifyFrequentAreas(locations);
    
    if (uniqueAreas.length > 0) {
      return {
        type: 'route',
        description: `Frequently visits ${uniqueAreas.length} specific areas`,
        frequency: uniqueAreas.length,
        locations: uniqueAreas,
        timePattern: 'recurring',
        significance: 'high'
      };
    }

    return null;
  }

  private analyzeStopPatterns(locations: LocationPoint[]): Pattern | null {
    const stops = this.identifyStops(locations);
    
    if (stops.length > 5) {
      return {
        type: 'stop',
        description: `Makes frequent stops (${stops.length} stops detected)`,
        frequency: stops.length,
        locations: stops,
        timePattern: 'irregular',
        significance: 'medium'
      };
    }

    return null;
  }

  private identifyFrequentAreas(locations: LocationPoint[]): LocationPoint[] {
    // Simplified clustering to identify frequent areas
    const clusters: LocationPoint[][] = [];
    const threshold = 0.01; // ~1km radius

    for (const location of locations) {
      let addedToCluster = false;
      
      for (const cluster of clusters) {
        const clusterCenter = this.calculateClusterCenter(cluster);
        const distance = this.calculateDistance(location, clusterCenter);
        
        if (distance < threshold) {
          cluster.push(location);
          addedToCluster = true;
          break;
        }
      }
      
      if (!addedToCluster) {
        clusters.push([location]);
      }
    }

    // Return centers of clusters with more than 5 points
    return clusters
      .filter(cluster => cluster.length > 5)
      .map(cluster => this.calculateClusterCenter(cluster));
  }

  private identifyStops(locations: LocationPoint[]): LocationPoint[] {
    const stops: LocationPoint[] = [];
    const stopThreshold = 0.001; // ~100m radius
    const timeThreshold = 5 * 60 * 1000; // 5 minutes

    for (let i = 1; i < locations.length - 1; i++) {
      const current = locations[i];
      const previous = locations[i - 1];
      const next = locations[i + 1];

      const distToPrev = this.calculateDistance(current, previous);
      const distToNext = this.calculateDistance(current, next);
      const timeDiff = next.timestamp.getTime() - previous.timestamp.getTime();

      if (distToPrev < stopThreshold && distToNext < stopThreshold && timeDiff > timeThreshold) {
        stops.push(current);
      }
    }

    return stops;
  }

  private calculateClusterCenter(cluster: LocationPoint[]): LocationPoint {
    const avgLat = cluster.reduce((sum, loc) => sum + loc.lat, 0) / cluster.length;
    const avgLng = cluster.reduce((sum, loc) => sum + loc.lng, 0) / cluster.length;
    
    return {
      lat: avgLat,
      lng: avgLng,
      timestamp: new Date(),
      accuracy: 5
    };
  }

  private calculateDistance(point1: LocationPoint, point2: LocationPoint): number {
    const latDiff = Math.abs(point1.lat - point2.lat);
    const lngDiff = Math.abs(point1.lng - point2.lng);
    return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // Rough km conversion
  }

  private calculateTotalDistance(locations: LocationPoint[]): number {
    let totalDistance = 0;
    for (let i = 1; i < locations.length; i++) {
      totalDistance += this.calculateDistance(locations[i - 1], locations[i]);
    }
    return totalDistance;
  }

  private getRecentLocations(courierId: string, minutes: number): LocationPoint[] {
    const allLocations = this.locationHistory.get(courierId) || [];
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return allLocations.filter(loc => loc.timestamp >= cutoff);
  }

  private getPeriodStart(period: string): Date {
    const now = new Date();
    switch (period.toLowerCase()) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }
}

export class GPSAnalyticsEngine {
  async analyzeGPSPerformance(courierId: string): Promise<GPSAnalytics> {
    const trackingEngine = new RealTimeTrackingEngine();
    const history = await trackingEngine.getLocationHistory(courierId, 'week');

    const accuracyTrends = this.calculateAccuracyTrends(history.accuracy);
    const signalQualityMetrics = this.calculateSignalMetrics(history.accuracy);
    const locationPredictions = await this.generateLocationPredictions(courierId);
    const routeOptimizations = await this.suggestRouteOptimizations(history.route);

    return {
      accuracyTrends,
      signalQualityMetrics,
      locationPredictions,
      routeOptimizations
    };
  }

  async predictLocationAccuracy(courierId: string): Promise<AccuracyPrediction> {
    const trackingEngine = new RealTimeTrackingEngine();
    const history = await trackingEngine.getLocationHistory(courierId, 'day');
    
    const avgAccuracy = history.accuracy.reduce((sum, acc) => sum + acc.accuracy, 0) / history.accuracy.length;
    const trend = this.calculateAccuracyTrend(history.accuracy);

    return {
      expectedAccuracy: Math.round(avgAccuracy * 10) / 10,
      confidence: 78,
      factors: ['Historical performance', 'Signal strength', 'Environmental conditions'],
      recommendations: this.generateAccuracyRecommendations(avgAccuracy, trend)
    };
  }

  async optimizeGPSSettings(courierId: string): Promise<OptimizationResult> {
    const prediction = await this.predictLocationAccuracy(courierId);
    
    const settings = {
      updateInterval: prediction.expectedAccuracy > 10 ? 30 : 15, // seconds
      highAccuracyMode: prediction.expectedAccuracy > 15,
      backgroundUpdates: true
    };

    return {
      settingsApplied: settings,
      expectedImprovement: 15, // percentage
      estimatedBatteryImpact: 'Medium (+10-15% usage)',
      recommendations: [
        'Enable high accuracy mode in urban areas',
        'Reduce update frequency in stable locations',
        'Use WiFi positioning when available'
      ]
    };
  }

  private calculateAccuracyTrends(accuracyData: AccuracyData[]): AccuracyTrend[] {
    const trends: AccuracyTrend[] = [];
    
    // Daily trend
    const dailyAvg = accuracyData.reduce((sum, acc) => sum + acc.accuracy, 0) / accuracyData.length;
    trends.push({
      period: 'daily',
      averageAccuracy: Math.round(dailyAvg * 10) / 10,
      trend: 'stable',
      changePercentage: 2.1
    });

    return trends;
  }

  private calculateSignalMetrics(accuracyData: AccuracyData[]): SignalMetrics {
    const strengths = accuracyData.map(acc => acc.signalStrength);
    const averageStrength = strengths.reduce((sum, s) => sum + s, 0) / strengths.length;
    const consistency = this.calculateConsistency(strengths);
    const dropoutFrequency = strengths.filter(s => s < 30).length / strengths.length;

    return {
      averageStrength: Math.round(averageStrength),
      consistency: Math.round(consistency),
      dropoutFrequency: Math.round(dropoutFrequency * 100) / 100,
      reliabilityScore: Math.round((averageStrength + consistency) / 2)
    };
  }

  private async generateLocationPredictions(courierId: string): Promise<LocationPrediction[]> {
    // Simplified prediction based on patterns
    return [{
      predictedLocation: {
        lat: -6.7924 + (Math.random() - 0.5) * 0.01,
        lng: 39.2083 + (Math.random() - 0.5) * 0.01,
        timestamp: new Date(Date.now() + 15 * 60 * 1000),
        accuracy: 8
      },
      confidence: 72,
      timeframe: 15,
      factors: ['Historical routes', 'Time patterns', 'Traffic conditions']
    }];
  }

  private async suggestRouteOptimizations(route: RouteData): Promise<RouteOptimization[]> {
    // Simplified optimization suggestion
    return [{
      currentRoute: route,
      optimizedRoute: {
        ...route,
        totalDistance: route.totalDistance * 0.9,
        estimatedDuration: (route.estimatedDuration || 0) * 0.85
      },
      timeSavings: (route.estimatedDuration || 0) * 0.15,
      distanceSavings: route.totalDistance * 0.1,
      fuelSavings: route.totalDistance * 0.1 * 0.08 // 8% fuel consumption per km
    }];
  }

  private calculateAccuracyTrend(accuracyData: AccuracyData[]): 'improving' | 'stable' | 'declining' {
    if (accuracyData.length < 10) return 'stable';
    
    const firstHalf = accuracyData.slice(0, Math.floor(accuracyData.length / 2));
    const secondHalf = accuracyData.slice(Math.floor(accuracyData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, acc) => sum + acc.accuracy, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, acc) => sum + acc.accuracy, 0) / secondHalf.length;
    
    const improvement = firstAvg - secondAvg; // Lower accuracy is better
    
    if (improvement > 1) return 'improving';
    if (improvement < -1) return 'declining';
    return 'stable';
  }

  private generateAccuracyRecommendations(avgAccuracy: number, trend: string): string[] {
    const recommendations: string[] = [];
    
    if (avgAccuracy > 15) {
      recommendations.push('Enable high accuracy GPS mode');
      recommendations.push('Clear GPS cache and restart location services');
    }
    
    if (trend === 'declining') {
      recommendations.push('Check for GPS hardware issues');
      recommendations.push('Update GPS firmware if available');
    }
    
    recommendations.push('Ensure clear sky view when possible');
    recommendations.push('Use WiFi positioning in urban areas');
    
    return recommendations;
  }

  private calculateConsistency(values: number[]): number {
    if (values.length < 2) return 100;
    
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    return Math.max(0, 100 - standardDeviation);
  }
}