# User Service Inter-Service Contract

## Overview

This document defines the communication protocols and data ownership boundaries for the User Service in the Maysar microservices architecture.

## Service Boundaries

### User Service Responsibilities
- **Data Ownership**: Complete user profile data, addresses, preferences, verification status
- **Business Logic**: User registration, profile management, verification workflows
- **API Endpoints**: RESTful API for user operations
- **Data Consistency**: Ensures user data integrity across the platform

### Auth Service Responsibilities (Separate)
- **Authentication Logic**: Login, logout, password validation
- **Session Management**: JWT tokens, session handling
- **Security Policies**: Authentication rules, rate limiting
- **User State Queries**: Calls User Service for user data during auth

## Communication Protocols

### HTTP/REST API
All inter-service communication uses RESTful HTTP APIs with JSON payloads.

#### Authentication
Services authenticate using JWT tokens issued by Auth Service:
```
Authorization: Bearer <service-jwt-token>
```

#### Base URLs
- **User Service**: `http://user-service:3001/api/v1`
- **Auth Service**: `http://auth-service:3002/api/v1`

### Request/Response Format
All APIs follow consistent patterns:

#### Success Response
```json
{
  "data": { ... },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2024-01-14T12:00:00Z"
  }
}
```

#### Error Response
```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with ID xxx not found",
    "details": { ... }
  },
  "meta": {
    "requestId": "uuid",
    "timestamp": "2024-01-14T12:00:00Z"
  }
}
```

## Data Ownership Boundaries

### User Service Owns
- User profile information (names, avatar, DOB)
- Contact information (email, phone)
- Addresses (shipping, billing)
- Preferences (language, timezone, notifications)
- Verification status and timestamps
- Account metadata and attributes

### Auth Service Owns
- Password hashes and validation
- Session tokens and refresh tokens
- Login attempt tracking
- Security audit logs
- Authentication policies

### Shared/Referenced Data
- User ID (UUID) - primary key across services
- User role and status enums
- Basic user info for auth flows

## Service Dependencies

### User Service Dependencies
```
User Service
├── Database (PostgreSQL) - Direct access
├── Cache (Redis) - Optional caching
├── Message Broker (Kafka) - Event publishing
└── Email Service - Verification emails
```

### Auth Service Dependencies
```
Auth Service
├── User Service - User data queries
├── Session Store (Redis) - Session management
├── Token Blacklist (Redis) - Invalidated tokens
└── Audit Logger - Security events
```

## API Contracts

### User Service Endpoints (Consumed by Auth Service)

#### Get User by Email (for login)
```http
GET /users/search?email={email}&limit=1
Authorization: Bearer <service-token>
```

**Response:**
```json
{
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "passwordHash": "hashed_password",
        "status": "active",
        "isEmailVerified": true,
        "role": "buyer"
      }
    ],
    "total": 1
  }
}
```

#### Get User by ID (for profile access)
```http
GET /users/{userId}
Authorization: Bearer <service-token>
```

#### Update User Status (account locking/unlocking)
```http
PATCH /users/{userId}/status
Authorization: Bearer <service-token>
Content-Type: application/json

{
  "status": "locked",
  "reason": "Too many failed login attempts"
}
```

#### Record Login Activity
```http
POST /users/{userId}/login-activity
Authorization: Bearer <service-token>
Content-Type: application/json

{
  "successful": true,
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### Auth Service Endpoints (Consumed by User Service)

#### Validate Service Token
```http
POST /auth/validate-service-token
Content-Type: application/json

{
  "token": "<service-jwt-token>",
  "service": "user-service"
}
```

## Event Streaming

### User Service Publishes Events
```javascript
// User registered
{
  "event": "user.registered",
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "buyer",
    "timestamp": "2024-01-14T12:00:00Z"
  }
}

// User profile updated
{
  "event": "user.profile.updated",
  "data": {
    "userId": "uuid",
    "changes": ["firstName", "lastName"],
    "timestamp": "2024-01-14T12:00:00Z"
  }
}

// User verified
{
  "event": "user.verified",
  "data": {
    "userId": "uuid",
    "verificationType": "email",
    "timestamp": "2024-01-14T12:00:00Z"
  }
}
```

### Auth Service Publishes Events
```javascript
// User authenticated
{
  "event": "auth.login.successful",
  "data": {
    "userId": "uuid",
    "ipAddress": "192.168.1.1",
    "timestamp": "2024-01-14T12:00:00Z"
  }
}

// User account locked
{
  "event": "auth.account.locked",
  "data": {
    "userId": "uuid",
    "reason": "failed_attempts",
    "timestamp": "2024-01-14T12:00:00Z"
  }
}
```

## Circuit Breaker Patterns

### User Service → Auth Service Calls
- **Timeout**: 5 seconds
- **Retry**: 3 attempts with exponential backoff
- **Fallback**: Cached user data or degraded functionality
- **Circuit Breaker**: Open after 5 consecutive failures

### Auth Service → User Service Calls
- **Timeout**: 3 seconds
- **Retry**: 2 attempts
- **Fallback**: Allow login with cached/stale user data
- **Circuit Breaker**: Open after 3 consecutive failures

## Data Synchronization

### Event-Driven Updates
1. User Service publishes user change events
2. Auth Service subscribes and updates cached data
3. Cache invalidation on critical updates (password, status)

### Cache Strategy
- **TTL**: 15 minutes for user profile data
- **Invalidation**: Immediate on status/security changes
- **Fallback**: Allow auth with slightly stale data

## Error Handling

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (duplicate email, etc.)
- `429`: Too Many Requests
- `500`: Internal Server Error

### Error Response Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "constraint": "email_format"
    }
  },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-01-14T12:00:00Z",
    "service": "user-service",
    "version": "1.0.0"
  }
}
```

## Monitoring & Observability

### Metrics to Track
- Request/response times
- Error rates by endpoint
- Circuit breaker status
- Cache hit/miss ratios
- Event publishing success rates

### Logging
- Structured logging with correlation IDs
- Security events logged separately
- Performance metrics tracked

## Versioning Strategy

### API Versioning
- URL-based versioning: `/api/v1/users`
- Backward compatibility maintained
- Breaking changes require new version

### Schema Evolution
- Additive changes allowed
- Breaking changes require migration plan
- Event schema versioning

## Testing Strategy

### Contract Tests
- Consumer-driven contract tests
- Pact.io for API contract verification
- Event schema validation

### Integration Tests
- Service-to-service communication tests
- Circuit breaker behavior tests
- Fallback scenario tests

## Deployment Considerations

### Health Checks
- Database connectivity
- Cache availability
- Message broker connection
- External service dependencies

### Rollback Strategy
- Blue-green deployment
- Feature flags for gradual rollout
- Database migration rollback scripts

## Security Considerations

### Service Authentication
- Mutual TLS between services
- JWT tokens with short expiration
- Service-specific credentials

### Data Protection
- Encrypted data at rest
- Secure communication (HTTPS/TLS)
- Audit logging for sensitive operations

### Rate Limiting
- Per-service rate limits
- Burst handling
- Graduated backoff

---

## Contact Information

**Service Owner**: User Service Team  
**Technical Lead**: [Name]  
**Email**: user-service@maysar.com  
**Slack**: #user-service-dev

**Auth Service Owner**: Auth Service Team  
**Technical Lead**: [Name]  
**Email**: auth-service@maysar.com  
**Slack**: #auth-service-dev
