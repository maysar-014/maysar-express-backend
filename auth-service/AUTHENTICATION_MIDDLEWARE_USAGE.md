# Authentication Middleware Usage Guide

This guide demonstrates how to use the authentication middleware in your Express applications.

## Table of Contents

- [Basic JWT Authentication](#basic-jwt-authentication)
- [Optional Authentication](#optional-authentication)
- [API Key Authentication](#api-key-authentication)
- [Service Authentication](#service-authentication)
- [Combined Authentication](#combined-authentication)
- [Factory Methods](#factory-methods)
- [Configuration Options](#configuration-options)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Basic JWT Authentication

### Using the Middleware Class

```typescript
import { AuthenticationMiddleware } from './api/middleware/authentication.middleware';
import express from 'express';

const app = express();
const authMiddleware = new AuthenticationMiddleware();

// Apply authentication to specific routes
app.get('/protected', authMiddleware.authenticate(), (req, res) => {
  // req.user is now available with user information
  res.json({
    message: 'Protected route accessed',
    user: req.user
  });
});

// Apply authentication to entire router
const protectedRouter = express.Router();
protectedRouter.use(authMiddleware.authenticate());

protectedRouter.get('/profile', (req, res) => {
  res.json({
    user: req.user,
    profile: { /* user profile data */ }
  });
});

app.use('/api', protectedRouter);
```

### Using the Factory Method

```typescript
import { AuthenticationMiddlewareFactory } from './api/middleware/authentication.middleware';

const app = express();

// Create JWT authentication middleware using factory
const jwtAuth = AuthenticationMiddlewareFactory.createJWTAuth();

app.get('/protected', jwtAuth, (req, res) => {
  res.json({
    message: 'Protected route accessed',
    user: req.user
  });
});
```

## Optional Authentication

Use optional authentication when you want to authenticate users if they provide credentials, but still allow access to unauthenticated users.

```typescript
import { AuthenticationMiddleware } from './api/middleware/authentication.middleware';

const app = express();
const authMiddleware = new AuthenticationMiddleware();

app.get('/public-with-optional-auth', authMiddleware.optionalAuthenticate(), (req, res) => {
  if (req.user) {
    // User is authenticated
    res.json({
      message: 'Authenticated access',
      user: req.user
    });
  } else {
    // User is not authenticated
    res.json({
      message: 'Public access',
      user: null
    });
  }
});
```

## API Key Authentication

Use API key authentication for service-to-service communication or when you need to authenticate applications rather than users.

```typescript
import { AuthenticationMiddleware } from './api/middleware/authentication.middleware';

const app = express();
const authMiddleware = new AuthenticationMiddleware();

// Apply API key authentication to specific routes
app.get('/api/data', authMiddleware.authenticateApiKey(), (req, res) => {
  // req.service is now available with service information
  res.json({
    message: 'Service authenticated access',
    service: req.service
  });
});

// Apply to entire router for service endpoints
const serviceRouter = express.Router();
serviceRouter.use(authMiddleware.authenticateApiKey());

serviceRouter.get('/metrics', (req, res) => {
  res.json({
    service: req.service,
    metrics: { /* service metrics */ }
  });
});

app.use('/service', serviceRouter);
```

## Service Authentication

Use service authentication for internal services with predefined service keys.

```typescript
import { AuthenticationMiddleware } from './api/middleware/authentication.middleware';

const app = express();

// Configure with allowed service keys
const authMiddleware = new AuthenticationMiddleware({
  allowedServiceKeys: ['service-a-key', 'service-b-key', 'service-c-key']
});

app.get('/internal', authMiddleware.authenticateService(), (req, res) => {
  res.json({
    message: 'Internal service access granted',
    service: req.service
  });
});
```

## Combined Authentication

Use combined authentication when you want to support both JWT tokens and API keys, with JWT taking precedence.

```typescript
import { AuthenticationMiddleware } from './api/middleware/authentication.middleware';

const app = express();
const authMiddleware = new AuthenticationMiddleware();

app.get('/flexible-auth', authMiddleware.authenticateCombined(), (req, res) => {
  if (req.authType === 'jwt') {
    res.json({
      message: 'Authenticated with JWT token',
      user: req.user,
      authType: req.authType
    });
  } else if (req.authType === 'api-key') {
    res.json({
      message: 'Authenticated with API key',
      service: req.service,
      authType: req.authType
    });
  }
});
```

## Factory Methods

The `AuthenticationMiddlewareFactory` provides convenient methods for creating middleware instances.

```typescript
import { AuthenticationMiddlewareFactory } from './api/middleware/authentication.middleware';

const app = express();

// Create different types of authentication middleware
const jwtAuth = AuthenticationMiddlewareFactory.createJWTAuth();
const optionalAuth = AuthenticationMiddlewareFactory.createOptionalAuth();
const apiKeyAuth = AuthenticationMiddlewareFactory.createApiKeyAuth();
const serviceAuth = AuthenticationMiddlewareFactory.createServiceAuth();
const combinedAuth = AuthenticationMiddlewareFactory.createCombinedAuth();

// Use them in your routes
app.get('/jwt-protected', jwtAuth, (req, res) => {
  res.json({ user: req.user });
});

app.get('/optional', optionalAuth, (req, res) => {
  res.json({ user: req.user || 'anonymous' });
});

app.get('/service-only', apiKeyAuth, (req, res) => {
  res.json({ service: req.service });
});

app.get('/internal-only', serviceAuth, (req, res) => {
  res.json({ service: req.service });
});

app.get('/flexible', combinedAuth, (req, res) => {
  res.json({ authType: req.authType, user: req.user, service: req.service });
});
```

## Configuration Options

The `AuthenticationMiddleware` accepts a configuration object with the following options:

```typescript
interface AuthMiddlewareConfig {
  // Enable token blacklisting check
  enableTokenBlacklisting?: boolean;
  
  // Allowed service keys for service authentication
  allowedServiceKeys?: string[];
  
  // Custom logger instance
  logger?: any;
  
  // Request timeout in milliseconds
  timeout?: number;
  
  // Retry configuration
  retryAttempts?: number;
  retryDelay?: number;
  
  // Circuit breaker configuration
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
}
```

### Example Configuration

```typescript
import { AuthenticationMiddleware } from './api/middleware/authentication.middleware';

const authMiddleware = new AuthenticationMiddleware({
  enableTokenBlacklisting: true,
  allowedServiceKeys: ['service-a', 'service-b'],
  timeout: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000
});
```

## Error Handling

The middleware returns standardized error responses for authentication failures:

### JWT Authentication Errors

```json
// Missing token
{
  "success": false,
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Authentication token required"
  }
}

// Invalid token
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token is invalid"
  }
}

// Blacklisted token
{
  "success": false,
  "error": {
    "code": "TOKEN_BLACKLISTED",
    "message": "Token has been revoked"
  }
}
```

### API Key Authentication Errors

```json
// Missing API key
{
  "success": false,
  "error": {
    "code": "MISSING_API_KEY",
    "message": "API key required for service authentication"
  }
}

// Invalid API key
{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API key is invalid"
  }
}
```

### Service Authentication Errors

```json
// Missing service key
{
  "success": false,
  "error": {
    "code": "MISSING_SERVICE_KEY",
    "message": "Service key required"
  }
}

// Invalid service key
{
  "success": false,
  "error": {
    "code": "INVALID_SERVICE_KEY",
    "message": "Invalid service key"
  }
}
```

## Examples

### Complete Express Application Example

```typescript
import express from 'express';
import { AuthenticationMiddleware, AuthenticationMiddlewareFactory } from './api/middleware/authentication.middleware';

const app = express();

// Create middleware instances
const authMiddleware = new AuthenticationMiddleware({
  enableTokenBlacklisting: true,
  allowedServiceKeys: ['internal-service-key']
});

const jwtAuth = AuthenticationMiddlewareFactory.createJWTAuth();
const optionalAuth = AuthenticationMiddlewareFactory.createOptionalAuth();
const apiKeyAuth = AuthenticationMiddlewareFactory.createApiKeyAuth();
const serviceAuth = AuthenticationMiddlewareFactory.createServiceAuth();

// Public routes (no authentication required)
app.get('/public', (req, res) => {
  res.json({ message: 'Public access' });
});

// Optional authentication
app.get('/profile', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({
      message: 'Authenticated user profile',
      user: req.user
    });
  } else {
    res.json({
      message: 'Public profile view',
      user: null
    });
  }
});

// JWT authentication required
app.get('/protected', jwtAuth, (req, res) => {
  res.json({
    message: 'Protected resource',
    user: req.user
  });
});

// API key authentication required
app.get('/api/data', apiKeyAuth, (req, res) => {
  res.json({
    message: 'Service data',
    service: req.service
  });
});

// Service authentication required
app.get('/internal', serviceAuth, (req, res) => {
  res.json({
    message: 'Internal service access',
    service: req.service
  });
});

// Combined authentication
app.get('/flexible', authMiddleware.authenticateCombined(), (req, res) => {
  res.json({
    message: 'Flexible authentication',
    authType: req.authType,
    user: req.user,
    service: req.service
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Authentication error:', error);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred'
    }
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Testing with Supertest

```typescript
import request from 'supertest';
import app from './app';

describe('Authentication Middleware', () => {
  describe('JWT Authentication', () => {
    it('should authenticate valid JWT token', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer valid-jwt-token')
        .expect(200);

      expect(response.body.user).toBeDefined();
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });
  });

  describe('API Key Authentication', () => {
    it('should authenticate valid API key', async () => {
      const response = await request(app)
        .get('/api/data')
        .set('X-Service-Key', 'valid-api-key')
        .expect(200);

      expect(response.body.service).toBeDefined();
    });

    it('should reject invalid API key', async () => {
      const response = await request(app)
        .get('/api/data')
        .set('X-Service-Key', 'invalid-api-key')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_API_KEY');
    });
  });
});
```

## Best Practices

1. **Use appropriate authentication method for each use case**:
   - JWT for user authentication
   - API keys for service-to-service communication
   - Service keys for internal services

2. **Implement proper error handling**:
   - Always handle authentication errors gracefully
   - Return appropriate HTTP status codes (401 for authentication failures)

3. **Secure your middleware configuration**:
   - Store service keys securely (environment variables, secrets management)
   - Use HTTPS in production

4. **Monitor authentication failures**:
   - Log authentication attempts for security monitoring
   - Implement rate limiting to prevent brute force attacks

5. **Use factory methods for consistency**:
   - Use `AuthenticationMiddlewareFactory` for standard configurations
   - Create custom middleware instances only when you need specific configuration

6. **Test your authentication**:
   - Write comprehensive tests for all authentication scenarios
   - Test error cases and edge cases
   - Use proper test fixtures and mocks

This middleware provides a robust, flexible, and secure authentication solution for your Express applications. Choose the appropriate authentication method based on your specific use case and security requirements.
