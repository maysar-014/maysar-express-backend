# Order Service - Enterprise-Grade Microservice

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://docker.com/)
[![Orchestrator](https://img.shields.io/badge/Orchestrator-Ready-blue)](https://example.com/orchestrator-docs/)

> Enterprise-grade Order Service for the Maysar Digital Community Trade Network with comprehensive robustness features, monitoring, and production-ready deployment.

## ðŸ—ï¸ Architecture Overview

The Order Service is built with Clean Architecture principles and implements enterprise-grade features:

### Core Features
- âœ… **Order Lifecycle Management**: Create, update, track, and cancel orders
- âœ… **Multi-Payment Support**: COD, Card, and Mobile Money payments
- âœ… **Real-time Tracking**: Order status and delivery tracking
- âœ… **Inventory Integration**: Automatic stock management
- âœ… **Event-Driven Architecture**: Saga orchestration for complex workflows

### Enterprise Features
- âœ… **Database Integration**: Prisma ORM with PostgreSQL + Database failover
- âœ… **Security**: Helmet, CORS, Rate Limiting, Input Validation, JWT
- âœ… **Monitoring**: Winston logging, Prometheus metrics, Health checks
- âœ… **Caching**: Redis multi-level caching with tag-based invalidation
- âœ… **Resilience**: Circuit breaker, exponential backoff retry logic
- âœ… **Testing**: 90%+ coverage with unit, integration, and API contract tests

## ðŸš€ Quick Start

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose (for local development)
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### 1. Environment Setup

```bash
# Clone the repository
cd order-service

# Copy environment configuration
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Local Development with Docker Compose

```bash
# Start all services (PostgreSQL, Redis, Database, Order Service)
docker-compose up -d

# View logs
docker-compose logs -f order-service

# Run tests
docker-compose exec order-service npm test

# Stop services
docker-compose down
```

### 3. Manual Development Setup

```bash
# Install dependencies
npm install

# Set up local PostgreSQL (or use Docker)
createdb order_service_dev
psql order_service_dev -c "CREATE USER order_user WITH PASSWORD 'order_password';"
psql order_service_dev -c "GRANT ALL PRIVILEGES ON DATABASE order_service_dev TO order_user;"

# Run database migrations
npm run db:push

# Seed database (optional)
npm run db:seed

# Start development server
npm run dev

# Run tests
npm run test:unit
npm run test:integration
npm run test:coverage
```

## ðŸ“¡ API Documentation

### OpenAPI Specification
The complete API documentation is available in OpenAPI 3.0 format:
- **File**: `openapi.yaml`
- **Interactive Docs**: Import into Swagger UI or Redoc

### Postman Collection
Comprehensive API testing collection with automated validation:
- **File**: `order-service-api.postman_collection.json`
- **Import** into Postman for full API testing suite

### Key Endpoints

```bash
# Health Checks
GET  /api/health           # Comprehensive health check
GET  /api/health/live      # Orchestrator liveness probe
GET  /api/health/ready     # Orchestrator readiness probe

# Order Management
POST /api/orders           # Create new order
GET  /api/orders           # List orders (paginated)
GET  /api/orders/{id}      # Get order details
PUT  /api/orders/{id}      # Update order
DELETE /api/orders/{id}    # Cancel order

# Payment Processing
POST /api/orders/{id}/payment  # Process payment
GET  /api/orders/{id}/payment  # Get payment status

# Analytics
GET  /api/analytics/orders     # Order analytics
```

## ðŸ§ª Testing

### Test Commands

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit           # Unit tests only
npm run test:integration    # Integration tests only
npm run test:coverage       # Tests with coverage report

# API testing scripts
node test-api.js            # Complete API test suite
node scripts/contract-tests.js test  # API contract tests
node scripts/api-coverage-verification.js  # Coverage verification
node performance-benchmarks.js  # Performance benchmarks
```

### Test Coverage
- **Unit Tests**: Domain logic, utilities, infrastructure components
- **Integration Tests**: API endpoints, external service interactions
- **Contract Tests**: API schema validation and response verification
- **Performance Tests**: Load testing and benchmarking

## ðŸ³ Docker Deployment

### Build and Run

```bash
# Build production image
docker build -t maysar/order-service:latest .

# Run with environment variables
docker run -p 3002:3002 \
  -e DATABASE_URL="postgresql://..." \
  -e REDIS_HOST="redis" \
  -e JWT_SECRET="your-secret" \
  maysar/order-service:latest

# Or use Docker Compose for full stack
docker-compose up -d
```

### Multi-stage Build Features
- **Dependencies**: Isolated dependency installation
- **Build**: TypeScript compilation and optimization
- **Production**: Minimal runtime with security hardening
- **Testing**: Automated testing in build pipeline

## â˜¸ï¸ Orchestrator Deployment

### Prerequisites
- Orchestrator cluster (v1.19+)
- deployctl configured
- NGINX Ingress Controller (optional)

### Deploy to Orchestrator

```bash
# Create namespace
deployctl apply -f deploy/namespace.yaml

# Deploy ConfigMap and Secrets
deployctl apply -f deploy/configmap.yaml
deployctl apply -f deploy/secret.yaml

# Deploy PostgreSQL and Redis (if not using managed services)
deployctl apply -f deploy/postgres.yaml
deployctl apply -f deploy/redis.yaml

# Deploy Order Service
deployctl apply -f deploy/deployment.yaml
deployctl apply -f deploy/service.yaml
deployctl apply -f deploy/ingress.yaml

# Check deployment status
deployctl get pods -n order-service
deployctl logs -f deployment/order-service -n order-service
```

### Orchestrator Features
- âœ… **Rolling Updates**: Zero-downtime deployments
- âœ… **Health Checks**: Liveness and readiness probes
- âœ… **Resource Limits**: CPU and memory management
- âœ… **Security Context**: Non-root user, read-only filesystem
- âœ… **Network Policies**: Traffic isolation and security
- âœ… **Service Mesh Ready**: Istio/Kong integration prepared

## ðŸ”’ Security

### Implemented Security Features
- âœ… **Helmet.js**: Security headers (CSP, HSTS, X-Frame-Options)
- âœ… **CORS**: Configurable cross-origin resource sharing
- âœ… **Rate Limiting**: Request throttling (100 req/15min per IP)
- âœ… **Input Validation**: Express-validator with sanitization
- âœ… **JWT Authentication**: Bearer token validation
- âœ… **SQL Injection Prevention**: Prisma ORM with parameterized queries
- âœ… **XSS Protection**: Input sanitization and content security policy

### Security Scanning

```bash
# Run security scan
node scripts/security-scan.js

# Check for vulnerabilities
npm audit

# Scan container image (requires Trivy)
trivy image maysar/order-service:latest
```

## ðŸ“Š Monitoring & Observability

### Logging
- âœ… **Structured Logging**: Winston with JSON format
- âœ… **Log Levels**: error, warn, info, debug
- âœ… **Request Correlation**: X-Request-ID tracing
- âœ… **Business Events**: Domain event logging

### Metrics
- âœ… **Prometheus Compatible**: HTTP `/metrics` endpoint
- âœ… **Custom Metrics**: Order creation rate, payment success rate
- âœ… **Performance Metrics**: Response times, error rates
- âœ… **Business Metrics**: Order volume, revenue tracking

### Health Checks
- âœ… **Application Health**: Service availability
- âœ… **Dependency Health**: Database, Redis, external services
- âœ… **Business Health**: Payment gateway connectivity
- âœ… **Orchestrator Integration**: Liveness and readiness probes

### Monitoring Dashboards
- âœ… **Grafana**: Pre-configured dashboards
- âœ… **Prometheus**: Metrics collection and alerting
- âœ… **ELK Stack**: Log aggregation and analysis

## ðŸ—ï¸ Development Workflow

### Code Quality
```bash
# Run linting
npm run lint

# Run tests with coverage
npm run test:coverage

# Build production bundle
npm run build

# Type checking
npx tsc --noEmit
```

### Database Operations
```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name your_migration_name

# Push schema changes
npm run db:push

# View database
npm run db:studio

# Reset database
npm run db:reset
```

### API Testing Workflow
```bash
# Import Postman collection
# Set environment variables
# Run API contract tests
node scripts/contract-tests.js test

# Verify API coverage
node scripts/api-coverage-verification.js

# Run performance benchmarks
node performance-benchmarks.js
```

## ðŸ”§ Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | No |
| `PORT` | Service port | `3002` | No |
| `DATABASE_URL` | PostgreSQL connection string | - | Yes |
| `REDIS_HOST` | Redis hostname | `localhost` | No |
| `REDIS_PORT` | Redis port | `6379` | No |
| `JWT_SECRET` | JWT signing secret | - | Yes |
| `CORS_ORIGIN` | Allowed CORS origins | - | No |
| `LOG_LEVEL` | Logging level | `info` | No |
| `ENABLE_METRICS` | Enable Prometheus metrics | `false` | No |

### Feature Flags

| Flag | Description | Default |
|------|-------------|---------|
| `ENABLE_RATE_LIMITING` | Enable request rate limiting | `true` |
| `ENABLE_CORS` | Enable CORS middleware | `true` |
| `ENABLE_COMPRESSION` | Enable response compression | `true` |
| `ENABLE_CACHING` | Enable Redis caching | `true` |

## ðŸš¦ Troubleshooting

### Common Issues

#### Database Connection Failed
```bash
# Check database connectivity
npm run db:test

# Reset database
npm run db:reset

# Check environment variables
cat .env | grep DATABASE_URL
```

#### Service Won't Start
```bash
# Check logs
docker-compose logs order-service

# Verify environment
node -e "console.log(process.env)"

# Test dependencies
curl http://localhost:5432  # PostgreSQL
redis-cli ping              # Redis
```

#### Tests Failing
```bash
# Run tests individually
npm run test:unit
npm run test:integration

# Check test environment
cat test/setup.ts

# Clear test cache
npx jest --clearCache
```

### Health Check Endpoints

```bash
# Application health
curl http://localhost:3002/api/health

# Database connectivity
curl http://localhost:3002/api/health/ready

# Service liveness
curl http://localhost:3002/api/health/live
```

## ðŸ“š Additional Resources

- [OpenAPI Specification](openapi.yaml) - Complete API documentation
- [Postman Collection](order-service-api.postman_collection.json) - API testing suite
- [Docker Compose](docker-compose.yml) - Local development environment
- [Orchestrator Manifests](deploy/) - Production deployment files
- [Security Documentation](docs/security.md) - Security implementation details

## ðŸ¤ Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Development Standards
- âœ… **TypeScript**: Strict mode enabled
- âœ… **ESLint**: Code quality enforcement
- âœ… **Pre-commit Hooks**: Automated quality checks
- âœ… **Test Coverage**: Minimum 85% coverage required
- âœ… **Documentation**: OpenAPI and README updates required

## ðŸ“„ License

Proprietary - Maysar Digital Community Trade Network

## ðŸ†˜ Support

For support and questions:
- **Email**: devops@maysar.com
- **Documentation**: [Internal Wiki](https://wiki.maysar.com/order-service)
- **Issues**: [GitHub Issues](https://github.com/maysar/order-service/issues)

---

**Built with â¤ï¸ by the Maysar Engineering Team**

*Enterprise-grade robustness with developer experience in mind.*

