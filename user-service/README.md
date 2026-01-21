# User Service

Enterprise-grade user management microservice for the Maysar marketplace platform.

## Overview

The User Service is responsible for comprehensive user profile management, including registration, verification, preferences, addresses, and user data consistency across the platform.

## Architecture

This service follows the **Clean Architecture** pattern with strict layer separation:

```
src/
 ├── domain/           # Business logic & rules
 │    ├── entities/    # User entity & domain models
 │    ├── value-objects/ # Email, PhoneNumber, etc.
 │    ├── engines/     # Business decision engines
 │    ├── policies/    # Business rules & constraints
 │    ├── algorithms/  # Pure computation logic
 │    └── events/      # Domain events
 │
 ├── application/      # Use cases & orchestration
 │    ├── use-cases/   # User CRUD operations
 │    ├── sagas/       # Multi-service coordination
 │    ├── dto/         # Data transfer objects
 │    └── mappers/     # Object mapping
 │
 ├── infrastructure/   # External system adapters
 │    ├── repositories/ # Database access
 │    ├── messaging/   # Event publishing
 │    ├── providers/   # External integrations
 │    └── cache/       # Caching layer
 │
 └── api/             # Transport & validation
      ├── controllers/ # HTTP request handlers
      ├── routes/      # Route definitions
      └── validators/  # Input validation
```

## Responsibilities

### Core Features
- **User Registration**: Complete user onboarding workflow
- **Profile Management**: User information CRUD operations
- **Address Management**: Multiple user addresses with types
- **Verification**: Email and phone number verification
- **Preferences**: Language, timezone, notification settings
- **Security**: Password reset, account locking, audit logging

### API Endpoints
- `POST /users` - Register new user
- `GET /users/:id` - Get user profile
- `PUT /users/:id` - Update user profile
- `DELETE /users/:id` - Delete user account
- `GET /users/search` - Search users (admin)
- `POST /users/:id/verify-email` - Verify email
- `POST /users/:id/verify-phone` - Verify phone
- `GET /users/:id/addresses` - Get user addresses
- `POST /users/:id/addresses` - Add user address

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
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed

# Start development server
npm run dev
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

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run integration tests
npm run test:integration

# Run specific test file
npm test -- src/domain/entities/user.entity.test.ts
```

## Deployment

### Docker
```bash
# Build image
docker build -t user-service .

# Run container
docker run -p 3001:3001 --env-file .env user-service
```

### Kubernetes
See `k8s/` directory for deployment manifests.

## Monitoring & Observability

- **Logging**: Structured logging with Winston
- **Metrics**: Request/response metrics
- **Health Checks**: `/health` endpoint
- **Tracing**: Distributed tracing support

## Security

- **Authentication**: JWT-based service authentication
- **Authorization**: Role-based access control
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Configurable request limits
- **Audit Logging**: All user actions logged
- **Data Encryption**: Sensitive data encrypted at rest

## Contributing

1. Follow the architecture constitution
2. Write tests for new features
3. Update documentation
4. Ensure code coverage > 90%
5. Run security scans before committing

## License

MIT License - see LICENSE file for details.

## Related Services

- **Auth Service**: Handles authentication logic
- **Order Service**: References user data
- **Community Service**: Uses user profiles
- **Notification Service**: Sends user notifications
