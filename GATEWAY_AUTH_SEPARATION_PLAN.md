# Gateway vs Auth Service Separation Plan

## Current Problem Analysis

### Overlapping Responsibilities
1. **API Gateway** has authentication middleware that validates JWT tokens
2. **Auth Service** has authentication middleware that also validates JWT tokens
3. This creates duplication and violates the separation of concerns

### Constitution Violations

#### Architecture Constitution (Auth Service)
- **Domain Purity Rule**: Auth service should contain business logic for authentication
- **Infrastructure Isolation**: Auth service should provide authentication as a service
- **DTO Firewall**: Auth service should expose authentication via clean interfaces

#### Integration Constitution (API Gateway)
- **Gateway Purpose**: Should route, load balance, and provide cross-cutting concerns
- **Service Communication**: Should call auth service for authentication validation
- **Integration Patterns**: Should use service-to-service communication

## Proposed Solution

### API Gateway Responsibilities (Integration Constitution)
- **Routing**: Route requests to appropriate microservices
- **Load Balancing**: Distribute traffic across service instances
- **Circuit Breaking**: Handle service failures gracefully
- **Rate Limiting**: Protect services from overload
- **Request/Response Transformation**: Format requests/responses
- **Service Discovery**: Find available service instances
- **Authentication Delegation**: Forward auth validation to Auth Service

### Auth Service Responsibilities (Architecture Constitution)
- **Authentication Business Logic**: JWT validation, token management
- **User Management**: User registration, profile management
- **Session Management**: Session creation, validation, revocation
- **Social Auth Integration**: OAuth, SSO providers
- **Security Policies**: Password policies, MFA, brute force protection
- **Audit Logging**: Authentication events and security logs

## Implementation Plan

### Phase 1: Remove Gateway Authentication Logic
1. Remove JWT validation from gateway middleware
2. Replace with auth service client calls
3. Update gateway to delegate authentication

### Phase 2: Enhance Auth Service
1. Ensure auth service follows Clean Architecture
2. Implement proper domain, application, infrastructure layers
3. Add comprehensive social auth support
4. Enhance security features

### Phase 3: Update Integration Patterns
1. Update gateway to use auth service for validation
2. Implement proper error handling for auth service failures
3. Add caching for auth validation responses
4. Update monitoring and observability

## File Structure Changes

### API Gateway (Integration Constitution)
```
api-gateway/
├── src/
│   ├── middleware/
│   │   ├── auth-delegation.middleware.ts  # NEW: Delegates to auth service
│   │   ├── authentication.middleware.ts   # REMOVE: Direct JWT validation
│   │   └── ...
│   ├── services/
│   │   ├── auth-service.client.ts         # NEW: Client for auth service
│   │   └── ...
│   └── ...
```

### Auth Service (Architecture Constitution)
```
auth-service/
├── src/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── user.entity.ts
│   │   │   └── session.entity.ts
│   │   ├── value-objects/
│   │   │   ├── auth-token.value-object.ts
│   │   │   └── user-credentials.value-object.ts
│   │   ├── engines/
│   │   │   ├── authentication.engine.ts
│   │   │   ├── session.engine.ts
│   │   │   └── social-auth.engine.ts
│   │   ├── policies/
│   │   │   ├── authentication.policy.ts
│   │   │   └── security.policy.ts
│   │   ├── algorithms/
│   │   │   ├── password-hashing.algorithm.ts
│   │   │   └── token-generation.algorithm.ts
│   │   └── events/
│   │       ├── user-registered.event.ts
│   │       └── authentication-failed.event.ts
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── authenticate-user.use-case.ts
│   │   │   ├── register-user.use-case.ts
│   │   │   ├── social-auth.use-case.ts
│   │   │   └── manage-session.use-case.ts
│   │   ├── sagas/
│   │   │   └── user-registration.saga.ts
│   │   ├── dto/
│   │   │   ├── auth-request.dto.ts
│   │   │   └── auth-response.dto.ts
│   │   └── mappers/
│   │       └── auth-mapper.ts
│   ├── infrastructure/
│   │   ├── repositories/
│   │   │   ├── user.repository.ts
│   │   │   └── session.repository.ts
│   │   ├── providers/
│   │   │   ├── jwt.provider.ts
│   │   │   ├── social-auth.provider.ts
│   │   │   └── email.provider.ts
│   │   ├── messaging/
│   │   │   └── auth-events.publisher.ts
│   │   └── services/
│   │       ├── auth-service.client.ts
│   │       └── security.service.ts
│   └── api/
│       ├── controllers/
│       │   ├── auth.controller.ts
│       │   ├── social-auth.controller.ts
│       │   └── session.controller.ts
│       ├── middleware/
│       │   └── auth-service.middleware.ts  # Internal auth for auth service itself
│       └── routes/
│           ├── auth.routes.ts
│           └── social-auth.routes.ts
```

## Communication Patterns

### Gateway → Auth Service
```
Gateway Request → Auth Service Validation → Gateway Response
```

### Auth Service Internal
```
HTTP Request → API Layer → Application Layer → Domain Layer → Infrastructure
```

## Security Considerations

### Gateway Security
- **Service-to-Service Auth**: Use mTLS for gateway→auth service communication
- **Token Forwarding**: Forward JWT tokens to auth service for validation
- **Caching**: Cache auth validation results with appropriate TTL
- **Fallback**: Handle auth service failures gracefully

### Auth Service Security
- **Input Validation**: Validate all authentication requests
- **Rate Limiting**: Protect against brute force attacks
- **Audit Logging**: Log all authentication attempts
- **Token Security**: Secure token generation and validation

## Benefits

### Clear Separation of Concerns
- Gateway focuses on routing and integration
- Auth service focuses on authentication business logic
- Each service follows its respective constitution

### Improved Maintainability
- Single responsibility for each service
- Easier to test and debug
- Clear boundaries for changes

### Enhanced Security
- Centralized authentication logic
- Better security controls in auth service
- Proper service-to-service authentication

### Better Scalability
- Independent scaling of gateway and auth service
- Specialized optimization for each service type
- Clear performance boundaries