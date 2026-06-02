import { ICourierRepository } from '../../domain/repositories';
import { LogisticsEngine } from '../../domain/engines/logistics.engine';
import { WeatherServicePort } from '../../domain/engines/ports/weather.port';
import { TrafficServicePort } from '../../domain/engines/ports/traffic.port';
import { RouteOptimizationPort } from '../../domain/engines/ports/route-optimization.port';
import { RealTimeTrackingPort } from '../../domain/engines/ports/tracking.port';
import { CourierAssignmentPolicy } from '../../domain/policies/courier-assignment.policy';
import { CourierSelectionEngine } from '../../domain/engines/courier-selection.engine';
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
  desiredArrivalTime?: Date; // Optional: Client's preferred delivery time
  estimatedArrivalMinutes?: number; // Optional: Client's estimate of arrival time
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
    private courierRepository: ICourierRepository,
    private weatherPort: WeatherServicePort,
    private trafficPort: TrafficServicePort,
    private routePort: RouteOptimizationPort,
    private trackingPort: RealTimeTrackingPort,
    private courierPolicy: CourierAssignmentPolicy
  ) { }

  async execute(input: CreateDeliveryInput): Promise<CreateDeliveryOutput> {
    // APPLICATION LAYER: Pure orchestration - no business logic
    // All business rules moved to domain layer

    console.log('🔍 DEBUG - CreateDeliveryUseCase.execute called with input:', JSON.stringify(input, null, 2));

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

    console.log('🔍 DEBUG - Pickup location:', pickupGeoPoint.getCoordinates());
    console.log('🔍 DEBUG - Delivery location:', deliveryGeoPoint.getCoordinates());

    // Parallel infrastructure calls (orchestration only)
    const [availableCouriers, routeAlternatives, weatherData, trafficData] = await Promise.allSettled([
      this.courierRepository.findAvailableCouriers(pickupGeoPoint, 50),
      this.routePort.getRouteAlternatives(pickupGeoPoint, deliveryGeoPoint, 3),
      this.weatherPort.getWeatherData(deliveryGeoPoint),
      this.trafficPort.getTrafficData(pickupGeoPoint, deliveryGeoPoint)
    ]);

    // Handle infrastructure failures gracefully
    const couriers = availableCouriers.status === 'fulfilled' ? availableCouriers.value : [];
    let routes = routeAlternatives.status === 'fulfilled' ? routeAlternatives.value : [];

    console.log('🔍 DEBUG - Available couriers result:', availableCouriers.status);
    console.log('🔍 DEBUG - Couriers found:', couriers.length);
    if (couriers.length > 0) {
      console.log('🔍 DEBUG - First courier:', JSON.stringify(couriers[0], null, 2));
    }
    console.log('🔍 DEBUG - Route alternatives result:', routeAlternatives.status);
    console.log('🔍 DEBUG - Routes found:', routes.length);
    const weather = weatherData.status === 'fulfilled' ? weatherData.value : { severity: 'low' };
    const traffic = trafficData.status === 'fulfilled' ? trafficData.value : { congestionLevel: 0 };

    if (couriers.length === 0) {
      throw new Error('No couriers available for delivery');
    }

    if (routes.length === 0) {
      console.warn('Local route alternatives unavailable, requesting primary local route');
      const primaryRoute = await this.routePort.calculateOptimalRoute(pickupGeoPoint, deliveryGeoPoint);
      routes = [primaryRoute];
    }

    // Step 3: Apply domain business rules for courier selection
    const weight = Weight.fromKilograms(input.weight);
    const defaultTimeWindow = this.logisticsEngine.getDefaultTimeWindowForPriority(input.priority);
    const timeWindow = input.timeWindow
      ? TimeWindow.create(input.timeWindow.earliest, input.timeWindow.latest)
      : TimeWindow.create(defaultTimeWindow.earliest, defaultTimeWindow.latest);

    // Convert to domain entities for policy evaluation
    const domainCouriers = couriers.map(courier =>
      CourierEntity.create({
        id: courier.id,
        name: courier.name,
        phone: courier.phone,
        vehicle: courier.vehicle,
        rating: courier.rating,
        completionRate: courier.completionRate,
        currentLocation: courier.currentLocation,
        isAvailable: courier.isAvailable,
        trafficExperience: courier.trafficExperience
      })
    );

    // Apply domain selection engine (business rule)
    const selectionEngine = new CourierSelectionEngine(this.courierPolicy);
    const selection = selectionEngine.selectCourier(domainCouriers, {
      pickupLocation: pickupGeoPoint,
      deliveryLocation: deliveryGeoPoint,
      weight,
      priority: input.priority,
      specialRequirements: input.specialRequirements
    });
    const optimalCourier = selection.courier;

    if (!optimalCourier) {
      throw new Error('No suitable courier found for delivery requirements');
    }

    // Step 4: Calculate estimates using domain business rules
    const optimalRoute = routes[0];
    const weatherSeverity = weather.severity === 'extreme' ? 'high' : (weather.severity || 'low');
    const timeEstimates = this.logisticsEngine.calculateTimeEstimates(
      optimalRoute.totalDuration,
      weatherSeverity as 'low' | 'medium' | 'high',
      traffic.congestionLevel || 0
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
        waypoints: optimalRoute.waypoints?.map((waypoint: GeoPoint) => {
          const coords = waypoint.getCoordinates();
          return {
            lat: coords.lat,
            lng: coords.lng,
            type: 'waypoint' as const
          };
        }) || [
            {
              lat: input.pickupLocation.lat,
              lng: input.pickupLocation.lng,
              type: 'pickup' as const
            },
            {
              lat: input.deliveryLocation.lat,
              lng: input.deliveryLocation.lng,
              type: 'delivery' as const
            }
          ]
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

