/**
 * API Gateway Configuration
 * 
 * Central configuration management for the Maysar API Gateway
 * including environment variables, service configuration, and runtime settings
 */

import dotenv from 'dotenv';
import path from 'path';
import { GatewayConfig, ServiceRegistry, RouteConfig } from '../types';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Environment detection
const environment = (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development';
const isDevelopment = environment === 'development';
const isProduction = environment === 'production';
const isStaging = environment === 'staging';

// Security configuration
const securityConfig = {
  jwtSecret: process.env.JWT_SECRET || 'maysar-api-gateway-secret-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  issuer: process.env.JWT_ISSUER || 'maysar-api-gateway',
  audience: process.env.JWT_AUDIENCE || 'maysar-platform',
  algorithms: ['HS256'],
  publicKey: process.env.JWT_PUBLIC_KEY,
  privateKey: process.env.JWT_PRIVATE_KEY,
  
  // Auth Service Client Configuration
  authServiceUrl: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  authServiceTimeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '10000'),
  authServiceRetryAttempts: parseInt(process.env.AUTH_SERVICE_RETRY_ATTEMPTS || '3'),
  authServiceRetryDelay: parseInt(process.env.AUTH_SERVICE_RETRY_DELAY || '1000'),
  serviceKey: process.env.GATEWAY_SERVICE_KEY || 'gateway-service-key',
  serviceId: process.env.GATEWAY_SERVICE_ID || 'api-gateway',
  
  // Rate limiting
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESS === 'true',
    skipFailedRequests: process.env.RATE_LIMIT_SKIP_FAILED === 'true',
  },
  
  // CORS
  cors: {
    origins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'https://admin.maysar.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
    credentials: true,
  },
  
  // Helmet security
  helmet: {
    contentSecurityPolicy: isProduction,
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  },
  
  // Timeout
  timeout: parseInt(process.env.REQUEST_TIMEOUT || '30000'), // 30 seconds
};

// Service discovery configuration
const serviceDiscoveryConfig = {
  type: (process.env.SERVICE_DISCOVERY_TYPE as 'consul' | 'etcd' | 'kubernetes' | 'static') || 'static',
  consul: {
    host: process.env.CONSUL_HOST || 'localhost',
    port: parseInt(process.env.CONSUL_PORT || '8500'),
    token: process.env.CONSUL_TOKEN,
    datacenter: process.env.CONSUL_DATACENTER || 'dc1',
  },
  kubernetes: {
    namespace: process.env.KUBERNETES_NAMESPACE || 'default',
    serviceAccount: process.env.KUBERNETES_SERVICE_ACCOUNT || 'default',
    clusterDomain: process.env.KUBERNETES_CLUSTER_DOMAIN || 'cluster.local',
  },
  static: {
    services: JSON.parse(process.env.STATIC_SERVICES || '{}'),
  },
};

// Service registry configuration
const serviceRegistryConfig: ServiceRegistry = {
  'auth-service': [
    {
      id: 'auth-service-1',
      name: 'auth-service',
      host: process.env.AUTH_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.AUTH_SERVICE_PORT || '3001'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'catalog-service': [
    {
      id: 'catalog-service-1',
      name: 'catalog-service',
      host: process.env.CATALOG_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.CATALOG_SERVICE_PORT || '3002'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'order-service': [
    {
      id: 'order-service-1',
      name: 'order-service',
      host: process.env.ORDER_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.ORDER_SERVICE_PORT || '3003'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'payment-service': [
    {
      id: 'payment-service-1',
      name: 'payment-service',
      host: process.env.PAYMENT_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.PAYMENT_SERVICE_PORT || '3004'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'user-service': [
    {
      id: 'user-service-1',
      name: 'user-service',
      host: process.env.USER_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.USER_SERVICE_PORT || '3005'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'seller-service': [
    {
      id: 'seller-service-1',
      name: 'seller-service',
      host: process.env.SELLER_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.SELLER_SERVICE_PORT || '3006'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'courier-service': [
    {
      id: 'courier-service-1',
      name: 'courier-service',
      host: process.env.COURIER_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.COURIER_SERVICE_PORT || '3007'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'logistics-service': [
    {
      id: 'logistics-service-1',
      name: 'logistics-service',
      host: process.env.LOGISTICS_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.LOGISTICS_SERVICE_PORT || '3008'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'notification-service': [
    {
      id: 'notification-service-1',
      name: 'notification-service',
      host: process.env.NOTIFICATION_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3009'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'analytics-service': [
    {
      id: 'analytics-service-1',
      name: 'analytics-service',
      host: process.env.ANALYTICS_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.ANALYTICS_SERVICE_PORT || '3010'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'commission-service': [
    {
      id: 'commission-service-1',
      name: 'commission-service',
      host: process.env.COMMISSION_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.COMMISSION_SERVICE_PORT || '3011'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'community-service': [
    {
      id: 'community-service-1',
      name: 'community-service',
      host: process.env.COMMUNITY_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.COMMUNITY_SERVICE_PORT || '3012'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'compliance-service': [
    {
      id: 'compliance-service-1',
      name: 'compliance-service',
      host: process.env.COMPLIANCE_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.COMPLIANCE_SERVICE_PORT || '3013'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'enabler-service': [
    {
      id: 'enabler-service-1',
      name: 'enabler-service',
      host: process.env.ENABLER_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.ENABLER_SERVICE_PORT || '3014'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
  'supplier-service': [
    {
      id: 'supplier-service-1',
      name: 'supplier-service',
      host: process.env.SUPPLIER_SERVICE_HOST || 'localhost',
      port: parseInt(process.env.SUPPLIER_SERVICE_PORT || '3015'),
      protocol: 'http',
      version: '1.0.0',
      health: 'healthy',
      metadata: { region: 'us-east-1', environment: environment },
      lastHealthCheck: new Date(),
      weight: 100,
    },
  ],
};

// Route configuration
const routeConfig: RouteConfig[] = [
  // Authentication routes
  {
    path: '/auth/*',
    method: 'POST',
    service: 'auth-service',
    timeout: 10000,
    retries: 2,
    authentication: { required: false },
    authorization: { required: false },
  },
  {
    path: '/auth/*',
    method: 'GET',
    service: 'auth-service',
    timeout: 10000,
    retries: 2,
    authentication: { required: false },
    authorization: { required: false },
  },
  
  // Admin routes
  {
    path: '/admin/*',
    method: 'GET',
    service: 'auth-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['admin'] },
  },
  {
    path: '/admin/*',
    method: 'POST',
    service: 'auth-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['admin'] },
  },
  {
    path: '/admin/*',
    method: 'PUT',
    service: 'auth-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['admin'] },
  },
  {
    path: '/admin/*',
    method: 'DELETE',
    service: 'auth-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['admin'] },
  },
  
  // Seller routes
  {
    path: '/seller/*',
    method: 'GET',
    service: 'seller-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['seller', 'admin'] },
  },
  {
    path: '/seller/*',
    method: 'POST',
    service: 'seller-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['seller', 'admin'] },
  },
  {
    path: '/seller/*',
    method: 'PUT',
    service: 'seller-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['seller', 'admin'] },
  },
  {
    path: '/seller/*',
    method: 'DELETE',
    service: 'seller-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['seller', 'admin'] },
  },
  
  // Courier routes
  {
    path: '/courier/*',
    method: 'GET',
    service: 'courier-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['courier', 'admin'] },
  },
  {
    path: '/courier/*',
    method: 'POST',
    service: 'courier-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['courier', 'admin'] },
  },
  {
    path: '/courier/*',
    method: 'PUT',
    service: 'courier-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['courier', 'admin'] },
  },
  {
    path: '/courier/*',
    method: 'DELETE',
    service: 'courier-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['courier', 'admin'] },
  },
  
  // Enabler routes
  {
    path: '/enabler/*',
    method: 'GET',
    service: 'enabler-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['enabler', 'admin'] },
  },
  {
    path: '/enabler/*',
    method: 'POST',
    service: 'enabler-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['enabler', 'admin'] },
  },
  {
    path: '/enabler/*',
    method: 'PUT',
    service: 'enabler-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['enabler', 'admin'] },
  },
  {
    path: '/enabler/*',
    method: 'DELETE',
    service: 'enabler-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['enabler', 'admin'] },
  },
  
  // Supplier routes
  {
    path: '/supplier/*',
    method: 'GET',
    service: 'supplier-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['supplier', 'admin'] },
  },
  {
    path: '/supplier/*',
    method: 'POST',
    service: 'supplier-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['supplier', 'admin'] },
  },
  {
    path: '/supplier/*',
    method: 'PUT',
    service: 'supplier-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['supplier', 'admin'] },
  },
  {
    path: '/supplier/*',
    method: 'DELETE',
    service: 'supplier-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['supplier', 'admin'] },
  },
  
  // Catalog routes
  {
    path: '/catalog/*',
    method: 'GET',
    service: 'catalog-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: false },
    authorization: { required: false },
  },
  {
    path: '/catalog/*',
    method: 'POST',
    service: 'catalog-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['seller', 'admin'] },
  },
  {
    path: '/catalog/*',
    method: 'PUT',
    service: 'catalog-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['seller', 'admin'] },
  },
  {
    path: '/catalog/*',
    method: 'DELETE',
    service: 'catalog-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['seller', 'admin'] },
  },
  
  // Order routes
  {
    path: '/orders/*',
    method: 'GET',
    service: 'order-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['customer', 'seller', 'admin'] },
  },
  {
    path: '/orders/*',
    method: 'POST',
    service: 'order-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['customer', 'admin'] },
  },
  {
    path: '/orders/*',
    method: 'PUT',
    service: 'order-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['seller', 'admin'] },
  },
  {
    path: '/orders/*',
    method: 'DELETE',
    service: 'order-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['customer', 'admin'] },
  },
  
  // Payment routes
  {
    path: '/payments/*',
    method: 'GET',
    service: 'payment-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['customer', 'seller', 'admin'] },
  },
  {
    path: '/payments/*',
    method: 'POST',
    service: 'payment-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['customer', 'admin'] },
  },
  {
    path: '/payments/*',
    method: 'PUT',
    service: 'payment-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['customer', 'admin'] },
  },
  {
    path: '/payments/*',
    method: 'DELETE',
    service: 'payment-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['customer', 'admin'] },
  },
  
  // User routes
  {
    path: '/users/*',
    method: 'GET',
    service: 'user-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['customer', 'seller', 'admin'] },
  },
  {
    path: '/users/*',
    method: 'POST',
    service: 'user-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['customer', 'seller', 'admin'] },
  },
  {
    path: '/users/*',
    method: 'PUT',
    service: 'user-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['customer', 'seller', 'admin'] },
  },
  {
    path: '/users/*',
    method: 'DELETE',
    service: 'user-service',
    timeout: 30000,
    retries: 3,
    authentication: { required: true },
    authorization: { required: true, roles: ['admin'] },
  },
];

// Circuit breaker configuration
const circuitBreakerConfig = {
  failureThreshold: parseInt(process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5'),
  recoveryTimeout: parseInt(process.env.CIRCUIT_BREAKER_RECOVERY_TIMEOUT || '30000'),
  resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT || '60000'),
  monitoringPeriod: parseInt(process.env.CIRCUIT_BREAKER_MONITORING_PERIOD || '10000'),
  volumeThreshold: parseInt(process.env.CIRCUIT_BREAKER_VOLUME_THRESHOLD || '10'),
};

// Load balancer configuration
const loadBalancerConfig = {
  strategy: (process.env.LOAD_BALANCER_STRATEGY as 'round_robin' | 'least_connections' | 'weighted_round_robin' | 'random') || 'round_robin',
  healthCheckInterval: parseInt(process.env.LOAD_BALANCER_HEALTH_CHECK_INTERVAL || '30000'),
  healthCheckTimeout: parseInt(process.env.LOAD_BALANCER_HEALTH_CHECK_TIMEOUT || '5000'),
  maxRetries: parseInt(process.env.LOAD_BALANCER_MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.LOAD_BALANCER_RETRY_DELAY || '1000'),
};

// Monitoring configuration
const monitoringConfig = {
  enabled: process.env.MONITORING_ENABLED === 'true',
  metrics: process.env.METRICS_ENABLED === 'true',
  tracing: process.env.TRACING_ENABLED === 'true',
  logs: process.env.LOGS_ENABLED === 'true',
  
  prometheus: {
    enabled: process.env.PROMETHEUS_ENABLED === 'true',
    port: parseInt(process.env.PROMETHEUS_PORT || '9090'),
    path: process.env.PROMETHEUS_PATH || '/metrics',
  },
  
  jaeger: {
    enabled: process.env.JAEGER_ENABLED === 'true',
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    sampler: {
      type: process.env.JAEGER_SAMPLER_TYPE || 'const',
      param: parseFloat(process.env.JAEGER_SAMPLER_PARAM || '1.0'),
    },
  },
  
  logging: {
    level: (process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug') || 'info',
    format: process.env.LOG_FORMAT || 'json',
    file: {
      enabled: process.env.LOG_FILE_ENABLED === 'true',
      path: process.env.LOG_FILE_PATH || './logs',
      maxSize: process.env.LOG_FILE_MAX_SIZE || '100m',
      maxFiles: parseInt(process.env.LOG_FILE_MAX_FILES || '10'),
    },
  },
};

// Cache configuration
const cacheConfig = {
  enabled: process.env.CACHE_ENABLED === 'true',
  ttl: parseInt(process.env.CACHE_TTL || '3600'),
  maxItems: parseInt(process.env.CACHE_MAX_ITEMS || '1000'),
  compression: process.env.CACHE_COMPRESSION === 'true',
  encryption: process.env.CACHE_ENCRYPTION === 'true',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
  },
};

// Event configuration
const eventConfig = {
  enabled: process.env.EVENTS_ENABLED === 'true',
  broker: process.env.EVENT_BROKER || 'kafka',
  kafka: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    clientId: process.env.KAFKA_CLIENT_ID || 'maysar-api-gateway',
    groupId: process.env.KAFKA_GROUP_ID || 'maysar-api-gateway-group',
  },
};

// Gateway configuration
const gatewayConfig: GatewayConfig = {
  port: parseInt(process.env.GATEWAY_PORT || '3000'),
  environment,
  logLevel: monitoringConfig.logging.level,
  cors: securityConfig.cors,
  security: {
    helmet: true,
    rateLimiting: true,
    cors: true,
    compression: true,
    timeout: securityConfig.timeout,
  },
  monitoring: monitoringConfig,
  services: serviceRegistryConfig,
  routes: routeConfig,
  auth: securityConfig,
  rateLimiting: securityConfig.rateLimiting,
  circuitBreaker: circuitBreakerConfig,
  loadBalancer: loadBalancerConfig,
};

// Validation
const validateConfig = (): void => {
  const requiredEnvVars = [
    'NODE_ENV',
    'JWT_SECRET',
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  if (isProduction && gatewayConfig.auth.jwtSecret === 'maysar-api-gateway-secret-key-change-in-production') {
    throw new Error('JWT_SECRET must be changed in production');
  }
};

// Initialize configuration
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error);
  process.exit(1);
}

// Export configuration
export {
  environment,
  isDevelopment,
  isProduction,
  isStaging,
  securityConfig,
  serviceDiscoveryConfig,
  serviceRegistryConfig,
  routeConfig,
  circuitBreakerConfig,
  loadBalancerConfig,
  monitoringConfig,
  cacheConfig,
  eventConfig,
  gatewayConfig,
};

export default gatewayConfig;