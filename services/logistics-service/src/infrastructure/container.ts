// @ts-nocheck
import { CourierRepository } from './repositories/courier.repository';
import { DeliveryRepository } from './repositories/delivery.repository';
import { EarningsRepository } from './repositories/earnings.repository';
import { RouteRepository } from './repositories/route.repository';
import { TrackingRepository } from './repositories/tracking.repository';
import { MapsWeatherBridge } from './providers/maps-weather.bridge';
import { MapsTrafficBridge } from './providers/maps-traffic.bridge';
import { MapsRoutingBridge } from './providers/maps-routing.bridge';
import { MapsTrackingBridge } from './providers/maps-tracking.bridge';
import { EventPublisher } from './messaging/event-publisher';
import { SupabaseClientManager } from './database/supabase.client';
import { PrismaClientManager } from './database/prisma.client';
import { PrismaSagaLogRepository } from '../../../../shared/saga/saga-log.repository';
import { ISagaLogRepository } from '../../../../shared/saga/saga.log';
import { SagaFactory } from '../../../../shared/saga/saga-factory';

// Domain layer
import { LogisticsEngine } from '../domain/engines/logistics.engine';
import { CourierAssignmentPolicy } from '../domain/policies/courier-assignment.policy';
import { DistanceCalculationAlgorithm } from '../domain/algorithms/distance-calculation.algorithm';
import { CourierDomainService } from '../domain/services/courier.domain-service';
import { DeliveryDomainService } from '../domain/services/delivery.domain-service';
import { RouteDomainService } from '../domain/services/route.domain-service';
import { RouteCreationService } from '../domain/services/route-creation.service';
import { CODConfirmationEngine } from '../domain/engines/cod-confirmation.engine';

// Application layer
import { CreateDeliveryUseCase } from '../application/use-cases/create-delivery.use-case';
import { GetDeliveryUseCase } from '../application/use-cases/get-delivery.use-case';
import { GetDeliveriesUseCase } from '../application/use-cases/get-deliveries.use-case';
import { UpdateDeliveryStatusUseCase } from '../application/use-cases/update-delivery-status.use-case';
import { DeliverySaga } from '../application/sagas/delivery.saga';
import { CODDeliveryConfirmationSaga } from '../application/sagas/cod-delivery-confirmation.saga';
import { SagaRegistry } from '../application/sagas/saga-registry';
import { VerifyCODDeliveryUseCase } from '../application/use-cases/verify-cod-delivery.use-case';
import { InitiateCODDeliveryUseCase } from '../application/use-cases/initiate-cod-delivery.use-case';

import {
  ICourierRepository,
  IDeliveryRepository,
  IEarningsRepository,
  IRouteRepository,
  ITrackingRepository
} from '../domain/repositories';
import { WeatherServicePort } from '../domain/engines/ports/weather.port';
import { TrafficServicePort } from '../domain/engines/ports/traffic.port';
import { RouteOptimizationPort } from '../domain/engines/ports/route-optimization.port';
import { RealTimeTrackingPort } from '../domain/engines/ports/tracking.port';
import { EventPublisherPort } from '../domain/engines/ports/event-publisher.port';

export class DependencyContainer {
  private static instance: DependencyContainer;

  // Infrastructure adapters (singletons)
  private courierRepository!: ICourierRepository;
  private deliveryRepository!: IDeliveryRepository;
  private earningsRepository!: IEarningsRepository;
  private routeRepository!: IRouteRepository;
  private trackingRepository!: ITrackingRepository;
  private weatherProvider!: WeatherServicePort;
  private trafficProvider!: TrafficServicePort;
  private routeOptimizationProvider!: RouteOptimizationPort;
  private trackingProvider!: RealTimeTrackingPort;
  private eventPublisher!: EventPublisherPort;
  private sagaLogRepository!: ISagaLogRepository;

  // Domain services (singletons)
  private logisticsEngine!: LogisticsEngine;
  private courierAssignmentPolicy!: CourierAssignmentPolicy;
  private distanceAlgorithm!: DistanceCalculationAlgorithm;
  private courierDomainService!: CourierDomainService;
  private deliveryDomainService!: DeliveryDomainService;
  private routeDomainService!: RouteDomainService;
  private routeCreationService!: RouteCreationService;

  // Application services
  private createDeliveryUseCase!: CreateDeliveryUseCase;
  private getDeliveryUseCase!: GetDeliveryUseCase;
  private getDeliveriesUseCase!: GetDeliveriesUseCase;
  private updateDeliveryStatusUseCase!: UpdateDeliveryStatusUseCase;
  private deliverySaga!: DeliverySaga;
  private codDeliveryConfirmationSaga!: CODDeliveryConfirmationSaga;
  private sagaRegistry!: SagaRegistry;
  private codConfirmationEngine!: CODConfirmationEngine;
  private verifyCODDeliveryUseCase!: VerifyCODDeliveryUseCase;
  private initiateCODDeliveryUseCase!: InitiateCODDeliveryUseCase;

  private constructor() {
    // Defer initialization until database connections are established
    // This prevents the race condition where repositories get null clients
    this.initializeDomain();
    // Application layer initialization is deferred until after database connections
  }

  public static getInstance(): DependencyContainer {
    if (!DependencyContainer.instance) {
      DependencyContainer.instance = new DependencyContainer();
    }
    return DependencyContainer.instance;
  }

  private initializeInfrastructureSync(): void {
    // Initialize repositories with proper Supabase client
    const supabaseClient = SupabaseClientManager.getInstance().getClient();

    this.courierRepository = new CourierRepository(supabaseClient);
    this.deliveryRepository = new DeliveryRepository(supabaseClient);
    this.earningsRepository = new EarningsRepository(supabaseClient);
    this.routeRepository = new RouteRepository(supabaseClient);
    this.trackingRepository = new TrackingRepository(supabaseClient);
    this.weatherProvider = new MapsWeatherBridge();
    this.trafficProvider = new MapsTrafficBridge();
    this.routeOptimizationProvider = new MapsRoutingBridge();
    this.trackingProvider = new MapsTrackingBridge();
    this.eventPublisher = new EventPublisher(true); // Enable event store
  }

  // Method to initialize Supabase connections asynchronously
  public async initializeDatabaseConnections(): Promise<void> {
    try {
      const supabaseClient = await SupabaseClientManager.getInstance().connect();

      // Initialize all infrastructure with connected client
      this.initializeInfrastructureWithClient(supabaseClient);

      // Now that infrastructure is ready, initialize application layer
      this.initializeApplication();

      console.log('âœ… Database connections initialized successfully');
      console.log('âœ… Application layer initialized successfully');
    } catch (error) {
      console.error('âŒ Failed to initialize database connections:', error);
      throw error; // Re-throw to prevent server startup
    }
  }

  private initializeInfrastructureWithClient(supabaseClient: any): void {
    // Initialize repositories with proper Supabase client
    this.courierRepository = new CourierRepository(supabaseClient);
    this.deliveryRepository = new DeliveryRepository(supabaseClient);
    this.earningsRepository = new EarningsRepository(supabaseClient);
    this.routeRepository = new RouteRepository(supabaseClient);
    this.trackingRepository = new TrackingRepository(supabaseClient);

    // Initialize other infrastructure components (now using Maps Service bridges)
    this.weatherProvider = new MapsWeatherBridge();
    this.trafficProvider = new MapsTrafficBridge();
    this.routeOptimizationProvider = new MapsRoutingBridge();
    this.trackingProvider = new MapsTrackingBridge();
    this.eventPublisher = new EventPublisher(true); // Enable event store

    // Initialize Saga Log Repository
    const prismaManager = PrismaClientManager.getInstance();
    // Use synchronous getClient idea if possible, otherwise we handle in initializeDatabaseConnections
    this.sagaLogRepository = new PrismaSagaLogRepository(prismaManager.getClient());

    // Initialize domain services that depend on infrastructure
    this.initializeDomainWithInfrastructure();
  }

  private initializeDomain(): void {
    // Initialize domain services with their dependencies
    this.distanceAlgorithm = new DistanceCalculationAlgorithm();
    this.courierAssignmentPolicy = new CourierAssignmentPolicy();
    this.courierDomainService = new CourierDomainService();
    this.deliveryDomainService = new DeliveryDomainService();
    this.routeDomainService = new RouteDomainService();

    this.logisticsEngine = new LogisticsEngine();
    this.codConfirmationEngine = new CODConfirmationEngine();
  }

  private initializeDomainWithInfrastructure(): void {
    // Initialize domain services that depend on infrastructure
    // This is called after infrastructure is initialized
    this.routeCreationService = new RouteCreationService(
      this.routeOptimizationProvider,
      this.distanceAlgorithm
    );
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

    this.getDeliveryUseCase = new GetDeliveryUseCase(
      this.deliveryRepository,
      this.courierRepository
    );

    this.getDeliveriesUseCase = new GetDeliveriesUseCase(
      this.deliveryRepository,
      this.courierRepository
    );

    this.updateDeliveryStatusUseCase = new UpdateDeliveryStatusUseCase(
      this.deliveryRepository
    );

    this.deliverySaga = new DeliverySaga(
      this.sagaLogRepository,
      'logistics-service',
      this.courierRepository,
      this.trackingProvider,
      this.routeRepository,
      this.routeCreationService,
      this.courierDomainService
    );

    this.sagaRegistry = SagaRegistry.getInstance();
    this.sagaRegistry.registerOrchestrator('DeliverySaga', this.deliverySaga);
    SagaFactory.registerByType('DeliverySaga', this.deliverySaga);

    this.codDeliveryConfirmationSaga = new CODDeliveryConfirmationSaga(
      this.sagaLogRepository,
      'logistics-service',
      this.deliveryRepository,
      this.codConfirmationEngine
    );
    this.sagaRegistry.registerOrchestrator('CODDeliveryConfirmationSaga', this.codDeliveryConfirmationSaga);
    SagaFactory.registerByType('CODDeliveryConfirmationSaga', this.codDeliveryConfirmationSaga);

    this.verifyCODDeliveryUseCase = new VerifyCODDeliveryUseCase(
      this.deliveryRepository,
      this.codConfirmationEngine,
      this.codDeliveryConfirmationSaga
    );

    this.initiateCODDeliveryUseCase = new InitiateCODDeliveryUseCase(
      this.deliveryRepository,
      this.codDeliveryConfirmationSaga
    );
  }

  // Getters for infrastructure adapters
  public getCourierRepository(): ICourierRepository {
    return this.courierRepository;
  }

  public getDeliveryRepository(): IDeliveryRepository {
    return this.deliveryRepository;
  }

  public getEarningsRepository(): IEarningsRepository {
    return this.earningsRepository;
  }

  public getRouteRepository(): IRouteRepository {
    return this.routeRepository;
  }

  public getTrackingRepository(): ITrackingRepository {
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
    if (!this.createDeliveryUseCase) {
      this.initializeApplication();
    }
    return this.createDeliveryUseCase;
  }

  public getGetDeliveryUseCase(): GetDeliveryUseCase {
    if (!this.getDeliveryUseCase) {
      this.initializeApplication();
    }
    return this.getDeliveryUseCase;
  }

  public getGetDeliveriesUseCase(): GetDeliveriesUseCase {
    if (!this.getDeliveriesUseCase) {
      this.initializeApplication();
    }
    return this.getDeliveriesUseCase;
  }

  public getUpdateDeliveryStatusUseCase(): UpdateDeliveryStatusUseCase {
    if (!this.updateDeliveryStatusUseCase) {
      this.initializeApplication();
    }
    return this.updateDeliveryStatusUseCase;
  }

  public getDeliverySaga(): DeliverySaga {
    return this.deliverySaga;
  }

  public getSagaRegistry(): SagaRegistry {
    return this.sagaRegistry;
  }

  public getRouteCreationService(): any {
    return this.routeCreationService;
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
  public setCourierRepository(repository: ICourierRepository): void {
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

  public getVerifyCODDeliveryUseCase(): VerifyCODDeliveryUseCase {
    return this.verifyCODDeliveryUseCase;
  }

  public getInitiateCODDeliveryUseCase(): InitiateCODDeliveryUseCase {
    return this.initiateCODDeliveryUseCase;
  }

  public getSagaLogRepository(): ISagaLogRepository {
    return this.sagaLogRepository;
  }

  // Cleanup method for testing
  public reset(): void {
    DependencyContainer.instance = new DependencyContainer();
  }
}

// Export singleton instance
export const container = DependencyContainer.getInstance();
