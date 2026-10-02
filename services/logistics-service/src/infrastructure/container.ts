// @ts-nocheck
import { RouteRepository } from './repositories/route.repository';
import { PrismaCourierRepository } from './repositories/prisma-courier.repository';
import { PrismaDeliveryRepository } from './repositories/prisma-delivery.repository';
import { PrismaEarningsRepository } from './repositories/prisma-earnings.repository';
import { PrismaTrackingRepository } from './repositories/prisma-tracking.repository';
import { MapsWeatherBridge } from './providers/maps-weather.bridge';
import { MapsTrafficBridge } from './providers/maps-traffic.bridge';
import { MapsRoutingBridge } from './providers/maps-routing.bridge';
import { MapsTrackingBridge } from './providers/maps-tracking.bridge';
import { EventPublisher } from './messaging/event-publisher';
import { LogisticsOutboxRepository } from './messaging/logistics-outbox.repository';
import prisma, { DatabaseConnection } from './database/prisma-client';
import { PrismaSagaLogRepository } from '../../../../shared/saga/saga-log.repository';
import { ISagaLogRepository } from '../../../../shared/saga/saga.log';
import { SagaFactory } from '../../../../shared/saga/saga-factory';

// Domain layer
import { LogisticsEngine } from '../domain/engines/logistics.engine';
import { CourierAssignmentPolicy } from '../domain/policies/courier-assignment.policy';
import { DistanceCalculationAlgorithm, DistanceFallbackConfig } from '../domain/algorithms/distance-calculation.algorithm';
import { CourierSelectionEngine } from '../domain/engines/courier-selection.engine';
import { RealTimeTrackingEngine } from '../domain/engines/real-time-tracking.engine';
import { CourierDomainService } from '../domain/services/courier.domain-service';
import { DeliveryDomainService } from '../domain/services/delivery.domain-service';
import { RouteDomainService } from '../domain/services/route.domain-service';
import { RouteCreationService, RouteCreationDefaults } from '../domain/services/route-creation.service';
import { CODConfirmationEngine } from '../domain/engines/cod-confirmation.engine';

// Application layer
import { CreateDeliveryUseCase } from '../application/use-cases/create-delivery.use-case';
import { GetDeliveryUseCase } from '../application/use-cases/get-delivery.use-case';
import { GetDeliveriesUseCase } from '../application/use-cases/get-deliveries.use-case';
import { UpdateDeliveryStatusUseCase } from '../application/use-cases/update-delivery-status.use-case';
import { DeliverySaga } from '../application/sagas/delivery.saga';
import { CODInitiationSaga } from '../application/sagas/cod-initiation.saga';
import { CODSettlementSaga } from '../application/sagas/cod-settlement.saga';
import { SagaRegistry } from '../application/sagas/saga-registry';
import { VerifyCODDeliveryUseCase } from '../application/use-cases/verify-cod-delivery.use-case';
import { InitiateCODDeliveryUseCase } from '../application/use-cases/initiate-cod-delivery.use-case';
import { CourierAssignmentService } from '../application/services/courier-assignment.service';
import { TrackingUpdateService } from '../application/services/tracking-update.service';
import { DeliveryEventsSubscriber } from '../application/subscribers/delivery-events.subscriber';
import { TrackingStreamWorker } from './workers/tracking-stream.worker';

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
  private courierSelectionEngine!: CourierSelectionEngine;
  private distanceAlgorithm!: DistanceCalculationAlgorithm;
  private courierDomainService!: CourierDomainService;
  private deliveryDomainService!: DeliveryDomainService;
  private routeDomainService!: RouteDomainService;
  private routeCreationService!: RouteCreationService;
  private trackingEngine!: RealTimeTrackingEngine;

  // Application services
  private createDeliveryUseCase!: CreateDeliveryUseCase;
  private getDeliveryUseCase!: GetDeliveryUseCase;
  private getDeliveriesUseCase!: GetDeliveriesUseCase;
  private updateDeliveryStatusUseCase!: UpdateDeliveryStatusUseCase;
  private deliverySaga!: DeliverySaga;
  private codInitiationSaga!: CODInitiationSaga;
  private codSettlementSaga!: CODSettlementSaga;
  private sagaRegistry!: SagaRegistry;
  private codConfirmationEngine!: CODConfirmationEngine;
  private verifyCODDeliveryUseCase!: VerifyCODDeliveryUseCase;
  private initiateCODDeliveryUseCase!: InitiateCODDeliveryUseCase;
  private courierAssignmentService!: CourierAssignmentService;
  private trackingUpdateService!: TrackingUpdateService;
  private deliveryEventsSubscriber!: DeliveryEventsSubscriber;
  private trackingStreamWorker!: TrackingStreamWorker;

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

  private ensureInfrastructureInitialized(): void {
    if (
      this.courierRepository &&
      this.deliveryRepository &&
      this.earningsRepository &&
      this.routeRepository &&
      this.trackingRepository &&
      this.weatherProvider &&
      this.trafficProvider &&
      this.routeOptimizationProvider &&
      this.trackingProvider &&
      this.eventPublisher
    ) {
      return;
    }

    try {
      this.initializeInfrastructureSync();
    } catch (error) {
      console.warn('⚠️ Failed to initialize logistics infrastructure synchronously:', (error as Error).message);
    }
  }

  private initializeInfrastructureSync(): void {
    // Initialize repositories with proper database client
    const databaseClient = prisma;

    this.courierRepository = new PrismaCourierRepository(databaseClient);
    this.deliveryRepository = new PrismaDeliveryRepository(databaseClient);
    this.earningsRepository = new PrismaEarningsRepository(databaseClient);
    this.routeRepository = new RouteRepository(databaseClient);
    this.trackingRepository = new PrismaTrackingRepository(databaseClient);
    this.weatherProvider = new MapsWeatherBridge();
    this.trafficProvider = new MapsTrafficBridge();
    this.routeOptimizationProvider = new MapsRoutingBridge();
    this.trackingProvider = new MapsTrackingBridge();
    const outboxRepository = new LogisticsOutboxRepository(databaseClient);
    this.eventPublisher = new EventPublisher(outboxRepository, true); // Enable event store
    this.sagaLogRepository = new PrismaSagaLogRepository(prisma);
    DistanceCalculationAlgorithm.setRouteOptimizationService(this.routeOptimizationProvider);
    DistanceCalculationAlgorithm.configureFallback(this.getDistanceFallbackConfig());
    this.initializeDomainWithInfrastructure();
  }

  // Method to initialize database connections asynchronously
  public async initializeDatabaseConnections(): Promise<void> {
    try {
      await DatabaseConnection.initialize();
      const databaseClient = prisma;

      // Initialize all infrastructure with connected client
      this.initializeInfrastructureWithClient(databaseClient);

      // Now that infrastructure is ready, initialize application layer
      this.initializeApplication();

      console.log('✅ Database connections initialized successfully');
      console.log('✅ Application layer initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database connections:', error);
      throw error; // Re-throw to prevent server startup
    }
  }

  private initializeInfrastructureWithClient(databaseClient: any): void {
    // Initialize repositories with proper database client
    this.courierRepository = new PrismaCourierRepository(databaseClient);
    this.deliveryRepository = new PrismaDeliveryRepository(databaseClient);
    this.earningsRepository = new PrismaEarningsRepository(databaseClient);
    this.routeRepository = new RouteRepository(databaseClient);
    this.trackingRepository = new PrismaTrackingRepository(databaseClient);

    // Initialize other infrastructure components (now using Maps Service bridges)
    this.weatherProvider = new MapsWeatherBridge();
    this.trafficProvider = new MapsTrafficBridge();
    this.routeOptimizationProvider = new MapsRoutingBridge();
    this.trackingProvider = new MapsTrackingBridge();
    const outboxRepository = new LogisticsOutboxRepository(databaseClient);
    this.eventPublisher = new EventPublisher(outboxRepository, true); // Enable event store
    DistanceCalculationAlgorithm.setRouteOptimizationService(this.routeOptimizationProvider);
    DistanceCalculationAlgorithm.configureFallback(this.getDistanceFallbackConfig());

    // Initialize Saga Log Repository
    this.sagaLogRepository = new PrismaSagaLogRepository(prisma);

    // Initialize domain services that depend on infrastructure
    this.initializeDomainWithInfrastructure();
  }

  private initializeDomain(): void {
    // Initialize domain services with their dependencies
    this.distanceAlgorithm = new DistanceCalculationAlgorithm();
    this.courierAssignmentPolicy = new CourierAssignmentPolicy();
    this.courierSelectionEngine = new CourierSelectionEngine(this.courierAssignmentPolicy);
    this.courierDomainService = new CourierDomainService();
    this.deliveryDomainService = new DeliveryDomainService();
    this.routeDomainService = new RouteDomainService();
    this.trackingEngine = new RealTimeTrackingEngine();

    this.logisticsEngine = new LogisticsEngine();
    this.codConfirmationEngine = new CODConfirmationEngine();
  }

  private initializeDomainWithInfrastructure(): void {
    // Initialize domain services that depend on infrastructure
    // This is called after infrastructure is initialized
    this.routeCreationService = new RouteCreationService(
      this.routeOptimizationProvider,
      this.distanceAlgorithm,
      this.getRouteCreationDefaults()
    );
  }

  private getDistanceFallbackConfig(): DistanceFallbackConfig {
    const enabled = process.env.LOGISTICS_DISTANCE_FALLBACK_ENABLED !== 'false';
    const inflationRaw = Number(process.env.LOGISTICS_DISTANCE_INFLATION_FACTOR ?? '1.35');
    const timeoutRaw = Number(process.env.LOGISTICS_ROUTING_TIMEOUT_MS ?? '800');

    return {
      enabled,
      inflationFactor: Number.isFinite(inflationRaw) ? inflationRaw : 1.35,
      timeoutMs: Number.isFinite(timeoutRaw) ? timeoutRaw : 800
    };
  }

  private getRouteCreationDefaults(): RouteCreationDefaults {
    const clusteringEnabled = process.env.LOGISTICS_PICKUP_CLUSTERING_ENABLED !== 'false';
    const radiusRaw = Number(process.env.LOGISTICS_PICKUP_CLUSTERING_RADIUS_KM ?? '1.0');
    return {
      clusteringEnabled,
      clusteringRadiusKm: Number.isFinite(radiusRaw) && radiusRaw > 0 ? radiusRaw : 1.0
    };
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

    this.courierAssignmentService = new CourierAssignmentService(
      this.courierRepository,
      this.courierSelectionEngine,
      this.courierDomainService
    );

    this.deliverySaga = new DeliverySaga(
      this.sagaLogRepository,
      'logistics-service',
      this.courierRepository,
      this.trackingProvider,
      this.routeRepository,
      this.routeCreationService,
      this.courierDomainService,
      this.courierAssignmentService
    );

    this.sagaRegistry = SagaRegistry.getInstance();
    this.sagaRegistry.registerOrchestrator('DeliverySaga', this.deliverySaga);
    SagaFactory.registerByType('DeliverySaga', this.deliverySaga);

    // COD is split into two sagas so settlement is unreachable before a courier
    // verifies the delivery. Registering the superseded combined saga as well
    // would reintroduce a path that settles an unverified order (BLG-027).
    this.codInitiationSaga = new CODInitiationSaga(
      this.sagaLogRepository,
      'logistics-service',
      this.deliveryRepository,
      this.codConfirmationEngine
    );
    this.sagaRegistry.registerOrchestrator('CODInitiationSaga', this.codInitiationSaga);
    SagaFactory.registerByType('CODInitiationSaga', this.codInitiationSaga);

    this.codSettlementSaga = new CODSettlementSaga(
      this.sagaLogRepository,
      'logistics-service',
      this.deliveryRepository,
      this.codConfirmationEngine
    );
    this.sagaRegistry.registerOrchestrator('CODSettlementSaga', this.codSettlementSaga);
    SagaFactory.registerByType('CODSettlementSaga', this.codSettlementSaga);

    this.verifyCODDeliveryUseCase = new VerifyCODDeliveryUseCase(
      this.deliveryRepository,
      this.codConfirmationEngine,
      this.codSettlementSaga
    );

    this.initiateCODDeliveryUseCase = new InitiateCODDeliveryUseCase(
      this.deliveryRepository,
      this.codInitiationSaga
    );

    this.trackingUpdateService = new TrackingUpdateService(
      this.trackingRepository,
      this.courierRepository,
      this.deliveryRepository,
      this.eventPublisher,
      this.trackingEngine
    );

    this.deliveryEventsSubscriber = new DeliveryEventsSubscriber(
      this.updateDeliveryStatusUseCase
    );

    this.trackingStreamWorker = new TrackingStreamWorker(
      this.deliveryRepository,
      this.trackingRepository,
      this.eventPublisher
    );
  }

  private ensureApplicationInitialized(): void {
    this.ensureInfrastructureInitialized();

    if (!this.sagaLogRepository) {
      this.sagaLogRepository = new PrismaSagaLogRepository(prisma);
    }

    if (!this.routeCreationService) {
      this.initializeDomainWithInfrastructure();
    }

    if (
      !this.createDeliveryUseCase ||
      !this.getDeliveryUseCase ||
      !this.getDeliveriesUseCase ||
      !this.updateDeliveryStatusUseCase ||
      !this.deliverySaga ||
      !this.codDeliveryConfirmationSaga ||
      !this.verifyCODDeliveryUseCase ||
      !this.initiateCODDeliveryUseCase ||
      !this.courierAssignmentService ||
      !this.trackingUpdateService ||
      !this.deliveryEventsSubscriber ||
      !this.trackingStreamWorker
    ) {
      this.initializeApplication();
    }
  }

  // Getters for infrastructure adapters
  public getCourierRepository(): ICourierRepository {
    if (!this.courierRepository) {
      this.ensureInfrastructureInitialized();
    }
    return this.courierRepository;
  }

  public getDeliveryRepository(): IDeliveryRepository {
    if (!this.deliveryRepository) {
      this.ensureInfrastructureInitialized();
    }
    return this.deliveryRepository;
  }

  public getEarningsRepository(): IEarningsRepository {
    if (!this.earningsRepository) {
      this.ensureInfrastructureInitialized();
    }
    return this.earningsRepository;
  }

  public getRouteRepository(): IRouteRepository {
    if (!this.routeRepository) {
      this.ensureInfrastructureInitialized();
    }
    return this.routeRepository;
  }

  public getTrackingRepository(): ITrackingRepository {
    if (!this.trackingRepository) {
      this.ensureInfrastructureInitialized();
    }
    return this.trackingRepository;
  }

  public getWeatherProvider(): WeatherServicePort {
    if (!this.weatherProvider) {
      this.ensureInfrastructureInitialized();
    }
    return this.weatherProvider;
  }

  public getTrafficProvider(): TrafficServicePort {
    if (!this.trafficProvider) {
      this.ensureInfrastructureInitialized();
    }
    return this.trafficProvider;
  }

  public getRouteOptimizationProvider(): RouteOptimizationPort {
    if (!this.routeOptimizationProvider) {
      this.ensureInfrastructureInitialized();
    }
    return this.routeOptimizationProvider;
  }

  public getTrackingProvider(): RealTimeTrackingPort {
    if (!this.trackingProvider) {
      this.ensureInfrastructureInitialized();
    }
    return this.trackingProvider;
  }

  public getEventPublisher(): EventPublisherPort {
    if (!this.eventPublisher) {
      this.ensureInfrastructureInitialized();
    }
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
      this.ensureApplicationInitialized();
    }
    return this.createDeliveryUseCase;
  }

  public getGetDeliveryUseCase(): GetDeliveryUseCase {
    if (!this.getDeliveryUseCase) {
      this.ensureApplicationInitialized();
    }
    return this.getDeliveryUseCase;
  }

  public getGetDeliveriesUseCase(): GetDeliveriesUseCase {
    if (!this.getDeliveriesUseCase) {
      this.ensureApplicationInitialized();
    }
    return this.getDeliveriesUseCase;
  }

  public getUpdateDeliveryStatusUseCase(): UpdateDeliveryStatusUseCase {
    if (!this.updateDeliveryStatusUseCase) {
      this.ensureApplicationInitialized();
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

  public getTrackingUpdateService(): TrackingUpdateService {
    if (!this.trackingUpdateService) {
      this.ensureApplicationInitialized();
    }
    return this.trackingUpdateService;
  }

  public getDeliveryEventsSubscriber(): DeliveryEventsSubscriber {
    if (!this.deliveryEventsSubscriber) {
      this.ensureApplicationInitialized();
    }
    return this.deliveryEventsSubscriber;
  }

  public getTrackingStreamWorker(): TrackingStreamWorker {
    if (!this.trackingStreamWorker) {
      this.ensureApplicationInitialized();
    }
    return this.trackingStreamWorker;
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
    DistanceCalculationAlgorithm.setRouteOptimizationService(provider);
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
    if (!this.verifyCODDeliveryUseCase) {
      this.ensureApplicationInitialized();
    }
    return this.verifyCODDeliveryUseCase;
  }

  public getInitiateCODDeliveryUseCase(): InitiateCODDeliveryUseCase {
    if (!this.initiateCODDeliveryUseCase) {
      this.ensureApplicationInitialized();
    }
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


