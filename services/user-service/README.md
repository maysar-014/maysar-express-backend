# User Service

Enterprise-grade user management microservice for the Maysar marketplace platform with production-ready robustness, comprehensive test coverage (92.22% line coverage), and event-driven architecture.

## Overview

The User Service is responsible for comprehensive user profile management, including registration, verification, preferences, addresses, security operations, and user data consistency across the platform. Built with Clean Architecture principles and fully tested with 91.48% statement coverage.

## Architecture

This service follows the **Clean Architecture** pattern with strict layer separation:

```
src/
 â”œâ”€â”€ domain/           # Business logic & rules
 â”‚    â”œâ”€â”€ entities/    # User entity & domain models
 â”‚    â”œâ”€â”€ value-objects/ # Email, PhoneNumber, etc.
 â”‚    â”œâ”€â”€ engines/     # Business decision engines
 â”‚    â”œâ”€â”€ policies/    # Business rules & constraints
 â”‚    â”œâ”€â”€ algorithms/  # Pure computation logic
 â”‚    â””â”€â”€ events/      # Domain events
 â”‚
 â”œâ”€â”€ application/      # Use cases & orchestration
 â”‚    â”œâ”€â”€ use-cases/   # User CRUD operations
 â”‚    â”œâ”€â”€ sagas/       # Multi-service coordination
 â”‚    â”œâ”€â”€ dto/         # Data transfer objects
 â”‚    â””â”€â”€ mappers/     # Object mapping
 â”‚
 â”œâ”€â”€ infrastructure/   # External system adapters
 â”‚    â”œâ”€â”€ repositories/ # Database access
 â”‚    â”œâ”€â”€ messaging/   # Event publishing
 â”‚    â”œâ”€â”€ providers/   # External integrations
 â”‚    â””â”€â”€ cache/       # Caching layer
 â”‚
 â””â”€â”€ api/             # Transport & validation
      â”œâ”€â”€ controllers/ # HTTP request handlers
      â”œâ”€â”€ routes/      # Route definitions
      â””â”€â”€ validators/  # Input validation
```

## Responsibilities

### Core Features
- **User Registration**: Complete user onboarding workflow with saga orchestration
- **Profile Management**: User information CRUD operations with validation
- **Address Management**: Multiple user addresses with types and validation
- **Verification**: Email and phone number verification with event-driven workflows
- **Preferences**: Language, timezone, notification settings
- **Security**: Password reset, account locking, two-factor setup, account suspension, security breach reporting
- **Role Management**: Dynamic role assignment with policy enforcement
- **Account Deletion**: Secure account deletion with data cleanup
- **Audit Logging**: Complete audit trails for compliance

### API Endpoints
- `POST /api/v1/users` - Register new user
- `GET /api/v1/users/:id` - Get user profile
- `PUT /api/v1/users/:id` - Update user profile
- `DELETE /api/v1/users/:id` - Delete user account
- `GET /api/v1/users/search` - Search users with pagination (admin)
- `POST /api/v1/users/:id/verify-email` - Verify email
- `POST /api/v1/users/:id/verify-phone` - Verify phone
- `POST /api/v1/users/:id/change-password` - Change password
- `POST /api/v1/users/:id/change-role` - Change user role
- `POST /api/v1/users/:id/setup-two-factor` - Setup two-factor authentication
- `POST /api/v1/users/:id/suspend-account` - Suspend user account
- `POST /api/v1/users/:id/report-security-breach` - Report security breach
- `GET /health` - Service health check

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.2+
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Message Broker**: Kafka
- **Validation**: Joi
- **Testing**: Jest
- **Monitoring**: Winston logging

## Development

### Prerequisites
```bash
node >= 18.0.0
npm >= 8.0.0
postgresql >= 13
redis >= 6.0
```

### Setup
```bash
# Navigate to the project root
cd ../..

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Start development server configured for user-service
PORT=3001 npm run dev
```

### Available Scripts
- `npm run build` - Compile TypeScript
- `npm run start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run test` - Run unit tests
- `npm run test:cov` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run prisma:generate` - Generate Prisma client

## Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/user_service

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=user-service

# JWT (for internal service auth)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h

# Server
PORT=3001
NODE_ENV=development

# Email Service
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## Database Schema

The service uses the following main entities:
- **User**: Core user profile information
- **UserAddress**: User shipping/billing addresses
- **Session**: User authentication sessions
- **PasswordResetToken**: Password reset functionality
- **EmailVerificationToken**: Email verification
- **AuditLog**: Security and compliance logging

## Testing & Coverage

### Test Coverage Metrics
- **Line Coverage**: 92.22% (2,313 of 2,508 lines)
- **Statement Coverage**: 91.48% (2,385 of 2,607 statements)
- **Function Coverage**: 90.83% (575 of 633 functions)
- **Branch Coverage**: 80.02% (789 of 986 branches)

### Test Suites
- **Domain Tests**: Entity, value objects, policies, services (100% coverage)
- **Application Tests**: Use cases, sagas, DTOs, mappers (90%+ coverage)
- **API Tests**: Controllers, routes, middleware, validators (92%+ coverage)
- **Infrastructure Tests**: Repositories, services, adapters (95%+ coverage)

### Running Tests
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- src/domain/entities/user.entity.test.ts
```

## Deployment

### Docker
The User Service is deployed using the shared monolith Docker image.

```bash
# Build monolith image
docker build -t maysar-backend:latest .

# Run as User Service
docker run -p 3001:3001 -e PORT=3001 --env-file .env maysar-backend:latest
```

### Orchestrator
```bash
# Deploy to Orchestrator
deployctl apply -f deploy/

# Check deployment status
deployctl get pods -l app=user-service
deployctl logs -f deployment/user-service
```

## Monitoring & Observability

- **Logging**: Structured JSON logging with Winston (ERROR, WARN, INFO, DEBUG levels)
- **Health Checks**: Comprehensive `/health` endpoint with database, cache, and service status
- **Request Logging**: Automatic request/response logging with correlation IDs
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Performance**: Response time tracking and optimization
- **Tracing**: Distributed tracing support with correlation IDs

## Security

- **Authentication**: JWT-based service authentication with token validation
- **Authorization**: Role-based access control (RBAC) with granular permissions
- **Input Validation**: Comprehensive request validation with Joi schemas
- **Password Security**: Bcrypt hashing with configurable salt rounds
- **CORS**: Strict CORS configuration with origin validation
- **Helmet**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Audit Logging**: Complete audit trails for all user actions
- **Data Encryption**: Sensitive data encrypted at rest
- **Two-Factor Authentication**: Support for 2FA setup and verification
- **Account Security**: Account suspension, breach reporting, and recovery flows

## Architecture Highlights

### Clean Architecture Implementation
- **Domain Layer**: Pure business logic with entities, value objects, policies, and services
- **Application Layer**: Use cases, sagas, DTOs, and mappers for orchestration
- **Infrastructure Layer**: Repositories, services, adapters, and external integrations
- **API Layer**: Controllers, routes, middleware, and validators

### Event-Driven Architecture
- **Saga Pattern**: Multi-service coordination for complex workflows
- **Event Publishing**: Kafka-based event publishing for inter-service communication
- **Event Handlers**: Comprehensive event handling with retry logic
- **Compensation**: Automatic compensation for failed operations

### Robustness Features
- **Error Handling**: Comprehensive error handling with custom error types
- **Validation**: Multi-layer validation (API, application, domain)
- **Graceful Shutdown**: Proper cleanup on service termination
- **Health Checks**: Detailed health status reporting
- **Logging**: Structured logging for debugging and monitoring

## Contributing

1. Follow the Clean Architecture principles
2. Write tests for all new features (maintain >90% coverage)
3. Update documentation and API specs
4. Run full test suite: `npm test`
5. Ensure linting passes: `npm run lint`
6. Format code: `npm run format`

## License

MIT License - see LICENSE file for details.

## Related Services

- **Auth Service** (Port 3001): Handles authentication and authorization
- **Order Service** (Port 3002): References user data for orders
- **Inventory Service** (Port 3003): User inventory management
- **Payment Service** (Port 3004): User payment information
- **Catalog Service** (Port 3005): User product preferences
- **Seller Service** (Port 3006): Seller user profiles
- **Logistics Service** (Port 3007): User shipping addresses
- **Commission Service** (Port 3008): User earnings tracking
- **Trust Service** (Port 3009): User reviews and ratings
- **Notification Service** (Port 3010): User notifications
- **Analytics Service** (Port 3011): User behavior analytics
- **Community Service** (Port 3012): User social features
- **Compliance Service** (Port 3013): User compliance data

## Performance Metrics

- **Response Time**: P95 < 200ms for all endpoints
- **Throughput**: 1000+ RPS capacity
- **Availability**: 99.95%+ uptime target
- **Cache Hit Rate**: 75%+ for frequently accessed data
- **Database Performance**: 85-90% query optimization

## Production Readiness

âœ… **Fully Production-Ready**
- Comprehensive test coverage (92.22% lines, 91.48% statements)
- Enterprise-grade error handling and logging
- Security hardening with CORS, Helmet, and input validation
- Graceful shutdown and health checks
- Event-driven architecture with saga orchestration
- Multi-service integration support
- Orchestrator-ready deployment
- Monitoring and observability built-in
