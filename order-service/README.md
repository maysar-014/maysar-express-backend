# Order Service

بسم الله الرحمن الرحيم

## Overview

The Order Service is a production-ready, enterprise-grade microservice that manages the complete order lifecycle within the Maysar Digital Community Trade Network. Built following Clean Architecture principles with comprehensive robustness features, it handles order creation, validation, payment processing, and financial settlement while delegating logistics operations to the dedicated logistics service.

## 🚀 **Key Features**

### ✅ **Enterprise-Grade Architecture**
- **Clean Architecture** with strict separation of concerns
- **Domain-Driven Design** with pure business logic
- **Event-Driven Architecture** for cross-service communication
- **Saga Orchestration** for distributed transactions

### ✅ **Production-Ready Robustness**
- **Comprehensive Monitoring & Observability**
- **Enterprise Caching Layer** (Redis + Memory)
- **Circuit Breaker Pattern** for external service resilience
- **Advanced Error Handling** with automatic alerting
- **Health Checks** and graceful degradation
- **Rate Limiting** and security middleware

### ✅ **Business Capabilities**
- **Order Lifecycle Management** with state machines
- **Payment Processing** via PesaPal integration
- **Financial Settlement** with commission calculations
- **Inventory Integration** with real-time validation
- **Multi-Currency Support** and fraud detection

## Architecture

### Clean Architecture Structure

Following the **Architecture Constitution**, the service implements Clean Architecture with four distinct layers:

```
order-service/
├── src/
│   ├── domain/                # Business Logic Layer (Pure)
│   │   ├── entities/          # Order entity & business rules
│   │   ├── value-objects/     # Address, Money value objects
│   │   ├── events/            # Domain events (OrderCreated)
│   │   ├── engines/           # Business engines (Settlement, Inventory)
│   │   ├── policies/          # Business policies (COD, Cancellation)
│   │   └── repositories/      # Repository interfaces
│   │
│   ├── application/           # Application Layer (Use Cases & Orchestration)
│   │   ├── use-cases/         # PlaceOrder use case
│   │   ├── sagas/             # Order orchestration sagas
│   │   ├── dto/               # Application DTOs
│   │   └── mappers/           # Object mappers
│   │
│   ├── infrastructure/        # Infrastructure Layer (External Concerns)
│   │   ├── repositories/      # Repository implementations
│   │   ├── messaging/         # Event publishing
│   │   ├── providers/         # External service adapters (PesaPal)
│   │   └── cache/             # Caching layer
│   │
│   ├── api/                   # Interface Layer (Transport)
│   │   ├── controllers/       # HTTP request handlers
│   │   ├── routes/            # Route definitions
│   │   └── validators/        # Request validation
│   │
│   └── main.ts                # Composition Root
│
├── test/                      # Test suites
├── docker/                    # Containerization
└── package.json
```

### Key Architectural Principles

- **Single Responsibility**: Order service focuses solely on order management
- **Dependency Inversion**: Domain layer defines interfaces, infrastructure implements them
- **Clean Boundaries**: No logistics dependencies (routing, delivery, couriers)
- **Event-Driven**: Domain events for cross-service communication
- **Saga Orchestration**: Distributed transactions for complex order flows

## Key Features

### Core Capabilities
- **Order Creation & Validation**: Comprehensive order validation with business rules
- **Payment Processing**: Integrated PesaPal payment gateway support
- **Financial Settlement**: Commission calculation and seller payouts
- **Inventory Integration**: Real-time inventory checking and reservation
- **Event Publishing**: Domain events for order lifecycle notifications

### Business Rules
- **COD Policy**: Cash-on-delivery validation and processing
- **Cancellation Policy**: Order cancellation business rules
- **Settlement Engine**: Platform commission and payout calculations
- **Order State Machine**: Proper order lifecycle management

### Integration Points
- **Payment Gateway**: PesaPal for card/mobile money payments
- **Inventory Service**: Real-time stock validation
- **Event Bus**: Domain event publishing for other services
- **External Systems**: Clean adapter pattern for third-party integrations

## 🛡️ **Robustness Features**

### **2.1 Security & Resilience**
- **Rate Limiting**: Configurable request throttling with multiple strategies
- **Security Headers**: Helmet.js with comprehensive security headers
- **Input Validation**: Request sanitization and validation middleware
- **CORS Protection**: Configurable cross-origin resource sharing
- **Circuit Breaker**: Automatic failure detection and recovery for external services
- **Retry Logic**: Exponential backoff for transient failures

### **2.2 Monitoring & Observability**
- **Structured Logging**: Winston-based logging with multiple transports
- **Performance Metrics**: Prometheus-compatible metrics collection
- **Health Checks**: Multiple health endpoints with detailed diagnostics
- **Request Tracing**: Correlation IDs for distributed tracing
- **Error Alerting**: Automatic alerting for critical system events
- **Security Monitoring**: Threat detection and audit trail logging

### **2.3 Caching Layer**
- **Multi-Level Caching**: Memory (L1) + Redis (L2) hierarchical caching
- **Cache-Aside Pattern**: Intelligent cache population with database fallback
- **Tag-Based Invalidation**: Granular cache invalidation by tags
- **HTTP Response Caching**: Automatic response caching with TTL
- **Cache Warming**: Startup cache population for frequently accessed data
- **Circuit Breaker Protection**: Cache resilience with fallback strategies

## 📊 **Monitoring & Observability**

### Health Check Endpoints
```
GET /health              # Basic health status
GET /health/detailed     # Comprehensive health report
GET /health/ready        # Readiness probe for Kubernetes
GET /health/live         # Liveness probe for Kubernetes
GET /health/metrics      # Prometheus metrics endpoint
GET /health/circuit-breakers # Circuit breaker status
```

### Monitoring Features
- **Real-time Metrics**: HTTP request counts, response times, error rates
- **Database Monitoring**: Connection pools, query performance, error tracking
- **Cache Analytics**: Hit/miss ratios, memory usage, invalidation stats
- **Business Metrics**: Order processing, payment success rates
- **System Metrics**: Memory usage, event loop lag, garbage collection

### Logging Levels
- **ERROR**: System errors and critical failures
- **WARN**: Warning conditions and retry attempts
- **INFO**: General operational messages
- **DEBUG**: Detailed debugging information

### Alert Types
- **Critical**: System failures requiring immediate attention
- **High**: Service degradation affecting users
- **Medium**: Performance issues and warnings
- **Low**: Informational alerts

## 💾 **Caching Architecture**

### Cache Strategy
```
┌─────────────────┐    ┌─────────────────┐
│   Application   │────│  Cache Manager  │
│                 │    │                 │
└─────────────────┘    └─────────────────┘
           │
    ┌──────▼──────┐
    │ Cache-Aside │
    │   Pattern   │
    └─────────────┘
           │
    ┌──────▼──────┐    ┌─────────────────┐
    │ Multi-Level │────│   Memory L1    │
    │   Cache     │    │  (Fast Access) │
    └─────────────┘    └─────────────────┘
           │
    ┌──────▼──────┐    ┌─────────────────┐
    │   Redis L2  │────│ Persistent &   │
    │              │    │ Distributed    │
    └─────────────┘    └─────────────────┘
```

### Cache Features
- **TTL Management**: Automatic expiration with configurable defaults
- **Tag Invalidation**: Bulk cache clearing by business domains
- **Serialization**: JSON-based storage with metadata
- **Health Checks**: Cache connectivity monitoring
- **Performance Metrics**: Cache hit rates and operation timing
- **Graceful Degradation**: Fallback when cache is unavailable

### HTTP Caching Middleware
```javascript
// Response caching with TTL
app.use(cacheResponse({
  ttl: 300, // 5 minutes
  tags: ['api', 'orders'],
  condition: (req, res) => req.method === 'GET'
}));

// Cache invalidation
app.use(cacheInvalidation({
  patterns: [
    {
      method: 'POST',
      path: /^\/api\/orders/,
      tags: ['orders']
    }
  ]
}));
```

## 🔧 **Configuration**

### Environment Variables
```env
# Application
PORT=3002
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/orders
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Caching
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Payment Gateway
PESAPAL_CONSUMER_KEY=your-consumer-key
PESAPAL_CONSUMER_SECRET=your-consumer-secret
PESAPAL_URL=https://cybqa.pesapal.com/pesapalv3

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info
LOG_FORMAT=json

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://maysar.com,https://admin.maysar.com
```

### Configuration Files
- **`/src/config/index.ts`**: Main application configuration
- **`/src/config/database.config.ts`**: Database connection settings
- **`/src/config/security.config.ts`**: Security and middleware settings
- **`/src/config/monitoring.config.ts`**: Logging, metrics, and caching config

## 🚀 **Performance & Scalability**

### Performance Optimizations
- **Connection Pooling**: Database and Redis connection management
- **Request Caching**: HTTP response caching with intelligent invalidation
- **Lazy Loading**: On-demand service initialization
- **Memory Management**: Efficient caching with automatic cleanup
- **Async Processing**: Non-blocking I/O operations throughout

### Scalability Features
- **Horizontal Scaling**: Stateless design for container orchestration
- **Load Balancing**: Ready for Kubernetes ingress and service mesh
- **Circuit Breakers**: Automatic failure isolation and recovery
- **Rate Limiting**: Protection against traffic spikes
- **Resource Monitoring**: Memory and CPU usage tracking

### Production Readiness
- **Health Checks**: Kubernetes readiness/liveness probes
- **Graceful Shutdown**: Proper cleanup on termination signals
- **Error Recovery**: Automatic retry and circuit breaker patterns
- **Monitoring Integration**: Prometheus metrics and alerting
- **Log Aggregation**: Structured logging for ELK stack integration

## API Endpoints

```
POST /api/orders          # Create new order
GET  /api/orders/:id      # Get order details
```

### Place Order Request
```json
{
  "buyerId": "buyer_123",
  "sellerId": "seller_456",
  "items": [
    {
      "productId": "prod_789",
      "quantity": 2,
      "price": 15000,
      "weight": 1.5
    }
  ],
  "currency": "TZS",
  "paymentMethod": "CARD",
  "deliveryAddress": {
    "street": "123 Main St",
    "city": "Dar es Salaam",
    "postalCode": "11101",
    "country": "TZ"
  }
}
```

## Development

### Prerequisites
- Node.js 18+
- TypeScript 5.0+
- npm or yarn

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run tests
npm test

# Run linting
npm run lint
```

### Dependencies
```json
{
  "dependencies": {
    "@prisma/client": "^5.7.1",
    "@supabase/supabase-js": "^2.90.0",
    "compression": "^1.8.1",
    "cors": "^2.8.5",
    "dotenv": "^17.2.3",
    "express": "^4.18.2",
    "express-rate-limit": "^7.3.1",
    "express-validator": "^7.3.1",
    "express-winston": "^4.2.0",
    "helmet": "^7.2.0",
    "ioredis": "^5.3.2",
    "prom-client": "^15.1.0",
    "redis": "^4.6.12",
    "winston": "^3.11.0",
    "zod": "^3.22.4"
  }
}
```

### Environment Variables
```env
# Application
PORT=3002
NODE_ENV=production

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/orders
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Caching
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=0

# Payment Gateway
PESAPAL_CONSUMER_KEY=your-consumer-key
PESAPAL_CONSUMER_SECRET=your-consumer-secret
PESAPAL_URL=https://cybqa.pesapal.com/pesapalv3

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=info
LOG_FORMAT=json

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN=https://maysar.com,https://admin.maysar.com
```

## Domain Model

### Core Entities
- **Order**: Central aggregate with items, payment, and delivery info
- **OrderItem**: Individual items within an order
- **Payment**: Payment processing and status tracking

### Value Objects
- **Address**: Delivery address validation
- **Money**: Currency-aware monetary calculations

### Domain Events
- **OrderCreatedEvent**: Published when new order is placed

### Business Engines
- **SettlementEngine**: Handles commission and payout calculations
- **InventoryEngine**: Manages inventory checking and reservations

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests
npm test
```

## Deployment

### Docker
```bash
# Build image
docker build -t maysar/order-service .

# Run container
docker run -p 3002:3002 maysar/order-service
```

### Kubernetes
Deployment manifests available in `/infra/k8s/` directory.

## Service Boundaries

### Responsibilities
✅ **Order Service Handles:**
- Order creation and validation
- Payment processing and fraud detection
- Financial settlement and commissions
- Order status management
- Inventory checking and reservation

❌ **Logistics Service Handles:**
- Delivery assignment and routing
- Courier coordination and tracking
- Route optimization
- Delivery scheduling

This separation ensures the Order Service remains pure and focused while maintaining clean microservice boundaries.

## Contributing

1. Follow Clean Architecture principles
2. Write comprehensive tests
3. Update documentation
4. Ensure TypeScript strict mode compliance
5. Follow conventional commit messages

## License

Copyright © 2024 Maysar Digital Community Trade Network. All rights reserved.
