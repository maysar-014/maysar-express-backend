# Maysar API Gateway Documentation

## Overview

The Maysar API Gateway serves as the central entry point for the Maysar e-commerce platform, providing a unified interface for all client applications to interact with the distributed microservices architecture. It handles authentication, authorization, routing, load balancing, and monitoring to ensure a seamless and secure user experience.

## Architecture

### Core Components

1. **API Gateway Application** (`api-gateway/src/app.ts`)
   - Main Express.js application server
   - Central orchestrator for all gateway functionality
   - Health check and monitoring endpoints
   - Graceful shutdown handling

2. **Service Discovery** (`api-gateway/src/services/service-discovery.service.ts`)
   - Dynamic registration and discovery of microservices
   - Health monitoring and status tracking
   - Service metadata management

3. **Load Balancer** (`api-gateway/src/services/load-balancer.service.ts`)
   - Distributes traffic across multiple service instances
   - Supports round-robin and weighted algorithms
   - Health check integration for failover

4. **Circuit Breaker** (`api-gateway/src/services/circuit-breaker.service.ts`)
   - Fault tolerance and resilience pattern
   - Automatic recovery from service failures
   - Configurable thresholds and timeouts

5. **Routing Service** (`api-gateway/src/services/routing.service.ts`)
   - Dynamic route management and request forwarding
   - Path-based routing with service mapping
   - Integration with load balancing

6. **Monitoring Service** (`api-gateway/src/services/monitoring.service.ts`)
   - Request/response metrics collection
   - Performance monitoring and alerting
   - Health status tracking

7. **Auth Delegation Service** (`api-gateway/src/services/auth-delegation.service.ts`)
   - Delegates authentication validation to Auth Service
   - Implements request/response caching
   - Includes circuit breaker pattern for resilience
   - Provides health check and monitoring capabilities

## Middleware Stack

### Authentication Middleware
- **Location**: `api-gateway/src/middleware/authentication.middleware.ts`
- **Purpose**: JWT-based authentication and user context extraction
- **Features**:
  - Token validation and verification
  - User context population in requests
  - Integration with auth service
  - Automatic token refresh handling
  - **NEW**: Auth delegation for centralized authentication

### Authorization Middleware
- **Location**: `api-gateway/src/middleware/authorization.middleware.ts`
- **Purpose**: Role-based access control (RBAC) and permission checking
- **Supported Roles**:
  - `admin` - Full system access
  - `user` - Customer access
  - `seller` - Seller functionality
  - `courier` - Delivery management
  - `enabler` - Platform management
  - `supplier` - Supply chain access
- **Features**:
  - Role-based permission checking
  - Self-access control for personal resources
  - Admin bypass for all operations

### Auth Delegation Middleware
- **Location**: `api-gateway/src/middleware/auth-delegation.middleware.ts`
- **Purpose**: Delegates authentication to Auth Service for centralized validation
- **Features**:
  - Multiple token sources (headers, cookies, query params)
  - Request/response caching for performance
  - Fallback mechanisms for service unavailability
  - Circuit breaker integration
  - **NEW**: Google OAuth 2.0 support

### Security Middleware
- **Location**: `api-gateway/src/middleware/security.middleware.ts`
- **Purpose**: Input validation and security protection
- **Features**:
  - Request sanitization and validation
  - Security headers management
  - Rate limiting integration
  - Protection against common attacks

### Request/Response Middleware
- **Request Logger**: Correlation ID tracking and request logging
- **Response Transformer**: Standardized response formatting
- **Compression**: Gzip compression for response optimization
- **Timeout**: Request timeout handling
- **Error Handler**: Centralized error handling and response formatting

## Configuration

### Environment Variables
```bash
# Gateway Configuration
GATEWAY_PORT=3000
GATEWAY_ENV=production
GATEWAY_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=1000

# Security
JWT_SECRET=your-jwt-secret-key
CORS_ORIGIN=https://your-frontend-domain.com

# Service Discovery
SERVICE_DISCOVERY_URL=http://service-discovery:8080

# Auth Service Integration
AUTH_SERVICE_URL=http://auth-service:3001
AUTH_SERVICE_TIMEOUT=5000
AUTH_SERVICE_RETRY_ATTEMPTS=3
AUTH_SERVICE_RETRY_DELAY=1000

# Google OAuth (NEW)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback
GOOGLE_SCOPES=https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile
```

### Configuration Structure
```typescript
// api-gateway/src/config/index.ts
export const gatewayConfig = {
  port: process.env.GATEWAY_PORT || 3000,
  environment: process.env.GATEWAY_ENV || 'development',
  timeout: parseInt(process.env.GATEWAY_TIMEOUT || '30000'),
  rateLimiting: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'default-secret',
    corsOrigin: process.env.CORS_ORIGIN || '*',
  },
  authDelegation: {
    serviceUrl: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
    timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT || '5000'),
    retryAttempts: parseInt(process.env.AUTH_SERVICE_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.AUTH_SERVICE_RETRY_DELAY || '1000'),
  },
};
```

## API Endpoints

### Gateway Management Endpoints

#### Health Check
```
GET /health
```
Returns the health status of the gateway and all registered services.

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "services": {
    "catalog-service": "healthy",
    "order-service": "healthy",
    "payment-service": "unhealthy"
  }
}
```

#### Service Discovery
```
GET /services
```
Returns information about all registered services and their status.

**Response**:
```json
{
  "services": [
    {
      "name": "catalog-service",
      "url": "http://catalog-service:3001",
      "status": "healthy",
      "instances": 3
    }
  ],
  "status": {
    "total": 5,
    "healthy": 4,
    "unhealthy": 1
  }
}
```

#### Metrics
```
GET /metrics
```
Returns performance metrics and monitoring data.

**Response**:
```json
{
  "requests": {
    "total": 15000,
    "successful": 14850,
    "failed": 150,
    "rate": 25.5
  },
  "responseTime": {
    "avg": 150,
    "p95": 500,
    "p99": 1000
  },
  "services": {
    "catalog-service": {
      "requests": 5000,
      "avgResponseTime": 120,
      "errorRate": 0.5
    }
  }
}
```

### Authentication & Authorization Endpoints

#### Auth Delegation
```
POST /auth/delegate
```
Delegates authentication validation to Auth Service.

**Request**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "required": true,
  "scopes": ["read:profile", "write:profile"]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "user": {
      "userId": "user-123",
      "email": "user@example.com",
      "role": "seller"
    }
  }
}
```

#### Google OAuth Integration (NEW)
```
GET /auth/google
```
Initiates Google OAuth 2.0 authentication flow.

**Response**:
```json
{
  "success": true,
  "data": {
    "authUrl": "https://accounts.google.com/o/oauth2/auth?...",
    "message": "Redirect user to this URL to authenticate with Google"
  }
}
```

```
GET /auth/google/callback?code=auth_code
```
Handles Google OAuth callback and returns user token.

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@gmail.com",
      "name": "John Doe",
      "role": "user",
      "avatar": "https://lh3.googleusercontent.com/...",
      "emailVerified": true
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "message": "Google authentication successful"
  }
}
```

```
POST /auth/google/link
```
Links Google account to existing user account.

**Request**:
```json
{
  "code": "auth_code"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Google account linked successfully"
  }
}
```

### Microservice Routing

The gateway automatically routes requests to appropriate microservices based on path patterns:

```
/catalog/* → Catalog Service
/orders/* → Order Service
/payments/* → Payment Service
/users/* → User Service
/auth/* → Auth Service
```

## Authentication & Authorization

### JWT Token Structure
```json
{
  "userId": "user-123",
  "role": "seller",
  "permissions": ["read:products", "write:products"],
  "iat": 1642234567,
  "exp": 1642320967
}
```

### Authorization Examples

#### Require Admin Access
```typescript
import { requireAdmin } from './middleware/authorization.middleware';

app.post('/admin/users', requireAdmin, (req, res) => {
  // Only admin users can access this endpoint
});
```

#### Require Specific Role
```typescript
import { requireSeller } from './middleware/authorization.middleware';

app.post('/seller/products', requireSeller, (req, res) => {
  // Only seller users can access this endpoint
});
```

#### Self-Access Control
```typescript
import { allowSelfOrAdmin } from './middleware/authorization.middleware';

app.get('/users/:userId/profile', allowSelfOrAdmin, (req, res) => {
  // User can access their own profile or admin can access any profile
});
```

#### Auth Delegation Examples (NEW)
```typescript
import { authenticate, requireScopes, publicOrAuth } from './middleware/auth-delegation.middleware';

// Basic authentication delegation
app.use(authenticate);

// Optional authentication
app.use(publicOrAuth);

// Authentication with specific scopes
app.use(requireScopes(['admin', 'user']));

// Google OAuth integration
app.get('/auth/google', initiateGoogleAuth);
app.get('/auth/google/callback', handleGoogleCallback);
```

## Load Balancing

### Algorithms

1. **Round Robin**: Distributes requests evenly across instances
2. **Weighted Round Robin**: Distributes based on instance weights
3. **Random**: Randomly selects instances

### Configuration
```typescript
const loadBalancer = new LoadBalancerService({
  algorithm: 'round-robin',
  healthCheckInterval: 30000,
  timeout: 5000
});
```

## Circuit Breaker

### States
1. **Closed**: Normal operation, requests pass through
2. **Open**: Service is failing, requests are rejected
3. **Half-Open**: Testing if service has recovered

### Configuration
```typescript
const circuitBreaker = new CircuitBreakerService({
  failureThreshold: 5,
  recoveryTimeout: 60000,
  timeout: 10000
});
```

## Monitoring & Observability

### Metrics Collected
- Request count and rate
- Response time percentiles (P50, P95, P99)
- Error rates by service
- Service health status
- Circuit breaker state
- **NEW**: Auth delegation performance metrics
- **NEW**: Google OAuth success/failure rates

### Health Checks
- Service availability
- Response time thresholds
- Error rate monitoring
- Resource utilization
- **NEW**: Auth Service connectivity
- **NEW**: Google OAuth provider status

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "Insufficient permissions",
    "details": {
      "requiredRoles": ["admin"],
      "userRole": "user"
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "requestId": "req-123456789"
}
```

### Error Types
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `VALIDATION_ERROR`: Request validation failed
- `SERVICE_UNAVAILABLE`: Target service is unavailable
- `TIMEOUT_ERROR`: Request timeout
- **NEW**: `GOOGLE_OAUTH_ERROR`: Google OAuth authentication failed
- **NEW**: `AUTH_DELEGATION_ERROR`: Auth Service delegation failed

## Deployment

### Docker Configuration
```dockerfile
# api-gateway/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'
services:
  api-gateway:
    build: ./api-gateway
    ports:
      - "3000:3000"
    environment:
      - GATEWAY_PORT=3000
      - JWT_SECRET=${JWT_SECRET}
      - AUTH_SERVICE_URL=http://auth-service:3001
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
    depends_on:
      - auth-service
      - catalog-service
      - order-service
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: maysar/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: GATEWAY_PORT
          value: "3000"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: maysar-secrets
              key: jwt-secret
        - name: AUTH_SERVICE_URL
          value: "http://auth-service:3001"
        - name: GOOGLE_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: google-oauth-secrets
              key: client-id
        - name: GOOGLE_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: google-oauth-secrets
              key: client-secret
```

## Security Considerations

### Security Headers
- Content Security Policy (CSP)
- X-Frame-Options
- X-Content-Type-Options
- Strict-Transport-Security (HSTS)

### Rate Limiting
- Per-user request limits
- IP-based throttling
- Burst protection
- Configurable limits per endpoint

### Input Validation
- Request body validation
- Query parameter sanitization
- Path parameter validation
- SQL injection protection

### Google OAuth Security (NEW)
- CSRF protection with state parameter
- HTTPS enforcement for OAuth flows
- Proper scope validation
- Token expiration handling
- Secure redirect URI validation

## Performance Optimization

### Caching
- Response caching for static content
- Service discovery cache
- Authentication token cache
- **NEW**: Auth delegation response caching
- **NEW**: Google OAuth user profile caching

### Compression
- Gzip compression for responses
- Configurable compression levels
- Content-type specific compression

### Connection Pooling
- HTTP connection reuse
- Database connection pooling
- Service-to-service connection optimization

### Auth Delegation Optimization (NEW)
- Request/response caching for auth validation
- Circuit breaker for Auth Service resilience
- Connection pooling for auth service communication
- Token validation caching

## Troubleshooting

### Common Issues

1. **Service Discovery Failures**
   - Check service registration
   - Verify health check endpoints
   - Review network connectivity

2. **Authentication Failures**
   - Verify JWT token format
   - Check token expiration
   - Validate JWT secret configuration

3. **Load Balancer Issues**
   - Review instance health status
   - Check load balancing algorithm
   - Verify service registration

4. **Circuit Breaker Trips**
   - Monitor service health
   - Adjust failure thresholds
   - Check timeout configurations

5. **Auth Delegation Issues (NEW)**
   - Verify Auth Service connectivity
   - Check auth delegation configuration
   - Review circuit breaker status
   - Monitor auth service health

6. **Google OAuth Issues (NEW)**
   - Verify Google Cloud Console configuration
   - Check redirect URI matching
   - Validate OAuth credentials
   - Review scope permissions

### Logging
```typescript
// Enable debug logging
process.env.DEBUG = 'api-gateway:*';

// Log format
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "Request processed",
  "requestId": "req-123456789",
  "method": "GET",
  "path": "/catalog/products",
  "responseTime": 150,
  "statusCode": 200,
  "authDelegation": {
    "service": "auth-service",
    "responseTime": 50,
    "cached": false
  }
}
```

## Development

### Local Development
```bash
# Install dependencies
cd api-gateway
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Testing
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Code coverage
npm run test:coverage
```

### Code Style
```bash
# Linting
npm run lint

# Type checking
npm run typecheck

# Formatting
npm run format
```

### Testing Auth Delegation (NEW)
```bash
# Test auth delegation functionality
npm run test:auth-delegation

# Test Google OAuth integration
npm run test:google-oauth

# Test auth service communication
npm run test:auth-service
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the coding standards
4. Write tests for new functionality
5. Submit a pull request

### Auth Delegation Guidelines (NEW)
- Always use auth delegation for authentication validation
- Implement proper error handling for auth service failures
- Use caching for performance optimization
- Follow security best practices for OAuth integration

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the troubleshooting section above
- **NEW**: Review Google OAuth integration guide for OAuth-specific issues

## Recent Enhancements

### Auth Delegation System
- **Centralized Authentication**: All authentication validation delegated to Auth Service
- **Performance Optimization**: Request/response caching for auth validation
- **Resilience**: Circuit breaker pattern for auth service failures
- **Monitoring**: Comprehensive metrics and health checks

### Google OAuth 2.0 Integration
- **Social Login**: Complete Google OAuth 2.0 implementation
- **User Management**: Automatic user creation and profile linking
- **Security**: CSRF protection and secure token handling
- **Flexibility**: Support for account linking and unlinking

### Enhanced Security
- **Multi-layer Protection**: Authentication, authorization, and input validation
- **OAuth Security**: Proper scope validation and redirect URI protection
- **Token Management**: Secure JWT handling and expiration management
- **Rate Limiting**: Configurable limits for different endpoint types
