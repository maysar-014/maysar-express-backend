import { container } from './infrastructure/container';
import { DeliveryController } from './api/controllers/delivery.controller';

/**
 * COMPOSITION ROOT: Dependency Injection Setup
 *
 * This file is responsible for composing the application by wiring up all dependencies.
 * It follows the Composition Root pattern where all dependency injection happens here.
 *
 * Clean Architecture Rule: Dependencies flow inward
 * - API Layer depends on Application Layer
 * - Application Layer depends on Domain Layer
 * - Domain Layer depends on nothing (uses Ports)
 * - Infrastructure implements Ports
 */

export class CompositionRoot {
  // Controllers - API Layer depends on Application Layer
  public static createDeliveryController(): DeliveryController {
    return new DeliveryController();
  }

  // Application Services - Application Layer depends on Domain + Infrastructure
  public static getApplicationServices() {
    return {
      createDeliveryUseCase: container.getCreateDeliveryUseCase(),
      deliverySaga: container.getDeliverySaga(),
      sagaRegistry: container.getSagaRegistry()
    };
  }

  // Domain Services - Pure business logic
  public static getDomainServices() {
    return {
      logisticsEngine: container.getLogisticsEngine(),
      courierAssignmentPolicy: container.getCourierAssignmentPolicy(),
      distanceAlgorithm: container.getDistanceAlgorithm()
    };
  }

  // Infrastructure Services - External systems
  public static getInfrastructureServices() {
    return {
      courierRepository: container.getCourierRepository(),
      weatherProvider: container.getWeatherProvider(),
      trafficProvider: container.getTrafficProvider(),
      routeOptimizationProvider: container.getRouteOptimizationProvider(),
      trackingProvider: container.getTrackingProvider(),
      eventPublisher: container.getEventPublisher()
    };
  }

  // Health check for all layers
  public static async healthCheck() {
    return await container.healthCheck();
  }

  // Initialize all dependencies
  public static async initialize(): Promise<void> {
    // Container initializes all dependencies automatically
    // Additional initialization can be added here if needed
    console.log('✅ Composition Root initialized - all dependencies wired');
  }
}

// Export singleton instance
export const compositionRoot = CompositionRoot;
