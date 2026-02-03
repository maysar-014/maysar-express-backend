# User Service Architecture Guide

## Overview

The User Service forms the foundational identity layer of the Maysar marketplace platform. It manages the complete user lifecycle—from initial registration through account management, security operations, and eventual account closure. This service operates as a critical system component, handling authentication, authorization, and user state management across all platform roles.

Rather than serving as a simple CRUD interface, the User Service implements sophisticated business logic through a layered architecture that separates concerns, protects business rules, and enables reliable inter-service communication through event-driven patterns.

---

## Architectural Philosophy

### Clean Architecture Foundation

The User Service adheres to Clean Architecture principles, which organize code into concentric layers where each layer has a specific responsibility and dependencies flow inward toward the business core.

**The Dependency Rule**: Code in outer layers can depend on inner layers, but inner layers must never depend on outer layers. This ensures that business logic remains independent of frameworks, databases, and delivery mechanisms.

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer                             │
│         (Controllers, Routes, Middleware)                │
├─────────────────────────────────────────────────────────┤
│              Application Layer                           │
│      (Use Cases, Sagas, DTOs, Mappers)                   │
├─────────────────────────────────────────────────────────┤
│                Domain Layer                              │
│  (Entities, Value Objects, Policies, Services)           │
├─────────────────────────────────────────────────────────┤
│            Infrastructure Layer                          │
│   (Repositories, Services, Adapters, Messaging)          │
└─────────────────────────────────────────────────────────┘
```

### Business Logic Protection

The domain layer contains the true business logic—the rules that define what a user is, how users behave, and what operations are valid. This layer is deliberately isolated from all framework concerns:

- No HTTP frameworks
- No database libraries
- No message brokers
- No external service clients

This isolation ensures that business rules can be tested, understood, and modified independently of infrastructure concerns.

### Event-Driven Communication

Rather than tight coupling between services through synchronous calls, the User Service publishes domain events when significant state changes occur. Other services subscribe to these events and react accordingly. This pattern enables loose coupling, scalability, and resilience.

---

## Layer-by-Layer Architecture

### Domain Layer: The Business Core

The domain layer encapsulates everything the business knows about users. It contains no framework dependencies and can be compiled and tested in complete isolation.

#### User Entity

The `User` entity represents a user in the system with complete lifecycle management. It enforces business rules including:

- Email and phone verification requirements before certain operations
- Role-based access control with permission validation
- Account status management (active, suspended, deleted)
- Security metadata tracking (last login, failed attempts, breach reports)

The entity is immutable in its core state—changes occur through well-defined methods that validate preconditions and publish events.

```typescript
// Domain entity - pure business logic, no framework dependencies
class User {
  private userId: string;
  private email: Email;
  private phoneNumber: PhoneNumber;
  private roles: Role[];
  private status: UserStatus;
  private securityMetadata: SecurityMetadata;

  // Business operations with validation
  verifyEmail(): void {
    if (this.email.isVerified) {
      throw new EmailAlreadyVerifiedError();
    }
    this.email.markAsVerified();
    this.publishEvent(new UserEmailVerifiedEvent(this.userId));
  }

  changeRole(newRole: Role): void {
    if (!this.canChangeRole()) {
      throw new InsufficientPermissionsError();
    }
    this.roles = [newRole];
    this.publishEvent(new UserRoleChangedEvent(this.userId, newRole));
  }
}
```

#### Value Objects

Value objects encapsulate validation logic for specific concepts:

- **Email**: Validates format, enforces uniqueness constraints, tracks verification status
- **PhoneNumber**: Validates format, supports international numbers, tracks verification status
- **Address**: Validates geographic data, supports multiple address types
- **PasswordHash**: Manages secure password storage with bcrypt hashing

Value objects are immutable and compare by value rather than identity. They ensure that invalid states cannot be created.

```typescript
// Value object - encapsulates validation and behavior
class Email {
  private readonly value: string;
  private verified: boolean = false;

  constructor(value: string) {
    if (!this.isValidFormat(value)) {
      throw new InvalidEmailFormatError(value);
    }
    this.value = value;
  }

  private isValidFormat(email: string): boolean {
    // Email validation logic
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  markAsVerified(): void {
    this.verified = true;
  }

  isVerified(): boolean {
    return this.verified;
  }
}
```

#### Policies: Business Rules

Policies encode business rules that determine whether operations are allowed:

- **UserSecurityPolicy**: Determines if users can perform sensitive operations based on security status
- **UserValidationPolicy**: Validates user data against business constraints

Policies are consulted before operations proceed, ensuring that business rules are consistently enforced.

```typescript
// Policy - encodes business rules
class UserSecurityPolicy {
  canPerformSensitiveOperation(user: User): boolean {
    // Cannot perform sensitive operations if account is suspended
    if (user.isSuspended()) return false;

    // Cannot perform sensitive operations if security breach reported
    if (user.hasReportedBreach()) return false;

    // Cannot perform sensitive operations if too many failed attempts
    if (user.failedLoginAttempts > 5) return false;

    return true;
  }
}
```

#### Domain Events

Domain events represent significant state changes that other parts of the system need to know about:

- `UserRegisteredEvent`: Published when a new user completes registration
- `UserEmailVerifiedEvent`: Published when email verification succeeds
- `UserPhoneVerifiedEvent`: Published when phone verification succeeds
- `UserStatusChangedEvent`: Published when account status changes
- `UserRoleChangedEvent`: Published when user role changes
- `UserAccountSuspendedEvent`: Published when account is suspended
- `UserAccountDeletedEvent`: Published when account is deleted

These events are published by the domain layer and consumed by the application layer for saga orchestration.

### Application Layer: Use Cases and Orchestration

The application layer orchestrates domain logic to fulfill specific business use cases. It coordinates between the domain layer and infrastructure layer, ensuring that business operations complete successfully.

#### Use Cases

Each use case represents a specific business operation:

- **CreateUserUseCase**: Validates input, creates user entity, publishes events
- **VerifyEmailUseCase**: Validates token, updates user state, publishes event
- **UpdateUserUseCase**: Validates changes, updates entity, publishes events
- **ChangePasswordUseCase**: Validates current password, updates hash, publishes event
- **ChangeRoleUseCase**: Validates permissions, updates role, publishes event
- **SuspendAccountUseCase**: Validates preconditions, updates status, publishes event
- **DeleteAccountUseCase**: Validates preconditions, marks for deletion, publishes event

Each use case follows a consistent pattern:

1. Validate input using DTOs
2. Retrieve necessary domain entities
3. Invoke domain operations
4. Persist changes through repositories
5. Publish domain events
6. Return result to caller

```typescript
// Use case - orchestrates domain logic
class CreateUserUseCase {
  constructor(
    private userRepository: UserRepository,
    private eventPublisher: EventPublisher
  ) {}

  async execute(input: CreateUserDTO): Promise<UserResponseDTO> {
    // Validate input
    this.validateInput(input);

    // Create domain entity
    const user = User.create({
      email: new Email(input.email),
      phoneNumber: new PhoneNumber(input.phoneNumber),
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role
    });

    // Persist to repository
    await this.userRepository.save(user);

    // Publish domain events
    const events = user.getDomainEvents();
    for (const event of events) {
      await this.eventPublisher.publish(event);
    }

    // Return result
    return UserMapper.toPersistenceDTO(user);
  }
}
```

#### Sagas: Multi-Service Workflows

Sagas coordinate workflows that span multiple services. Each saga consists of a series of steps that execute in sequence, with automatic compensation if any step fails.

The User Service implements sagas for complex workflows:

- **UserRegistrationSaga**: Sends welcome email, publishes registration notification
- **EmailVerificationSaga**: Updates user status, sends confirmation email
- **PasswordResetSaga**: Invalidates sessions, sends password reset confirmation
- **AccountSuspensionSaga**: Notifies user, revokes active sessions
- **AccountDeletionSaga**: Archives user data, notifies dependent services

Each saga step has an `execute` method for forward progress and a `compensate` method for rollback:

```typescript
// Saga - coordinates multi-service workflow
class UserRegistrationSaga {
  async execute(event: UserRegisteredEvent): Promise<void> {
    try {
      // Step 1: Send welcome email
      await this.sendWelcomeEmail(event.userId);

      // Step 2: Publish registration notification
      await this.publishRegistrationNotification(event.userId);

      // Step 3: Update user status
      await this.updateUserStatus(event.userId, 'registered');
    } catch (error) {
      // Compensate in reverse order
      await this.compensate(event.userId);
    }
  }

  private async compensate(userId: string): Promise<void> {
    // Reverse operations in reverse order
    await this.revertUserStatus(userId);
    await this.cancelRegistrationNotification(userId);
    await this.cancelWelcomeEmail(userId);
  }
}
```

#### Data Transfer Objects (DTOs)

DTOs transfer data across service boundaries without exposing domain entities. They provide a stable contract for API consumers while allowing domain entities to evolve independently.

```typescript
// DTO - stable contract for API consumers
interface CreateUserDTO {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password: string;
  role: 'buyer' | 'seller' | 'enabler' | 'supplier';
}

interface UserResponseDTO {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}
```

#### Mappers

Mappers convert between domain entities and DTOs, ensuring that domain logic remains isolated from API concerns.

```typescript
// Mapper - converts between domain and API representations
class UserMapper {
  static toPersistenceDTO(user: User): UserResponseDTO {
    return {
      userId: user.getId(),
      email: user.getEmail().getValue(),
      firstName: user.getFirstName(),
      lastName: user.getLastName(),
      role: user.getRole().getName(),
      status: user.getStatus(),
      emailVerified: user.getEmail().isVerified(),
      phoneVerified: user.getPhoneNumber().isVerified()
    };
  }

  static toDomain(dto: CreateUserDTO): User {
    return User.create({
      email: new Email(dto.email),
      phoneNumber: new PhoneNumber(dto.phoneNumber),
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role
    });
  }
}
```

### Infrastructure Layer: External System Adapters

The infrastructure layer implements the interfaces defined by the domain layer, adapting external systems to the domain's needs.

#### Repositories

Repositories provide an abstraction over data persistence, allowing the domain layer to work with entities without knowing about databases.

The `UserRepository` interface defines the contract:

```typescript
interface UserRepository {
  save(user: User): Promise<void>;
  findById(userId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(user: User): Promise<void>;
  delete(userId: string): Promise<void>;
  search(criteria: SearchCriteria): Promise<User[]>;
}
```

The `PrismaUserRepository` implements this interface using Prisma ORM:

```typescript
class PrismaUserRepository implements UserRepository {
  constructor(private prisma: PrismaClient) {}

  async save(user: User): Promise<void> {
    const data = this.mapUserToDatabase(user);
    await this.prisma.user.create({ data });
  }

  async findById(userId: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    return record ? this.mapDatabaseToUser(record) : null;
  }

  private mapUserToDatabase(user: User): any {
    // Convert domain entity to database format
  }

  private mapDatabaseToUser(record: any): User {
    // Convert database record to domain entity
  }
}
```

#### Services

Infrastructure services provide capabilities needed by the domain and application layers:

- **LoggerService**: Structured logging with correlation IDs
- **CacheService**: Redis-based caching for performance
- **EmailService**: Email delivery integration

These services are injected into use cases and sagas, allowing them to be mocked in tests.

#### Event Publishing

The `UserEventPublisher` publishes domain events to the message broker (Kafka), enabling other services to react to user state changes.

```typescript
class UserEventPublisher {
  constructor(private kafka: KafkaClient) {}

  async publish(event: DomainEvent): Promise<void> {
    const message = {
      key: event.aggregateId,
      value: JSON.stringify(event),
      headers: {
        'event-type': event.constructor.name,
        'timestamp': new Date().toISOString()
      }
    };

    await this.kafka.send({
      topic: 'user-events',
      messages: [message]
    });
  }
}
```

### API Layer: HTTP Interface

The API layer handles HTTP requests and responses, translating between HTTP and application layer concerns.

#### Controllers

Controllers receive HTTP requests, delegate to use cases, and format responses:

```typescript
class UserController {
  constructor(
    private createUserUseCase: CreateUserUseCase,
    private getUserUseCase: GetUserUseCase,
    private updateUserUseCase: UpdateUserUseCase
  ) {}

  async createUser(req: Request, res: Response): Promise<void> {
    try {
      const input = req.body;
      const result = await this.createUserUseCase.execute(input);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.id;
      const result = await this.getUserUseCase.execute(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: Error, res: Response): void {
    if (error instanceof UserNotFoundError) {
      res.status(404).json({ success: false, error: error.message });
    } else if (error instanceof ValidationError) {
      res.status(400).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
```

#### Routes

Routes define API endpoints and apply middleware:

```typescript
const router = express.Router();

// User management endpoints
router.post('/users', createUserController.handle.bind(createUserController));
router.get('/users/:id', getUserController.handle.bind(getUserController));
router.put('/users/:id', updateUserController.handle.bind(updateUserController));
router.delete('/users/:id', deleteUserController.handle.bind(deleteUserController));

// Verification endpoints
router.post('/users/:id/verify-email', verifyEmailController.handle.bind(verifyEmailController));
router.post('/users/:id/verify-phone', verifyPhoneController.handle.bind(verifyPhoneController));

// Security endpoints
router.post('/users/:id/change-password', changePasswordController.handle.bind(changePasswordController));
router.post('/users/:id/setup-two-factor', setupTwoFactorController.handle.bind(setupTwoFactorController));
router.post('/users/:id/suspend-account', suspendAccountController.handle.bind(suspendAccountController));
router.post('/users/:id/report-security-breach', reportSecurityBreachController.handle.bind(reportSecurityBreachController));

// Admin endpoints
router.get('/users/search', searchUsersController.handle.bind(searchUsersController));

export default router;
```

#### Middleware

Middleware handles cross-cutting concerns:

- **ErrorMiddleware**: Catches unhandled errors and formats responses
- **ValidationMiddleware**: Validates requests against schemas
- **RequestLoggerMiddleware**: Logs requests and responses with correlation IDs

---

## Data Flow Through Layers

### User Registration Flow

Understanding how a request flows through the layers illustrates the architecture in action:

```
1. HTTP Request arrives at API Layer
   POST /api/users
   { email: "user@example.com", firstName: "John", ... }

2. Controller receives request
   UserController.createUser(req, res)

3. Controller delegates to Use Case
   CreateUserUseCase.execute(input)

4. Use Case validates input
   Validates email format, password strength, etc.

5. Use Case creates Domain Entity
   User.create({ email: new Email(...), ... })

6. Domain Entity enforces business rules
   Email value object validates format
   User entity initializes with valid state

7. Use Case persists to Repository
   UserRepository.save(user)

8. Repository adapts to Infrastructure
   PrismaUserRepository converts entity to database format
   Executes INSERT query

9. Use Case publishes Domain Events
   UserRegisteredEvent published to message broker

10. Saga consumes event
    UserRegistrationSaga.execute(event)

11. Saga orchestrates multi-service workflow
    Sends welcome email
    Publishes registration notification

12. Controller formats response
    Returns 201 Created with user data

13. Response sent to client
    { success: true, data: { userId: "...", email: "...", ... } }
```

### Email Verification Flow

When a user clicks an email verification link:

```
1. HTTP Request arrives at API Layer
   POST /api/users/verify-email/token-123

2. Controller receives request
   VerifyEmailController.verifyEmail(req, res)

3. Controller delegates to Use Case
   VerifyEmailUseCase.execute(token)

4. Use Case validates token
   Checks token format, expiration, validity

5. Use Case retrieves User from Repository
   UserRepository.findById(userId)

6. Use Case invokes Domain Operation
   User.verifyEmail()

7. Domain Entity validates preconditions
   Checks if email already verified
   Checks if user status allows verification

8. Domain Entity updates state
   Email value object marked as verified
   UserEmailVerifiedEvent published

9. Use Case persists changes
   UserRepository.update(user)

10. Use Case publishes Domain Events
    UserEmailVerifiedEvent published to message broker

11. Saga consumes event
    EmailVerificationSaga.execute(event)

12. Saga orchestrates workflow
    Updates user status to 'verified'
    Sends confirmation email

13. Controller formats response
    Returns 200 OK with success message

14. Response sent to client
    { success: true, message: "Email verified successfully" }
```

---

## Event-Driven Architecture

### Event Publishing

The User Service publishes events when significant state changes occur. These events enable other services to react without tight coupling.

**Published Events:**

- `UserRegisteredEvent`: New user created
- `UserEmailVerifiedEvent`: Email verification completed
- `UserPhoneVerifiedEvent`: Phone verification completed
- `UserStatusChangedEvent`: Account status changed
- `UserRoleChangedEvent`: User role changed
- `UserAccountSuspendedEvent`: Account suspended
- `UserAccountDeletedEvent`: Account deleted
- `UserPasswordChangedEvent`: Password changed
- `UserSecurityBreachReportedEvent`: Security breach reported

### Event Consumption

The User Service consumes events from other services:

- `ComplianceCheckCompletedEvent`: Updates user compliance status
- `PaymentMethodVerifiedEvent`: Enables financial operations
- `AddressVerifiedEvent`: Updates address verification status

### Saga Orchestration

Sagas coordinate workflows that span multiple services. The User Service implements sagas for:

- **User Registration**: Sends welcome email, publishes notifications
- **Email Verification**: Updates status, sends confirmation
- **Password Reset**: Invalidates sessions, sends confirmation
- **Account Suspension**: Notifies user, revokes sessions
- **Account Deletion**: Archives data, notifies services

Each saga implements the saga pattern with automatic compensation on failure.

---

## Testing Strategy

### Test Organization

Tests are organized by layer with specific focus:

**Domain Tests** (`src/domain/__tests__/`):
- Pure business logic validation
- No external dependencies
- Edge case coverage
- Invariant testing

**Application Tests** (`src/application/use-cases/__tests__/`):
- Use case orchestration
- Saga compensation logic
- Event publishing
- Error handling

**Infrastructure Tests** (`src/infrastructure/__tests__/`):
- Repository operations
- Database interactions
- Service integrations
- Adapter functionality

**API Tests** (`src/api/__tests__/`):
- Controller behavior
- Route registration
- Request/response handling
- Error responses

### Coverage Targets

The User Service maintains comprehensive test coverage:

- **Domain Layer**: 95%+ coverage
- **Application Layer**: 90%+ coverage
- **Infrastructure Layer**: 85%+ coverage
- **API Layer**: 80%+ coverage

### Test Execution

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- src/domain/entities/user.entity.test.ts

# Run tests in watch mode
npm run test:watch
```

---

## Security Architecture

### Authentication

The User Service manages user credentials and authentication:

- JWT tokens with 24-hour expiration
- Refresh token rotation
- Secure password hashing with bcrypt
- Rate limiting on authentication endpoints

### Authorization

Role-based access control (RBAC) with granular permissions:

- Role assignment during registration
- Permission checking before sensitive operations
- Resource ownership validation
- Audit logging of access

### Data Protection

- Encryption at rest for sensitive data
- Encryption in transit (HTTPS)
- PII data masking in logs
- GDPR compliance for data retention

### Input Validation

- Email format validation
- Phone number format validation
- Password strength requirements
- SQL injection prevention

---

## Deployment Architecture

### Service Dependencies

The User Service depends on:

- **PostgreSQL**: User data persistence
- **Redis**: Caching and session management
- **Kafka**: Event publishing and consumption
- **SMTP Server**: Email delivery

### Environment Configuration

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/maysar

# Cache
REDIS_URL=redis://localhost:6379

# Message Broker
KAFKA_BROKERS=localhost:9092

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Server
PORT=3001
NODE_ENV=production
```

### Deployment Options

**Docker Deployment:**
```bash
docker build -t user-service:latest .
docker run -p 3001:3001 --env-file .env user-service:latest
```

**Kubernetes Deployment:**
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

---

## Monitoring and Observability

### Health Checks

The service provides health check endpoints:

- `GET /health`: Overall system health
- `GET /health/live`: Liveness probe
- `GET /health/ready`: Readiness probe

### Logging

Structured JSON logging with correlation IDs:

```json
{
  "timestamp": "2024-01-06T10:30:00Z",
  "level": "info",
  "service": "user-service",
  "correlationId": "req-123",
  "message": "User created successfully",
  "userId": "user-123",
  "duration": "45ms"
}
```

### Metrics

- User creation rate
- Authentication success rate
- Email verification rate
- API response times
- Database query performance
- Event publishing latency

---

## Performance Considerations

### Caching Strategy

Frequently accessed user data is cached in Redis:

- User profiles (1-hour TTL)
- User permissions (30-minute TTL)
- Email verification tokens (15-minute TTL)

Cache invalidation occurs when user data changes.

### Database Optimization

- Indexed queries on email and phone number
- Pagination for search results
- Connection pooling for performance
- Query optimization for common operations

### Event Processing

- Asynchronous event publishing
- Batch event processing
- Dead letter queues for failed events
- Event replay capability

---

## Conclusion

The User Service architecture balances multiple concerns:

- **Business Logic Protection**: Domain layer isolation ensures business rules remain independent of infrastructure
- **Scalability**: Event-driven communication enables loose coupling and independent scaling
- **Testability**: Layered architecture enables comprehensive testing at each level
- **Maintainability**: Clear separation of concerns makes the codebase easy to understand and modify
- **Reliability**: Saga orchestration with compensation ensures reliable multi-service workflows

This architecture enables the User Service to serve as a reliable, scalable foundation for user management across the Maysar platform.
