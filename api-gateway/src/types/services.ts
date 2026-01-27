/**
 * Services Type Definitions
 * 
 * Type definitions for service discovery, service registry, and service communication
 */

import { ServiceInstance, ServiceHealth, ServiceRegistry } from './index';

// Service Discovery Types
export interface ServiceDiscovery {
  name: string;
  type: 'consul' | 'etcd' | 'kubernetes' | 'static' | 'dns';
  config: Record<string, any>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  register: (service: ServiceInstance) => Promise<void>;
  deregister: (serviceId: string) => Promise<void>;
  discover: (serviceName: string) => Promise<ServiceInstance[]>;
  healthCheck: (serviceId: string) => Promise<ServiceHealth>;
  watch: (serviceName: string, callback: (services: ServiceInstance[]) => void) => Promise<void>;
}

// Service Registry Types
export interface ServiceRegistryManager {
  register: (service: ServiceInstance) => Promise<void>;
  deregister: (serviceId: string) => Promise<void>;
  get: (serviceName: string) => ServiceInstance[];
  getAll: () => ServiceRegistry;
  update: (serviceId: string, updates: Partial<ServiceInstance>) => Promise<void>;
  healthCheck: (serviceId: string) => Promise<ServiceHealth>;
  listServices: () => string[];
  listInstances: (serviceName: string) => ServiceInstance[];
}

// Load Balancer Types
export interface LoadBalancer {
  name: string;
  strategy: 'round_robin' | 'least_connections' | 'weighted_round_robin' | 'random' | 'least_response_time';
  select: (services: ServiceInstance[], request?: any) => ServiceInstance | null;
  update: (serviceId: string, updates: Partial<ServiceInstance>) => void;
  remove: (serviceId: string) => void;
  getStats: () => LoadBalancerStats;
}

export interface LoadBalancerStats {
  strategy: string;
  totalRequests: number;
  activeConnections: Map<string, number>;
  lastUsed: Map<string, Date>;
  weights: Map<string, number>;
  errors: Map<string, number>;
}

// Circuit Breaker Types
export interface CircuitBreaker {
  name: string;
  serviceId: string;
  config: CircuitBreakerConfig;
  state: CircuitBreakerState;
  execute: <T>(fn: () => Promise<T>) => Promise<T>;
  isOpen: () => boolean;
  isHalfOpen: () => boolean;
  isClosed: () => boolean;
  reset: () => void;
  forceOpen: () => void;
  forceClosed: () => void;
  getStats: () => CircuitBreakerStats;
}

export interface CircuitBreakerStats {
  state: string;
  failures: number;
  successes: number;
  totalRequests: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
  failureRate: number;
  uptime: number;
}

// Service Health Check Types
export interface HealthChecker {
  name: string;
  serviceId: string;
  config: {
    path: string;
    interval: number;
    timeout: number;
    retries: number;
    healthyThreshold: number;
    unhealthyThreshold: number;
  };
  check: () => Promise<ServiceHealth>;
  start: () => void;
  stop: () => void;
  onHealthChange: (callback: (health: ServiceHealth) => void) => void;
}

// Service Communication Types
export interface ServiceClient {
  serviceId: string;
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  circuitBreaker: CircuitBreaker;
  loadBalancer: LoadBalancer;
  
  request: <T>(options: ServiceRequestOptions) => Promise<ServiceResponse<T>>;
  get: <T>(path: string, options?: Partial<ServiceRequestOptions>) => Promise<ServiceResponse<T>>;
  post: <T>(path: string, data?: any, options?: Partial<ServiceRequestOptions>) => Promise<ServiceResponse<T>>;
  put: <T>(path: string, data?: any, options?: Partial<ServiceRequestOptions>) => Promise<ServiceResponse<T>>;
  delete: <T>(path: string, options?: Partial<ServiceRequestOptions>) => Promise<ServiceResponse<T>>;
  patch: <T>(path: string, data?: any, options?: Partial<ServiceRequestOptions>) => Promise<ServiceResponse<T>>;
}

export interface ServiceRequestOptions {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: any;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  circuitBreaker?: boolean;
  loadBalancer?: boolean;
}

export interface ServiceResponse<T> {
  status: number;
  headers: Record<string, string>;
  data: T;
  duration: number;
  serviceId: string;
  requestId: string;
  error?: ServiceError;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  status: number;
  serviceId: string;
  requestId: string;
}

// Service Metrics Types
export interface ServiceMetrics {
  serviceId: string;
  requestsTotal: number;
  requestsPerSecond: number;
  responseTimeAvg: number;
  responseTimeP95: number;
  responseTimeP99: number;
  errorRate: number;
  activeConnections: number;
  lastUpdated: Date;
  
  recordRequest: (duration: number, status: number) => void;
  recordError: (error: ServiceError) => void;
  getStats: () => ServiceMetrics;
}

// Service Configuration Types
export interface ServiceConfig {
  id: string;
  name: string;
  version: string;
  host: string;
  port: number;
  protocol: 'http' | 'https';
  pathPrefix?: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  circuitBreaker: CircuitBreakerConfig;
  loadBalancer: LoadBalancerConfig;
  healthCheck: {
    path: string;
    interval: number;
    timeout: number;
    retries: number;
  };
  metadata: Record<string, any>;
}

// Service Gateway Types
export interface ServiceGateway {
  name: string;
  version: string;
  services: ServiceRegistryManager;
  loadBalancer: LoadBalancer;
  circuitBreaker: CircuitBreaker;
  healthChecker: HealthChecker;
  metrics: ServiceMetrics;
  
  route: (request: any) => Promise<any>;
  discover: (serviceName: string) => Promise<ServiceInstance[]>;
  register: (service: ServiceInstance) => Promise<void>;
  deregister: (serviceId: string) => Promise<void>;
}

// Service Mesh Types
export interface ServiceMesh {
  name: string;
  type: 'istio' | 'linkerd' | 'consul' | 'envoy';
  config: Record<string, any>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  configureTraffic: (config: TrafficConfig) => Promise<void>;
  configureSecurity: (config: SecurityConfig) => Promise<void>;
  configureObservability: (config: ObservabilityConfig) => Promise<void>;
}

export interface TrafficConfig {
  routes: RouteRule[];
  virtualServices: VirtualService[];
  destinationRules: DestinationRule[];
}

export interface SecurityConfig {
  mTLS: boolean;
  authorization: AuthorizationPolicy[];
  authentication: AuthenticationPolicy[];
}

export interface ObservabilityConfig {
  tracing: TracingConfig;
  metrics: MetricsConfig;
  logging: LoggingConfig;
}

export interface RouteRule {
  name: string;
  match: RouteMatch;
  route: RouteDestination[];
  retries?: RetryPolicy;
  timeout?: string;
}

export interface RouteMatch {
  uri?: MatchString;
  method?: MatchString;
  headers?: Record<string, MatchString>;
  sourceLabels?: Record<string, string>;
}

export interface MatchString {
  exact?: string;
  prefix?: string;
  regex?: string;
}

export interface RouteDestination {
  host: string;
  subset?: string;
  port?: number;
  weight: number;
}

export interface VirtualService {
  name: string;
  hosts: string[];
  http: RouteRule[];
  tcp?: RouteRule[];
  tls?: RouteRule[];
}

export interface DestinationRule {
  name: string;
  host: string;
  trafficPolicy?: TrafficPolicy;
  subsets?: Subset[];
}

export interface TrafficPolicy {
  loadBalancer?: LoadBalancerPolicy;
  connectionPool?: ConnectionPoolSettings;
  outlierDetection?: OutlierDetection;
  circuitBreaker?: CircuitBreakerPolicy;
}

export interface LoadBalancerPolicy {
  simple?: 'ROUND_ROBIN' | 'LEAST_CONN' | 'RANDOM' | 'PASSTHROUGH';
  consistentHash?: ConsistentHashLB;
}

export interface ConnectionPoolSettings {
  tcp?: TCPSettings;
  http?: HTTPSettings;
}

export interface TCPSettings {
  maxConnections?: number;
  connectTimeout?: string;
  keepAlive?: KeepAlive;
}

export interface HTTPSettings {
  http1MaxPendingRequests?: number;
  http2MaxRequests?: number;
  maxRequestsPerConnection?: number;
  maxRetries?: number;
  consecutiveGatewayErrors?: number;
  interval?: string;
  baseEjectionTime?: string;
  maxEjectionPercent?: number;
  minHealthPercent?: number;
}

export interface OutlierDetection {
  consecutiveGatewayErrors?: number;
  consecutive5xxErrors?: number;
  interval?: string;
  baseEjectionTime?: string;
  maxEjectionPercent?: number;
  minHealthPercent?: number;
  splitExternalLocalOriginErrors?: boolean;
}

export interface CircuitBreakerPolicy {
  consecutiveGatewayErrors?: number;
  interval?: string;
  baseEjectionTime?: string;
  maxEjectionPercent?: number;
  minHealthPercent?: number;
}

export interface Subset {
  name: string;
  labels: Record<string, string>;
  trafficPolicy?: TrafficPolicy;
}

export interface ConsistentHashLB {
  httpHeaderName?: string;
  httpCookie?: HTTPCookie;
  useSourceIp?: boolean;
  minimumRingSize?: number;
}

export interface HTTPCookie {
  name: string;
  path?: string;
  ttl?: string;
}

export interface KeepAlive {
  time?: string;
  interval?: string;
  probes?: number;
}

export interface AuthorizationPolicy {
  name: string;
  action: 'ALLOW' | 'DENY';
  rules: Rule[];
}

export interface AuthenticationPolicy {
  name: string;
  principalBinding: 'USE_PEER' | 'USE_ORIGIN';
  origins?: OriginAuthenticationMethod[];
  peers?: PeerAuthenticationMethod[];
  jwtRules?: Jwtrule[];
}

export interface Rule {
  from?: Source[];
  to?: To[];
  when?: Condition[];
}

export interface Source {
  principals?: string[];
  namespaces?: string[];
  ipBlocks?: string[];
}

export interface To {
  operation?: Operation;
}

export interface Condition {
  key: string;
  values: string[];
}

export interface Operation {
  hosts?: string[];
  paths?: string[];
  methods?: string[];
  ports?: string[];
}

export interface OriginAuthenticationMethod {
  jwt?: Jwt;
}

export interface PeerAuthenticationMethod {
  mtls?: MutualTls;
}

export interface Jwtrule {
  issuer: string;
  audiences?: string[];
  jwksUri?: string;
  jwtHeaders?: string[];
  forwardOriginalToken?: boolean;
}

export interface MutualTls {
  mode: 'DISABLE' | 'PERMISSIVE' | 'STRICT';
}

export interface TracingConfig {
  enabled: boolean;
  sampling: number;
  zipkin?: ZipkinConfig;
  jaeger?: JaegerConfig;
  datadog?: DatadogConfig;
}

export interface MetricsConfig {
  enabled: boolean;
  prometheus?: PrometheusConfig;
  statsd?: StatsdConfig;
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'debug' | 'info' | 'warn' | 'error';
  format: string;
}

export interface ZipkinConfig {
  address: string;
  port: number;
  endpoint: string;
}

export interface JaegerConfig {
  address: string;
  port: number;
  endpoint: string;
}

export interface DatadogConfig {
  address: string;
  port: number;
  endpoint: string;
}

export interface PrometheusConfig {
  address: string;
  port: number;
  path: string;
}

export interface StatsdConfig {
  address: string;
  port: number;
  prefix: string;
}

// Export all service types
export * from './services';