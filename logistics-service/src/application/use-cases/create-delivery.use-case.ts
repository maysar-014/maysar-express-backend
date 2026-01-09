import { LogisticsEngine } from '../../domain/engines/logistics.engine';
import { CourierRepositoryPort } from '../../domain/engines/ports/courier.port';
import { WeatherServicePort } from '../../domain/engines/ports/weather.port';
import { TrafficServicePort } from '../../domain/engines/ports/traffic.port';
import { RouteOptimizationPort } from '../../domain/engines/ports/route-optimization.port';
import { RealTimeTrackingPort } from '../../domain/engines/ports/tracking.port';
import { CourierAssignmentPolicy } from '../../domain/policies/courier-assignment.policy';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { Weight } from '../../domain/value-objects/weight.value-object';
import { TimeWindow } from '../../domain/value-objects/time-window.value-object';
import { CourierEntity } from '../../domain/entities/courier.entity';

export interface CreateDeliveryInput {
  orderId: string;
  pickupLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  deliveryLocation: {
    lat: number;
    lng: number;
    address: string;
  };
  weight: number; // in kg
  priority: 'standard' | 'express' | 'urgent';
  timeWindow?: {
    earliest: Date;
    latest: Date;
  };
  specialRequirements?: string[];
}

export interface CreateDeliveryOutput {
  deliveryId: string;
  courierId: string;
  courierName: string;
  estimatedPickupTime: Date;
  estimatedDeliveryTime: Date;
  totalCost: number;
  route: {
    distance: number;
    duration: number;
    waypoints: Array<{
      lat: number;
      lng: number;
      type: 'pickup' | 'delivery' | 'waypoint';
    }>;
  };
}

export class CreateDeliveryUseCase {
  constructor(
    private logisticsEngine: LogisticsEngine,
    private courierPort: CourierRepositoryPort,
    private weatherPort: WeatherServicePort,
    private trafficPort: TrafficServicePort,
    private routePort: RouteOptimizationPort,
    private trackingPort: RealTimeTrackingPort,
    private courierPolicy: CourierAssignmentPolicy
  ) {}

  async execute(input: CreateDeliveryInput): Promise<CreateDeliveryOutput> {
    // APPLICATION LAYER: Pure orchestration - no business logic
    // All business rules moved to domain layer

    // Step 1: Validate input using domain business rules
    const validationResult = this.logisticsEngine.validateDeliveryInput(input);
    if (!validationResult.isValid) {
      throw new Error(`Invalid delivery request: ${validationResult.violations.join(', ')}`);
    }

    // Step 2: Get external data through infrastructure ports
    const pickupGeoPoint = GeoPoint.create(
      input.pickupLocation.lat,
      input.pickupLocation.lng,
      input.pickupLocation.address
    );

    const deliveryGeoPoint = GeoPoint.create(
      input.deliveryLocation.lat,
      input.deliveryLocation.lng,
      input.deliveryLocation.address
    );

    // Parallel infrastructure calls (orchestration only)
    const [availableCouriers, routeAlternatives, weatherData, trafficData] = await Promise.all([
      this.courierPort.findAvailableCouriers(pickupGeoPoint, 50),
      this.routePort.getRouteAlternatives(pickupGeoPoint, deliveryGeoPoint, 3),
      this.weatherPort.getWeatherData(deliveryGeoPoint),
      this.trafficPort.getTrafficData(pickupGeoPoint, deliveryGeoPoint)
    ]);

    if (availableCouriers.length === 0) {
      throw new Error('No couriers available for delivery');
    }

    // Step 3: Apply domain business rules for courier selection
    const weight = Weight.fromKilograms(input.weight);
    const defaultTimeWindow = this.logisticsEngine.getDefaultTimeWindowForPriority(input.priority);
    const timeWindow = input.timeWindow
      ? TimeWindow.create(input.timeWindow.earliest, input.timeWindow.latest)
      : TimeWindow.create(defaultTimeWindow.earliest, defaultTimeWindow.latest);

    // Convert to domain entities for policy evaluation
    const domainCouriers = availableCouriers.map(courier =>
      new CourierEntity(
        courier.id,
        courier.name,
        courier.phone,
        courier.vehicle,
        courier.rating,
        courier.completionRate,
        courier.currentLocation,
        courier.isAvailable,
        courier.estimatedArrivalTime,
        courier.trafficExperience
      )
    );

    // Apply domain policy (business rule)
    const optimalCourier = this.courierPolicy.selectOptimalCourier(domainCouriers, {
      pickupLocation: pickupGeoPoint,
      deliveryLocation: deliveryGeoPoint,
      weight,
      priority: input.priority,
      specialRequirements: input.specialRequirements
    });

    if (!optimalCourier) {
      throw new Error('No suitable courier found for delivery requirements');
    }

    // Step 4: Calculate estimates using domain business rules
    const optimalRoute = routeAlternatives[0];
    const weatherSeverity = weatherData.severity === 'extreme' ? 'high' : (weatherData.severity || 'low');
    const timeEstimates = this.logisticsEngine.calculateTimeEstimates(
      optimalRoute.totalDuration,
      weatherSeverity as 'low' | 'medium' | 'high',
      trafficData.congestionLevel || 0
    );

    // Calculate cost using domain business rules
    const totalCost = this.logisticsEngine.calculateDeliveryCost(
      optimalRoute.totalDistance,
      input.weight,
      input.priority
    );

    // Generate ID using domain business rules
    const deliveryId = this.logisticsEngine.generateDeliveryId(input.orderId);

    // APPLICATION LAYER: Return orchestrated result
    return {
      deliveryId,
      courierId: optimalCourier.id,
      courierName: optimalCourier.name,
      estimatedPickupTime: new Date(Date.now() + timeEstimates.pickupBufferMinutes * 60 * 1000),
      estimatedDeliveryTime: new Date(Date.now() + timeEstimates.totalDurationMinutes * 60 * 1000),
      totalCost,
      route: {
        distance: optimalRoute.totalDistance,
        duration: optimalRoute.totalDuration,
        waypoints: optimalRoute.waypoints?.map((w: any) => ({
          lat: w.lat || w.location?.getLatitude() || 0,
          lng: w.lng || w.location?.getLongitude() || 0,
          type: w.type || 'waypoint'
        })) || []
      }
    };
  }

  // REMOVED: Business logic methods moved to domain layer
  // - validateInput(): Now in LogisticsEngine.validateDeliveryInput()
  // - getDefaultTimeWindow(): Now in LogisticsEngine.getDefaultTimeWindowForPriority()
  // - calculateFinalEstimates(): Business logic moved to domain
  // - generateDeliveryId(): Now in LogisticsEngine.generateDeliveryId()

  // APPLICATION LAYER: Now contains ONLY orchestration logic
  // All business rules properly isolated in domain layer
}
