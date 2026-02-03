/**
 * Load Balancer Service
 * 
 * Implements various load balancing strategies for distributing requests
 * across multiple service instances with health monitoring and failover
 */

import { ServiceInstance, LoadBalancerStats } from '../types';
import { serviceRegistry } from './service-discovery.service';

export interface LoadBalancerService {
  select(services: ServiceInstance[], request?: any): ServiceInstance | null;
  update(serviceId: string, updates: Partial<ServiceInstance>): void;
  remove(serviceId: string): void;
  getStats(): LoadBalancerStats;
  resetStats(): void;
}

export class RoundRobinLoadBalancer implements LoadBalancerService {
  private currentIndex: number = 0;
  private stats: LoadBalancerStats;
  private requestCounts: Map<string, number> = new Map();
  private lastUsed: Map<string, Date> = new Map();

  constructor() {
    this.stats = {
      strategy: 'round_robin',
      totalRequests: 0,
      activeConnections: new Map(),
      lastUsed: new Map(),
      weights: new Map(),
      errors: new Map(),
    };
  }

  select(services: ServiceInstance[], request?: any): ServiceInstance | null {
    if (!services || services.length === 0) {
      return null;
    }

    // Filter out unhealthy services
    const healthyServices = services.filter(s => s.health === 'healthy');
    if (healthyServices.length === 0) {
      return null;
    }

    // Select next service in round robin fashion
    const selectedService = healthyServices[this.currentIndex % healthyServices.length];
    this.currentIndex = (this.currentIndex + 1) % healthyServices.length;

    // Update statistics
    this.updateStats(selectedService.id, true);
    
    return selectedService;
  }

  update(serviceId: string, updates: Partial<ServiceInstance>): void {
    // Update service information if needed
    // For round robin, we don't need to update anything specific
  }

  remove(serviceId: string): void {
    this.requestCounts.delete(serviceId);
    this.lastUsed.delete(serviceId);
    this.stats.activeConnections.delete(serviceId);
    this.stats.weights.delete(serviceId);
    this.stats.errors.delete(serviceId);
  }

  getStats(): LoadBalancerStats {
    return {
      ...this.stats,
      lastUsed: new Map(this.lastUsed),
    };
  }

  resetStats(): void {
    this.stats.totalRequests = 0;
    this.requestCounts.clear();
    this.lastUsed.clear();
    this.stats.activeConnections.clear();
    this.stats.errors.clear();
  }

  private updateStats(serviceId: string, success: boolean): void {
    this.stats.totalRequests++;
    
    const currentCount = this.requestCounts.get(serviceId) || 0;
    this.requestCounts.set(serviceId, currentCount + 1);
    
    this.lastUsed.set(serviceId, new Date());
    
    if (!success) {
      const currentErrors = this.stats.errors.get(serviceId) || 0;
      this.stats.errors.set(serviceId, currentErrors + 1);
    }
  }
}

export class LeastConnectionsLoadBalancer implements LoadBalancerService {
  private activeConnections: Map<string, number> = new Map();
  private stats: LoadBalancerStats;

  constructor() {
    this.stats = {
      strategy: 'least_connections',
      totalRequests: 0,
      activeConnections: new Map(),
      lastUsed: new Map(),
      weights: new Map(),
      errors: new Map(),
    };
  }

  select(services: ServiceInstance[], request?: any): ServiceInstance | null {
    if (!services || services.length === 0) {
      return null;
    }

    // Filter out unhealthy services
    const healthyServices = services.filter(s => s.health === 'healthy');
    if (healthyServices.length === 0) {
      return null;
    }

    // Find service with least active connections
    let selectedService: ServiceInstance | null = null;
    let minConnections = Infinity;

    for (const service of healthyServices) {
      const connections = this.activeConnections.get(service.id) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedService = service;
      }
    }

    if (selectedService) {
      // Increment active connections
      this.activeConnections.set(selectedService.id, minConnections + 1);
      this.stats.activeConnections.set(selectedService.id, minConnections + 1);
      this.stats.lastUsed.set(selectedService.id, new Date());
      this.stats.totalRequests++;
    }

    return selectedService;
  }

  update(serviceId: string, updates: Partial<ServiceInstance>): void {
    // Update service information if needed
  }

  remove(serviceId: string): void {
    this.activeConnections.delete(serviceId);
    this.stats.activeConnections.delete(serviceId);
    this.stats.lastUsed.delete(serviceId);
    this.stats.weights.delete(serviceId);
    this.stats.errors.delete(serviceId);
  }

  getStats(): LoadBalancerStats {
    return {
      ...this.stats,
      activeConnections: new Map(this.activeConnections),
    };
  }

  resetStats(): void {
    this.stats.totalRequests = 0;
    this.activeConnections.clear();
    this.stats.lastUsed.clear();
    this.stats.errors.clear();
  }

  // Call this when a request completes
  markRequestComplete(serviceId: string): void {
    const currentConnections = this.activeConnections.get(serviceId) || 0;
    if (currentConnections > 0) {
      this.activeConnections.set(serviceId, currentConnections - 1);
      this.stats.activeConnections.set(serviceId, currentConnections - 1);
    }
  }
}

export class WeightedRoundRobinLoadBalancer implements LoadBalancerService {
  private currentIndex: number = 0;
  private weights: Map<string, number> = new Map();
  private stats: LoadBalancerStats;

  constructor() {
    this.stats = {
      strategy: 'weighted_round_robin',
      totalRequests: 0,
      activeConnections: new Map(),
      lastUsed: new Map(),
      weights: new Map(),
      errors: new Map(),
    };
  }

  select(services: ServiceInstance[], request?: any): ServiceInstance | null {
    if (!services || services.length === 0) {
      return null;
    }

    // Filter out unhealthy services
    const healthyServices = services.filter(s => s.health === 'healthy');
    if (healthyServices.length === 0) {
      return null;
    }

    // Calculate total weight
    let totalWeight = 0;
    for (const service of healthyServices) {
      const weight = service.weight || 1;
      this.weights.set(service.id, weight);
      this.stats.weights.set(service.id, weight);
      totalWeight += weight;
    }

    if (totalWeight === 0) {
      return this.roundRobinFallback(healthyServices);
    }

    // Weighted selection
    let random = Math.random() * totalWeight;
    let selectedService: ServiceInstance | null = null;

    for (const service of healthyServices) {
      const weight = this.weights.get(service.id) || 1;
      if (random <= weight) {
        selectedService = service;
        break;
      }
      random -= weight;
    }

    if (selectedService) {
      this.stats.lastUsed.set(selectedService.id, new Date());
      this.stats.totalRequests++;
    }

    return selectedService || this.roundRobinFallback(healthyServices);
  }

  update(serviceId: string, updates: Partial<ServiceInstance>): void {
    if (updates.weight !== undefined) {
      this.weights.set(serviceId, updates.weight);
      this.stats.weights.set(serviceId, updates.weight);
    }
  }

  remove(serviceId: string): void {
    this.weights.delete(serviceId);
    this.stats.weights.delete(serviceId);
    this.stats.lastUsed.delete(serviceId);
    this.stats.activeConnections.delete(serviceId);
    this.stats.errors.delete(serviceId);
  }

  getStats(): LoadBalancerStats {
    return {
      ...this.stats,
      weights: new Map(this.weights),
    };
  }

  resetStats(): void {
    this.stats.totalRequests = 0;
    this.weights.clear();
    this.stats.lastUsed.clear();
    this.stats.activeConnections.clear();
    this.stats.errors.clear();
  }

  private roundRobinFallback(services: ServiceInstance[]): ServiceInstance | null {
    const selectedService = services[this.currentIndex % services.length];
    this.currentIndex = (this.currentIndex + 1) % services.length;
    return selectedService;
  }
}

export class RandomLoadBalancer implements LoadBalancerService {
  private stats: LoadBalancerStats;

  constructor() {
    this.stats = {
      strategy: 'random',
      totalRequests: 0,
      activeConnections: new Map(),
      lastUsed: new Map(),
      weights: new Map(),
      errors: new Map(),
    };
  }

  select(services: ServiceInstance[], request?: any): ServiceInstance | null {
    if (!services || services.length === 0) {
      return null;
    }

    // Filter out unhealthy services
    const healthyServices = services.filter(s => s.health === 'healthy');
    if (healthyServices.length === 0) {
      return null;
    }

    // Select random service
    const randomIndex = Math.floor(Math.random() * healthyServices.length);
    const selectedService = healthyServices[randomIndex];

    this.stats.lastUsed.set(selectedService.id, new Date());
    this.stats.totalRequests++;

    return selectedService;
  }

  update(serviceId: string, updates: Partial<ServiceInstance>): void {
    // Update service information if needed
  }

  remove(serviceId: string): void {
    this.stats.lastUsed.delete(serviceId);
    this.stats.activeConnections.delete(serviceId);
    this.stats.weights.delete(serviceId);
    this.stats.errors.delete(serviceId);
  }

  getStats(): LoadBalancerStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats.totalRequests = 0;
    this.stats.lastUsed.clear();
    this.stats.activeConnections.clear();
    this.stats.errors.clear();
  }
}

export class LeastResponseTimeLoadBalancer implements LoadBalancerService {
  private responseTimes: Map<string, number[]> = new Map();
  private stats: LoadBalancerStats;

  constructor() {
    this.stats = {
      strategy: 'least_response_time',
      totalRequests: 0,
      activeConnections: new Map(),
      lastUsed: new Map(),
      weights: new Map(),
      errors: new Map(),
    };
  }

  select(services: ServiceInstance[], request?: any): ServiceInstance | null {
    if (!services || services.length === 0) {
      return null;
    }

    // Filter out unhealthy services
    const healthyServices = services.filter(s => s.health === 'healthy');
    if (healthyServices.length === 0) {
      return null;
    }

    // Find service with lowest average response time
    let selectedService: ServiceInstance | null = null;
    let minAvgResponseTime = Infinity;

    for (const service of healthyServices) {
      const responseTimes = this.responseTimes.get(service.id) || [];
      const avgResponseTime = responseTimes.length > 0 
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
        : 0;

      if (avgResponseTime < minAvgResponseTime) {
        minAvgResponseTime = avgResponseTime;
        selectedService = service;
      }
    }

    if (selectedService) {
      this.stats.lastUsed.set(selectedService.id, new Date());
      this.stats.totalRequests++;
    }

    return selectedService || healthyServices[0]; // Fallback to first healthy service
  }

  update(serviceId: string, updates: Partial<ServiceInstance>): void {
    // Update service information if needed
  }

  remove(serviceId: string): void {
    this.responseTimes.delete(serviceId);
    this.stats.lastUsed.delete(serviceId);
    this.stats.activeConnections.delete(serviceId);
    this.stats.weights.delete(serviceId);
    this.stats.errors.delete(serviceId);
  }

  getStats(): LoadBalancerStats {
    return { ...this.stats };
  }

  resetStats(): void {
    this.stats.totalRequests = 0;
    this.responseTimes.clear();
    this.stats.lastUsed.clear();
    this.stats.activeConnections.clear();
    this.stats.errors.clear();
  }

  // Call this when a request completes with response time
  markRequestComplete(serviceId: string, responseTime: number): void {
    if (!this.responseTimes.has(serviceId)) {
      this.responseTimes.set(serviceId, []);
    }

    const times = this.responseTimes.get(serviceId)!;
    times.push(responseTime);

    // Keep only last 100 response times
    if (times.length > 100) {
      times.shift();
    }
  }
}

// Load Balancer Factory
export class LoadBalancerFactory {
  static createLoadBalancer(strategy: string): LoadBalancerService {
    switch (strategy) {
      case 'round_robin':
        return new RoundRobinLoadBalancer();
      case 'least_connections':
        return new LeastConnectionsLoadBalancer();
      case 'weighted_round_robin':
        return new WeightedRoundRobinLoadBalancer();
      case 'random':
        return new RandomLoadBalancer();
      case 'least_response_time':
        return new LeastResponseTimeLoadBalancer();
      default:
        return new RoundRobinLoadBalancer();
    }
  }
}

// Load Balancer Manager
export class LoadBalancerManager {
  private loadBalancer: LoadBalancerService;
  private strategy: string;

  constructor(strategy: string = 'round_robin') {
    this.strategy = strategy;
    this.loadBalancer = LoadBalancerFactory.createLoadBalancer(strategy);
  }

  select(serviceName: string, request?: any): ServiceInstance | null {
    const services = serviceRegistry.get(serviceName);
    return this.loadBalancer.select(services, request);
  }

  update(serviceId: string, updates: Partial<ServiceInstance>): void {
    this.loadBalancer.update(serviceId, updates);
  }

  remove(serviceId: string): void {
    this.loadBalancer.remove(serviceId);
  }

  getStats(): LoadBalancerStats {
    return this.loadBalancer.getStats();
  }

  resetStats(): void {
    this.loadBalancer.resetStats();
  }

  changeStrategy(newStrategy: string): void {
    if (this.strategy !== newStrategy) {
      this.strategy = newStrategy;
      this.loadBalancer = LoadBalancerFactory.createLoadBalancer(newStrategy);
    }
  }

  // Convenience methods for specific load balancer types
  markRequestComplete(serviceId: string, responseTime?: number): void {
    if (this.loadBalancer instanceof LeastConnectionsLoadBalancer) {
      this.loadBalancer.markRequestComplete(serviceId);
    } else if (this.loadBalancer instanceof LeastResponseTimeLoadBalancer && responseTime !== undefined) {
      this.loadBalancer.markRequestComplete(serviceId, responseTime);
    }
  }
}

// Export default load balancer manager
export const loadBalancer = new LoadBalancerManager();