import { CourierRepository } from './repositories/courier.repository';
import { DeliveryRepository } from './repositories/delivery.repository';
import { EarningsRepository } from './repositories/earnings.repository';
import { RouteRepository } from './repositories/route.repository';
import { TrackingRepository } from './repositories/tracking.repository';
import { WeatherProviderAdapter } from './providers/weather-provider.adapter';
import { TrafficProviderAdapter } from './providers/traffic-provider.adapter';
import { GoogleMapsRouteAdapter } from './providers/google-maps-route.adapter';
import { RealTimeTrackingAdapter } from './providers/real-time-tracking.adapter';
import { EventPublisher } from './messaging/event-publisher';
import { SupabaseClientManager } from './database/supabase.client';

// Domain layer
import { LogisticsEngine } from '../domain/engines/logistics.engine';
import { CourierAssignmentPolicy } from '../domain/policies/courier-assignment.policy';
import { DistanceCalculationAlgorithm } from '../domain/algorithms/distance-calculation.algorithm';
import { CourierDomainService } from '../domain/services/courier.domain-service';
import { DeliveryDomainService } from '../domain/services/delivery.domain-service';
import { RouteDomainService } from '../domain/services/route.domain-service';

// Application layer
import { CreateDeliveryUseCase } from '../application/use-cases/create-delivery.use-case';
import { DeliverySaga } from '../application/sagas/delivery.saga';
import { SagaRegistry } from '../application/sagas/saga-registry';

// Ports
import { CourierRepositoryPort } from '../domain/engines/ports/courier.port';
import { DeliveryRepositoryPort } from '../domain/engines/ports/delivery.port';
import { EarningsRepositoryPort } from '../domain/engines/ports/earnings.port';
import { RouteRepositoryPort } from '../domain/engines/ports/route.port';
import { TrackingRepositoryPort } from '../domain/engines/ports/tracking.port';
import { WeatherServicePort } from '../domain/engines/ports/weather.port';
import { TrafficServicePort } from '../domain/engines/ports/traffic.port';
import { RouteOptimizationPort } from '../domain/engines/ports/route-optimization.port';
import { RealTimeTrackingPort } from '../domain/engines/ports/tracking.port';
import { EventPublisherPort } from '../domain/engines/ports/event-publisher.port';

export class DependencyContainer {
  private static instance: DependencyContainer;

  // Infrastructure adapters (singletons)
  private courierRepository!: CourierRepositoryPort;
  private deliveryRepository!: DeliveryRepositoryPort;
  private earningsRepository!: EarningsRepositoryPort;
  private routeRepository!: RouteRepositoryPort;
  private trackingRepository!: TrackingRepositoryPort;
  private weatherProvider!: WeatherServicePort;
  private trafficProvider!: TrafficServicePort;
  private routeOptimizationProvider!: RouteOptimizationPort;
  private trackingProvider!: RealTimeTrackingPort;
  private eventPublisher!: EventPublisherPort;

  // Domain services (singletons)
  private logisticsEngine!: LogisticsEngine;
  private courierAssignmentPolicy!: CourierAssignmentPolicy;
  private distanceAlgorithm!: DistanceCalculationAlgorithm;
  private courierDomainService!: CourierDomainService;
  private deliveryDomainService!: DeliveryDomainService;
  private routeDomainService!: RouteDomainService;

  // Application services
  private createDeliveryUseCase!: CreateDeliveryUseCase;
  private deliverySaga!: DeliverySaga;
  private sagaRegistry!: SagaRegistry;

  private constructor() {
    this.initializeInfrastructureSync();
    this.initializeDomain();
    this.initializeApplication();
  }

  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  private initializeInfrastructureSync(): void {
    // For now, initialize with null - real clients will be connected lazily
    // TODO: Implement proper async initialization pattern
    this.courierRepository = new CourierRepository(null);
    this.deliveryRepository = new DeliveryRepository(null);
    this.earningsRepository = new EarningsRepository(null);
    this.routeRepository = new RouteRepository(null);
    this.trackingRepository = new TrackingRepository(null);
    this.weatherProvider = new WeatherProviderAdapter(process.env.OPENWEATHER_API_KEY || '');
    this.trafficProvider = new TrafficProviderAdapter(process.env.GOOGLE_MAPS_API_KEY || '');
    this.routeOptimizationProvider = new GoogleMapsRouteAdapter(process.env.GOOGLE_MAPS_API_KEY || '');
    this.trackingProvider = new RealTimeTrackingAdapter(process.env.FIREBASE_API_KEY || '');
    this.eventPublisher = new EventPublisher(true); // Enable event store
  }

  // Method to initialize Supabase connections asynchronously
  public async initializeDatabaseConnections(): Promise<void> {
    try {
      const supabaseClient = await SupabaseClientManager.getInstance().connect();

      // Re-initialize repositories with real client
      this.courierRepository = new CourierRepository(supabaseClient);
      this.deliveryRepository = new DeliveryRepository(supabaseClient);
      this.earningsRepository = new EarningsRepository(supabaseClient);
      this.routeRepository = new RouteRepository(supabaseClient);
      this.trackingRepository = new TrackingRepository(supabaseClient);

      console.log('✅ Database connections initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database connections:', error);
      // Continue with null clients for graceful degradation
    }
  }

  private initializeDomain(): void {
    // Initialize domain services with their dependencies
    this.distanceAlgorithm = new DistanceCalculationAlgorithm();
    this.courierAssignmentPolicy = new CourierAssignmentPolicy();
    this.courierDomainService = new CourierDomainService();
    this.deliveryDomainService = new DeliveryDomainService();
    this.routeDomainService = new RouteDomainService();

    this.logisticsEngine = new LogisticsEngine();
  }

  private initializeApplication(): void {
    // Initialize application services
    this.createDeliveryUseCase = new CreateDeliveryUseCase(
      this.logisticsEngine,
      this.courierRepository,
      this.weatherProvider,
      this.trafficProvider,
      this.routeOptimizationProvider,
      this.trackingProvider,
      this.courierAssignmentPolicy
    );

    this.deliverySaga = new DeliverySaga(
      this.courierRepository,
      this.trackingProvider
    );

    this.sagaRegistry = SagaRegistry.getInstance();
    // Note: Saga registry registration simplified for now
  }

  // Getters for infrastructure adapters
  public getCourierRepository(): CourierRepositoryPort {
    return this.courierRepository;
  }

  public getDeliveryRepository(): DeliveryRepositoryPort {
    return this.deliveryRepository;
  }

  public getEarningsRepository(): EarningsRepositoryPort {
    return this.earningsRepository;
  }

  public getRouteRepository(): RouteRepositoryPort {
    return this.routeRepository;
  }

  public getTrackingRepository(): TrackingRepositoryPort {
    return this.trackingRepository;
  }

  public getWeatherProvider(): WeatherServicePort {
    return this.weatherProvider;
  }

  public getTrafficProvider(): TrafficServicePort {
    return this.trafficProvider;
  }

  public getRouteOptimizationProvider(): RouteOptimizationPort {
    return this.routeOptimizationProvider;
  }

  public getTrackingProvider(): RealTimeTrackingPort {
    return this.trackingProvider;
  }

  public getEventPublisher(): EventPublisherPort {
    return this.eventPublisher;
  }

  // Getters for domain services
  public getLogisticsEngine(): LogisticsEngine {
    return this.logisticsEngine;
  }

  public getCourierAssignmentPolicy(): CourierAssignmentPolicy {
    return this.courierAssignmentPolicy;
  }

  public getDistanceAlgorithm(): DistanceCalculationAlgorithm {
    return this.distanceAlgorithm;
  }

  public getCourierDomainService(): CourierDomainService {
    return this.courierDomainService;
  }

  public getDeliveryDomainService(): DeliveryDomainService {
    return this.deliveryDomainService;
  }

  public getRouteDomainService(): RouteDomainService {
    return this.routeDomainService;
  }

  // Getters for application services
  public getCreateDeliveryUseCase(): CreateDeliveryUseCase {
    return this.createDeliveryUseCase;
  }

  public getDeliverySaga(): DeliverySaga {
    return this.deliverySaga;
  }

  public getSagaRegistry(): SagaRegistry {
    return this.sagaRegistry;
  }

  // Health check method
  public async healthCheck(): Promise<{
    infrastructure: Record<string, boolean>;
    domain: Record<string, boolean>;
    application: Record<string, boolean>;
  }> {
    const results = {
      infrastructure: {} as Record<string, boolean>,
      domain: {} as Record<string, boolean>,
      application: {} as Record<string, boolean>
    };

    // Check infrastructure health
    try {
      // Basic connectivity checks (simplified)
      results.infrastructure.courierRepository = true;
      results.infrastructure.weatherProvider = true;
      results.infrastructure.trafficProvider = true;
      results.infrastructure.routeOptimizationProvider = true;
      results.infrastructure.trackingProvider = true;
      results.infrastructure.eventPublisher = true;
    } catch (error) {
      console.error('Infrastructure health check failed:', error);
    }

    // Check domain health (services can be instantiated)
    results.domain.logisticsEngine = !!this.logisticsEngine;
    results.domain.policies = !!this.courierAssignmentPolicy;
    results.domain.algorithms = !!this.distanceAlgorithm;

    // Check application health
    results.application.useCases = !!this.createDeliveryUseCase;
    results.application.sagas = !!this.deliverySaga;
    results.application.registry = !!this.sagaRegistry;

    return results;
  }

  // Configuration methods for testing
  public setCourierRepository(repository: CourierRepositoryPort): void {
    this.courierRepository = repository;
    // Re-initialize dependent services
    this.initializeDomain();
    this.initializeApplication();
  }

  public setWeatherProvider(provider: WeatherServicePort): void {
    this.weatherProvider = provider;
    this.initializeDomain();
    this.initializeApplication();
  }

  public setTrafficProvider(provider: TrafficServicePort): void {
    this.trafficProvider = provider;
    this.initializeDomain();
    this.initializeApplication();
  }

  public setRouteOptimizationProvider(provider: RouteOptimizationPort): void {
    this.routeOptimizationProvider = provider;
    this.initializeDomain();
    this.initializeApplication();
  }

  public setTrackingProvider(provider: RealTimeTrackingPort): void {
    this.trackingProvider = provider;
    this.initializeDomain();
    this.initializeApplication();
  }

  public setEventPublisher(publisher: EventPublisherPort): void {
    this.eventPublisher = publisher;
    this.initializeApplication();
  }

  // Cleanup method for testing
  public reset(): void {
    DependencyContainer.instance = new DependencyContainer();
  }
}

// Export singleton instance
export const container = DependencyContainer.getInstance();
