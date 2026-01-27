/**
 * Services Index
 * 
 * Exports all service classes and interfaces for the Maysar API Gateway
 */

// Service Discovery
export * from './service-discovery.service';

// Load Balancing
export * from './load-balancer.service';

// Circuit Breaker
export * from './circuit-breaker.service';

// Routing
export * from './routing.service';

// Monitoring
export * from './monitoring.service';

// Export service instances
export { serviceDiscovery, serviceRegistry } from './service-discovery.service';
export { loadBalancer } from './load-balancer.service';
export { circuitBreakerManager } from './circuit-breaker.service';
export {
  routingService,
  pathTransformationService,
  requestTransformationService,
  responseTransformationService,
} from './routing.service';
export {
  monitoringService,
  prometheusExporter,
} from './monitoring.service';
