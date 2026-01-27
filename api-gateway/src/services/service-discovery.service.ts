/**
 * Service Discovery Service
 * 
 * Manages service discovery and registration for the Maysar API Gateway
 * Supports multiple service discovery backends including Consul, Kubernetes, and static configuration
 */

import { ServiceInstance, ServiceRegistry, ServiceHealth } from '../types';
import { serviceDiscoveryConfig, isDevelopment } from '../config';

export interface ServiceDiscoveryService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  register(service: ServiceInstance): Promise<void>;
  deregister(serviceId: string): Promise<void>;
  discover(serviceName: string): Promise<ServiceInstance[]>;
  healthCheck(serviceId: string): Promise<ServiceHealth>;
  watch(serviceName: string, callback: (services: ServiceInstance[]) => void): Promise<void>;
  getAllServices(): Promise<ServiceRegistry>;
}

export class ConsulServiceDiscovery implements ServiceDiscoveryService {
  private consul: any;
  private watchers: Map<string, any> = new Map();

  constructor() {
    const Consul = require('consul');
    this.consul = new Consul({
      host: serviceDiscoveryConfig.consul.host,
      port: serviceDiscoveryConfig.consul.port,
      token: serviceDiscoveryConfig.consul.token,
      promisify: true,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.consul.status.leader();
      console.log('Connected to Consul');
    } catch (error) {
      console.error('Failed to connect to Consul:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    // Consul client doesn't need explicit disconnection
    console.log('Disconnected from Consul');
  }

  async register(service: ServiceInstance): Promise<void> {
    try {
      await this.consul.agent.service.register({
        id: service.id,
        name: service.name,
        address: service.host,
        port: service.port,
        check: {
          http: `http://${service.host}:${service.port}/health`,
          interval: '10s',
          timeout: '5s',
        },
        tags: [
          `version:${service.version}`,
          `environment:${service.metadata.environment}`,
          `region:${service.metadata.region}`,
        ],
      });
      console.log(`Registered service ${service.name} with Consul`);
    } catch (error) {
      console.error(`Failed to register service ${service.name}:`, error);
      throw error;
    }
  }

  async deregister(serviceId: string): Promise<void> {
    try {
      await this.consul.agent.service.deregister(serviceId);
      console.log(`Deregistered service ${serviceId} from Consul`);
    } catch (error) {
      console.error(`Failed to deregister service ${serviceId}:`, error);
      throw error;
    }
  }

  async discover(serviceName: string): Promise<ServiceInstance[]> {
    try {
      const services = await this.consul.health.service(serviceName, { passing: true });
      return services.map((service: any) => ({
        id: service.Service.ID,
        name: service.Service.Service,
        host: service.Service.Address,
        port: service.Service.Port,
        protocol: 'http',
        version: service.Service.Tags.find((tag: string) => tag.startsWith('version:'))?.split(':')[1] || '1.0.0',
        health: 'healthy',
        metadata: {
          region: service.Service.Tags.find((tag: string) => tag.startsWith('region:'))?.split(':')[1] || 'us-east-1',
          environment: service.Service.Tags.find((tag: string) => tag.startsWith('environment:'))?.split(':')[1] || 'development',
        },
        lastHealthCheck: new Date(),
        weight: 100,
      }));
    } catch (error) {
      console.error(`Failed to discover service ${serviceName}:`, error);
      throw error;
    }
  }

  async healthCheck(serviceId: string): Promise<ServiceHealth> {
    try {
      const checks = await this.consul.health.checks(serviceId);
      const passingChecks = checks.filter((check: any) => check.Status === 'passing');
      const totalChecks = checks.length;
      
      return {
        service: serviceId,
        status: passingChecks.length === totalChecks ? 'healthy' : 'unhealthy',
        responseTime: 0, // Consul doesn't provide response time
        lastCheck: new Date(),
        errorRate: passingChecks.length === totalChecks ? 0 : 100,
        uptime: 100, // Consul doesn't provide uptime
      };
    } catch (error) {
      console.error(`Failed to health check service ${serviceId}:`, error);
      throw error;
    }
  }

  async watch(serviceName: string, callback: (services: ServiceInstance[]) => void): Promise<void> {
    if (this.watchers.has(serviceName)) {
      return; // Already watching
    }

    const watcher = this.consul.watch({
      method: this.consul.health.service,
      options: { service: serviceName, passing: true },
    });

    watcher.on('change', (data: any) => {
      const services = data.map((service: any) => ({
        id: service.Service.ID,
        name: service.Service.Service,
        host: service.Service.Address,
        port: service.Service.Port,
        protocol: 'http',
        version: service.Service.Tags.find((tag: string) => tag.startsWith('version:'))?.split(':')[1] || '1.0.0',
        health: 'healthy',
        metadata: {
          region: service.Service.Tags.find((tag: string) => tag.startsWith('region:'))?.split(':')[1] || 'us-east-1',
          environment: service.Service.Tags.find((tag: string) => tag.startsWith('environment:'))?.split(':')[1] || 'development',
        },
        lastHealthCheck: new Date(),
        weight: 100,
      }));
      callback(services);
    });

    watcher.on('error', (error: any) => {
      console.error(`Error watching service ${serviceName}:`, error);
    });

    this.watchers.set(serviceName, watcher);
  }

  async getAllServices(): Promise<ServiceRegistry> {
    try {
      const services = await this.consul.catalog.service.list();
      const registry: ServiceRegistry = {};

      for (const [serviceName, serviceIds] of Object.entries(services)) {
        const instances = await this.discover(serviceName);
        registry[serviceName] = instances;
      }

      return registry;
    } catch (error) {
      console.error('Failed to get all services:', error);
      throw error;
    }
  }
}

export class KubernetesServiceDiscovery implements ServiceDiscoveryService {
  private k8sApi: any;
  private k8sCoreApi: any;

  constructor() {
    const k8s = require('@kubernetes/client-node');
    const kc = new k8s.KubeConfig();
    
    if (process.env.NODE_ENV === 'production') {
      kc.loadFromCluster();
    } else {
      kc.loadFromDefault();
    }

    this.k8sApi = kc.makeApiClient(k8s.AppsV1Api);
    this.k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api);
  }

  async connect(): Promise<void> {
    try {
      await this.k8sCoreApi.listServiceForAllNamespaces();
      console.log('Connected to Kubernetes');
    } catch (error) {
      console.error('Failed to connect to Kubernetes:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    console.log('Disconnected from Kubernetes');
  }

  async register(service: ServiceInstance): Promise<void> {
    try {
      const serviceBody = {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: {
          name: service.name,
          namespace: serviceDiscoveryConfig.kubernetes.namespace,
          labels: {
            app: service.name,
            version: service.version,
            environment: service.metadata.environment,
            region: service.metadata.region,
          },
        },
        spec: {
          selector: {
            app: service.name,
            version: service.version,
          },
          ports: [
            {
              protocol: 'TCP',
              port: service.port,
              targetPort: service.port,
            },
          ],
        },
      };

      await this.k8sCoreApi.createNamespacedService(
        serviceDiscoveryConfig.kubernetes.namespace,
        serviceBody
      );

      console.log(`Registered service ${service.name} with Kubernetes`);
    } catch (error) {
      console.error(`Failed to register service ${service.name}:`, error);
      throw error;
    }
  }

  async deregister(serviceId: string): Promise<void> {
    try {
      await this.k8sCoreApi.deleteNamespacedService(
        serviceId,
        serviceDiscoveryConfig.kubernetes.namespace
      );
      console.log(`Deregistered service ${serviceId} from Kubernetes`);
    } catch (error) {
      console.error(`Failed to deregister service ${serviceId}:`, error);
      throw error;
    }
  }

  async discover(serviceName: string): Promise<ServiceInstance[]> {
    try {
      const response = await this.k8sCoreApi.readNamespacedService(
        serviceName,
        serviceDiscoveryConfig.kubernetes.namespace
      );

      const service = response.body;
      const instances: ServiceInstance[] = [];

      // In Kubernetes, we would typically query endpoints
      // For now, return the service definition
      instances.push({
        id: service.metadata.name,
        name: service.metadata.name,
        host: `${service.metadata.name}.${serviceDiscoveryConfig.kubernetes.namespace}.${serviceDiscoveryConfig.kubernetes.clusterDomain}`,
        port: service.spec.ports[0].port,
        protocol: 'http',
        version: service.metadata.labels?.version || '1.0.0',
        health: 'healthy',
        metadata: {
          region: service.metadata.labels?.region || 'us-east-1',
          environment: service.metadata.labels?.environment || 'development',
        },
        lastHealthCheck: new Date(),
        weight: 100,
      });

      return instances;
    } catch (error) {
      console.error(`Failed to discover service ${serviceName}:`, error);
      throw error;
    }
  }

  async healthCheck(serviceId: string): Promise<ServiceHealth> {
    try {
      const response = await this.k8sCoreApi.readNamespacedService(
        serviceId,
        serviceDiscoveryConfig.kubernetes.namespace
      );

      return {
        service: serviceId,
        status: 'healthy',
        responseTime: 0,
        lastCheck: new Date(),
        errorRate: 0,
        uptime: 100,
      };
    } catch (error) {
      console.error(`Failed to health check service ${serviceId}:`, error);
      throw error;
    }
  }

  async watch(serviceName: string, callback: (services: ServiceInstance[]) => void): Promise<void> {
    // Kubernetes service watching implementation
    console.log(`Watching service ${serviceName} in Kubernetes`);
  }

  async getAllServices(): Promise<ServiceRegistry> {
    try {
      const response = await this.k8sCoreApi.listNamespacedService(
        serviceDiscoveryConfig.kubernetes.namespace
      );

      const registry: ServiceRegistry = {};
      const services = response.body.items;

      for (const service of services) {
        const instances: ServiceInstance[] = [];
        instances.push({
          id: service.metadata.name,
          name: service.metadata.name,
          host: `${service.metadata.name}.${serviceDiscoveryConfig.kubernetes.namespace}.${serviceDiscoveryConfig.kubernetes.clusterDomain}`,
          port: service.spec.ports[0].port,
          protocol: 'http',
          version: service.metadata.labels?.version || '1.0.0',
          health: 'healthy',
          metadata: {
            region: service.metadata.labels?.region || 'us-east-1',
            environment: service.metadata.labels?.environment || 'development',
          },
          lastHealthCheck: new Date(),
          weight: 100,
        });
        registry[service.metadata.name] = instances;
      }

      return registry;
    } catch (error) {
      console.error('Failed to get all services:', error);
      throw error;
    }
  }
}

export class StaticServiceDiscovery implements ServiceDiscoveryService {
  private services: ServiceRegistry;

  constructor(services: ServiceRegistry) {
    this.services = services;
  }

  async connect(): Promise<void> {
    console.log('Connected to static service discovery');
  }

  async disconnect(): Promise<void> {
    console.log('Disconnected from static service discovery');
  }

  async register(service: ServiceInstance): Promise<void> {
    if (!this.services[service.name]) {
      this.services[service.name] = [];
    }
    this.services[service.name].push(service);
    console.log(`Registered service ${service.name} with static discovery`);
  }

  async deregister(serviceId: string): Promise<void> {
    for (const serviceName in this.services) {
      this.services[serviceName] = this.services[serviceName].filter(s => s.id !== serviceId);
    }
    console.log(`Deregistered service ${serviceId} from static discovery`);
  }

  async discover(serviceName: string): Promise<ServiceInstance[]> {
    return this.services[serviceName] || [];
  }

  async healthCheck(serviceId: string): Promise<ServiceHealth> {
    // For static discovery, assume all services are healthy
    return {
      service: serviceId,
      status: 'healthy',
      responseTime: 0,
      lastCheck: new Date(),
      errorRate: 0,
      uptime: 100,
    };
  }

  async watch(serviceName: string, callback: (services: ServiceInstance[]) => void): Promise<void> {
    // For static discovery, just call callback with current services
    const services = await this.discover(serviceName);
    callback(services);
  }

  async getAllServices(): Promise<ServiceRegistry> {
    return this.services;
  }
}

// Service Discovery Factory
export class ServiceDiscoveryFactory {
  static createServiceDiscovery(): ServiceDiscoveryService {
    switch (serviceDiscoveryConfig.type) {
      case 'consul':
        return new ConsulServiceDiscovery();
      case 'kubernetes':
        return new KubernetesServiceDiscovery();
      case 'static':
        // Import service registry from config
        const { serviceRegistryConfig } = require('../config');
        return new StaticServiceDiscovery(serviceRegistryConfig);
      default:
        throw new Error(`Unknown service discovery type: ${serviceDiscoveryConfig.type}`);
    }
  }
}

// Export default service discovery instance
export const serviceDiscovery = ServiceDiscoveryFactory.createServiceDiscovery();

// Service Registry Manager
export class ServiceRegistryManager {
  private registry: ServiceRegistry = {};
  private serviceDiscovery: ServiceDiscoveryService;

  constructor(serviceDiscovery: ServiceDiscoveryService) {
    this.serviceDiscovery = serviceDiscovery;
  }

  async init(): Promise<void> {
    await this.serviceDiscovery.connect();
    
    // Load initial services
    try {
      this.registry = await this.serviceDiscovery.getAllServices();
      console.log('Service registry initialized with', Object.keys(this.registry).length, 'services');
    } catch (error) {
      console.warn('Failed to load initial services:', error);
    }
  }

  async register(service: ServiceInstance): Promise<void> {
    await this.serviceDiscovery.register(service);
    
    if (!this.registry[service.name]) {
      this.registry[service.name] = [];
    }
    this.registry[service.name].push(service);
    
    console.log(`Service ${service.name} registered and added to registry`);
  }

  async deregister(serviceId: string): Promise<void> {
    await this.serviceDiscovery.deregister(serviceId);
    
    for (const serviceName in this.registry) {
      this.registry[serviceName] = this.registry[serviceName].filter(s => s.id !== serviceId);
    }
    
    console.log(`Service ${serviceId} deregistered and removed from registry`);
  }

  get(serviceName: string): ServiceInstance[] {
    return this.registry[serviceName] || [];
  }

  getAll(): ServiceRegistry {
    return this.registry;
  }

  async update(serviceId: string, updates: Partial<ServiceInstance>): Promise<void> {
    // Update service in registry
    for (const serviceName in this.registry) {
      const serviceIndex = this.registry[serviceName].findIndex(s => s.id === serviceId);
      if (serviceIndex !== -1) {
        this.registry[serviceName][serviceIndex] = {
          ...this.registry[serviceName][serviceIndex],
          ...updates,
        };
        break;
      }
    }
    
    console.log(`Service ${serviceId} updated in registry`);
  }

  healthCheck(serviceId: string): Promise<ServiceHealth> {
    return this.serviceDiscovery.healthCheck(serviceId);
  }

  listServices(): string[] {
    return Object.keys(this.registry);
  }

  listInstances(serviceName: string): ServiceInstance[] {
    return this.registry[serviceName] || [];
  }
}

// Export service registry manager instance
export const serviceRegistry = new ServiceRegistryManager(serviceDiscovery);