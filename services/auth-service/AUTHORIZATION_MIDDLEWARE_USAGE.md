# Authorization Middleware Usage Guide

## Overview

The Authorization Middleware provides enterprise-grade role-based and attribute-based access control (RBAC/ABAC) with comprehensive security features including caching, audit logging, and risk-based authentication.

## Features

- **Role-Based Access Control (RBAC)**: Hierarchical role inheritance with fine-grained permissions
- **Attribute-Based Access Control (ABAC)**: Advanced condition-based authorization with multiple operators
- **Resource Ownership**: Automatic ownership verification for resource-based operations
- **Risk-Based Authentication**: Dynamic risk scoring with MFA requirements for high-risk access
- **Time-Based Access**: Configurable time windows for role-based access control
- **Geofencing**: IP-based location restrictions and whitelisting
- **Caching**: Permission result caching with configurable expiration
- **Audit Logging**: Comprehensive audit trail with detailed event logging
- **Emergency Access**: Special emergency role handling for critical situations

## Basic Usage

### 1. Import and Initialize

```typescript
import { 
  AuthorizationMiddleware, 
  AuthorizationMiddlewareFactory,
  DEFAULT_AUTHZ_CONFIG 
} from './src/api/middleware/authorization.middleware';

// Initialize with default configuration
const authzMiddleware = new AuthorizationMiddleware();

// Or with custom configuration
const customConfig = {
  ...DEFAULT_AUTHZ_CONFIG,
  enableRBAC: true,
  enableABAC: true,
  cacheExpirationTime: 10 * 60 * 1000, // 10 minutes
  maxFailedAttempts: 3
};

const authzMiddleware = new AuthorizationMiddleware(customConfig);
```

### 2. Role-Based Authorization

```typescript
import { Router } from 'express';
import { authorizeRoles } from './src/api/middleware/authorization.middleware';

const router = Router();

// Single role authorization
router.get('/admin', authorizeRoles('admin'), (req, res) => {
  res.json({ message: 'Admin access granted' });
});

// Multiple roles (user needs any of these roles)
router.get('/moderator', authorizeRoles(['admin', 'moderator']), (req, res) => {
  res.json({ message: 'Moderator access granted' });
});

// Using factory method
router.get('/user', AuthorizationMiddlewareFactory.createRoleAuth(['user', 'admin']), (req, res) => {
  res.json({ message: 'User access granted' });
});
```

### 3. Permission-Based Authorization

```typescript
import { Router } from 'express';
import { Permission } from './src/api/middleware/authorization.middleware';

const router = Router();

// Define permissions
const readProductPermission: Permission = {
  resource: 'products',
  action: 'read',
  scope: 'public'
};

const writeProductPermission: Permission = {
  resource: 'products',
  action: 'write',
  scope: 'private',
  conditions: [
    {
      attribute: 'user.department',
      operator: 'eq',
      value: 'inventory'
    }
  ]
};

// Single permission
router.get('/products', authorizePermissions(readProductPermission), (req, res) => {
  res.json({ message: 'Product read access granted' });
});

// Multiple permissions (user needs ALL permissions)
router.post('/products', authorizePermissions([writeProductPermission]), (req, res) => {
  res.json({ message: 'Product write access granted' });
});
```

### 4. Resource Ownership Authorization

```typescript
import { Router } from 'express';

const router = Router();

// Only allow access to resources owned by the user
router.get('/products/:id', 
  authorizeResourceOwnership('products', 'id'), 
  (req, res) => {
    res.json({ message: 'Access to owned product granted' });
  }
);

// Combined with role authorization
router.put('/products/:id', 
  authorizeRoles(['admin', 'owner']),
  authorizeResourceOwnership('products', 'id'),
  (req, res) => {
    res.json({ message: 'Update access granted' });
  }
);
```

### 5. Admin and Super User Authorization

```typescript
import { Router } from 'express';
import { authorizeAdmin, authorizeSuperUser } from './src/api/middleware/authorization.middleware';

const router = Router();

// Admin-only endpoint
router.delete('/users/:id', authorizeAdmin(), (req, res) => {
  res.json({ message: 'Admin delete access granted' });
});

// Super user only (highest privilege level)
router.get('/system/status', authorizeSuperUser(), (req, res) => {
  res.json({ message: 'System status access granted' });
});
```

### 6. Risk-Based Authentication

```typescript
import { Router } from 'express';
import { authorizeWithRiskAssessment } from './src/api/middleware/authorization.middleware';

const router = Router();

// High-risk operations require additional security checks
router.post('/financial/transfer', 
  authorizeWithRiskAssessment({
    requireMFAForCritical: true,
    riskFactors: {
      newDeviceThreshold: 7, // 7 days
      unusualLocationThreshold: 50, // 50 km
      timeAnomalyThreshold: 3, // 3 standard deviations
      velocityThreshold: 500 // 500 km/h
    }
  }),
  (req, res) => {
    res.json({ message: 'High-risk operation access granted' });
  }
);
```

## Advanced Configuration

### Custom Authorization Configuration

```typescript
import { AuthzConfig } from './src/api/middleware/authorization.middleware';

const customAuthzConfig: AuthzConfig = {
  // Core Features
  enableRBAC: true,
  enableABAC: true,
  enablePermissionCaching: true,
  enableAuditLogging: true,
  enableEmergencyMode: false,
  enableResourceOwnership: true,
  enableTimeBasedAccess: true,
  enableRiskBasedAuth: true,
  enableDynamicPolicies: true,

  // Security Settings
  cacheExpirationTime: 5 * 60 * 1000, // 5 minutes
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
  requireMFAForCritical: true,
  enableIPWhitelist: true,
  enableGeofencing: true,

  // Role Configuration
  adminRoles: ['admin', 'superuser'],
  superUserRoles: ['superuser'],
  emergencyRoles: ['emergency'],
  defaultDenyAll: true,
  enableRoleInheritance: true,
  maxRoleDepth: 5,

  // Time-based Access
  allowedTimeWindows: {
    'admin': {
      days: [1, 2, 3, 4, 5], // Monday to Friday
      hours: [9, 17] // 9 AM to 5 PM
    },
    'support': {
      days: [1, 2, 3, 4, 5, 6], // Monday to Saturday
      hours: [8, 20] // 8 AM to 8 PM
    }
  },

  // Risk-based Authentication
  riskFactors: {
    newDeviceThreshold: 30, // days
    unusualLocationThreshold: 100, // km
    timeAnomalyThreshold: 2, // standard deviations
    velocityThreshold: 800 // km/h
  },

  // IP and Location Security
  allowedIPs: ['192.168.1.0/24', '10.0.0.0/8'],
  blockedCountries: ['CN', 'RU'], // Block China and Russia
  allowedCountries: ['US', 'CA', 'GB', 'DE'], // Only allow these countries

  // Performance and Monitoring
  enableMetrics: true,
  logLevel: 'info',
  auditLogRetentionDays: 90
};

const authzMiddleware = new AuthorizationMiddleware(customAuthzConfig);
```

### ABAC Conditions

```typescript
import { PermissionCondition } from './src/api/middleware/authorization.middleware';

// Advanced condition examples
const conditions: PermissionCondition[] = [
  // Equality check
  {
    attribute: 'user.department',
    operator: 'eq',
    value: 'engineering'
  },
  
  // Range check
  {
    attribute: 'user.accountAge',
    operator: 'gte',
    value: 30 // 30 days
  },
  
  // Array membership
  {
    attribute: 'user.roles',
    operator: 'in',
    value: ['admin', 'moderator']
  },
  
  // String operations
  {
    attribute: 'user.email',
    operator: 'endsWith',
    value: '@company.com',
    caseSensitive: false
  },
  
  // Regular expression
  {
    attribute: 'user.username',
    operator: 'regex',
    value: '^[a-zA-Z0-9_]+$'
  },
  
  // Between range
  {
    attribute: 'user.loginAttempts',
    operator: 'between',
    value: [0, 5]
  },
  
  // Negation
  {
    attribute: 'user.status',
    operator: 'ne',
    value: 'suspended',
    negate: false
  }
];
```

## Middleware Factory Usage

### Using the Factory

```typescript
import { AuthorizationMiddlewareFactory } from './src/api/middleware/authorization.middleware';

// Create middleware instances using factory
const adminAuth = AuthorizationMiddlewareFactory.createAdminAuth();
const roleAuth = AuthorizationMiddlewareFactory.createRoleAuth(['user', 'admin']);
const permissionAuth = AuthorizationMiddlewareFactory.createPermissionAuth([
  { resource: 'products', action: 'read' }
]);

// Combined authentication
const secureAuth = AuthorizationMiddlewareFactory.createCombinedAuth(
  ['user'], // roles
  [{ resource: 'products', action: 'read' }], // permissions
  'products' // resource type
);

// Secure authentication with risk assessment
const riskBasedAuth = AuthorizationMiddlewareFactory.createSecureAuth({
  requireMFAForCritical: true,
  riskFactors: {
    newDeviceThreshold: 14
  }
});
```

### Express Router Integration

```typescript
import { Router } from 'express';
import { AuthorizationMiddlewareFactory } from './src/api/middleware/authorization.middleware';

const router = Router();

// Apply multiple middleware
router.get('/secure-endpoint', 
  AuthorizationMiddlewareFactory.createSecureAuth(),
  (req, res) => {
    res.json({ message: 'Secure access granted' });
  }
);

// Route-specific configuration
router.post('/admin-action', 
  AuthorizationMiddlewareFactory.createAdminAuth({
    requireMFAForCritical: true,
    enableEmergencyMode: false
  }),
  (req, res) => {
    res.json({ message: 'Admin action completed' });
  }
);
```

## Error Handling

### Standard Error Responses

The middleware returns standardized error responses:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Insufficient permissions for this operation",
    "details": {
      "requiredRoles": ["admin"],
      "userRoles": ["user"],
      "timestamp": "2023-12-07T10:30:00.000Z"
    }
  }
}
```

### Custom Error Handling

```typescript
import { Request, Response, NextFunction } from 'express';

// Custom error handler
function customAuthErrorHandler(
  error: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
) {
  if (error.code === 'INSUFFICIENT_PERMISSIONS') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: insufficient permissions',
      required: error.details.requiredRoles || error.details.requiredPermissions
    });
  }
  
  if (error.code === 'MFA_REQUIRED') {
    return res.status(403).json({
      success: false,
      message: 'Multi-factor authentication required',
      redirect: '/auth/mfa'
    });
  }
  
  next(error);
}

// Apply error handler
app.use(customAuthErrorHandler);
```

## Audit Logging

### Audit Event Structure

```typescript
interface AuditEvent {
  timestamp: Date;
  eventType: 'AUTHORIZATION_ATTEMPT' | 'AUTHORIZATION_SUCCESS' | 'AUTHORIZATION_FAILURE' | 'POLICY_VIOLATION';
  userId: string;
  sessionId: string;
  resource: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  riskScore: number;
  details: Record<string, any>;
  metadata: {
    policyVersion: string;
    decisionTime: number;
    cacheHit: boolean;
  };
}
```

### Custom Audit Logging

```typescript
import { logger } from './src/infrastructure/services/logger.service';

// Override audit logging behavior
const customAuthzConfig = {
  ...DEFAULT_AUTHZ_CONFIG,
  enableAuditLogging: true,
  logLevel: 'debug'
};

const authzMiddleware = new AuthorizationMiddleware(customAuthzConfig);

// Audit events are automatically logged to the configured logger
// You can also implement custom audit storage
```

## Performance Considerations

### Caching

```typescript
const config = {
  ...DEFAULT_AUTHZ_CONFIG,
  enablePermissionCaching: true,
  cacheExpirationTime: 10 * 60 * 1000 // 10 minutes
};

const authzMiddleware = new AuthorizationMiddleware(config);
```

### Cache Management

```typescript
// The middleware automatically manages cache cleanup
// You can also manually clear cache if needed
authzMiddleware.clearCache(); // Clear all cached permissions
```

### Monitoring

```typescript
const config = {
  ...DEFAULT_AUTHZ_CONFIG,
  enableMetrics: true,
  logLevel: 'info'
};

const authzMiddleware = new AuthorizationMiddleware(config);

// Monitor authorization performance and cache hit rates
// through the configured logging system
```

## Security Best Practices

### 1. Use Strong Role Hierarchy

```typescript
// Define clear role hierarchy
const roleHierarchy = {
  'superuser': ['admin', 'moderator', 'user'],
  'admin': ['moderator', 'user'],
  'moderator': ['user']
};
```

### 2. Implement Time-Based Access

```typescript
const config = {
  ...DEFAULT_AUTHZ_CONFIG,
  enableTimeBasedAccess: true,
  allowedTimeWindows: {
    'admin': {
      days: [1, 2, 3, 4, 5], // Weekdays only
      hours: [8, 18] // Business hours
    }
  }
};
```

### 3. Use Risk-Based Authentication

```typescript
const config = {
  ...DEFAULT_AUTHZ_CONFIG,
  enableRiskBasedAuth: true,
  requireMFAForCritical: true,
  riskFactors: {
    newDeviceThreshold: 7,
    unusualLocationThreshold: 100,
    timeAnomalyThreshold: 2
  }
};
```

### 4. Enable Audit Logging

```typescript
const config = {
  ...DEFAULT_AUTHZ_CONFIG,
  enableAuditLogging: true,
  auditLogRetentionDays: 365 // Keep logs for 1 year
};
```

### 5. Implement Emergency Access Controls

```typescript
const config = {
  ...DEFAULT_AUTHZ_CONFIG,
  enableEmergencyMode: true,
  emergencyRoles: ['emergency'],
  maxRoleDepth: 3 // Limit inheritance depth
};
```

## Integration Examples

### Express Application

```typescript
import express from 'express';
import { 
  AuthenticationMiddleware, 
  AuthorizationMiddlewareFactory 
} from './src/api/middleware';

const app = express();

// Apply authentication middleware first
app.use(AuthenticationMiddleware.authenticate());

// Apply authorization middleware to specific routes
app.get('/api/admin', 
  AuthorizationMiddlewareFactory.createAdminAuth(),
  (req, res) => {
    res.json({ message: 'Admin access granted' });
  }
);

// Apply combined authentication and authorization
app.get('/api/secure', 
  AuthenticationMiddleware.authenticate(),
  AuthorizationMiddlewareFactory.createSecureAuth(),
  (req, res) => {
    res.json({ message: 'Secure access granted' });
  }
);
```

### Microservice Integration

```typescript
// In each microservice
import { 
  AuthorizationMiddlewareFactory,
  DEFAULT_AUTHZ_CONFIG 
} from './auth-service/src/api/middleware/authorization.middleware';

// Configure for microservice
const microserviceConfig = {
  ...DEFAULT_AUTHZ_CONFIG,
  enableResourceOwnership: true,
  enableTimeBasedAccess: false,
  cacheExpirationTime: 2 * 60 * 1000 // 2 minutes for microservices
};

const authzMiddleware = new AuthorizationMiddleware(microserviceConfig);

// Use in microservice routes
router.get('/api/products/:id',
  authzMiddleware.authorizeResourceOwnership('products', 'id'),
  async (req, res) => {
    // Microservice logic here
  }
);
```

## Troubleshooting

### Common Issues

1. **Permission Cache Issues**: Clear cache if permissions are not updating
2. **Role Inheritance Problems**: Check role hierarchy configuration
3. **Time-based Access Failures**: Verify timezone and time window settings
4. **Risk Assessment Failures**: Check risk factor thresholds
5. **Audit Logging Issues**: Verify logger configuration

### Debug Mode

```typescript
const config = {
  ...DEFAULT_AUTHZ_CONFIG,
  logLevel: 'debug',
  enableAuditLogging: true
};

const authzMiddleware = new AuthorizationMiddleware(config);
```

## Migration from Basic Authorization

### From Simple Role Checks

```typescript
// Before
function checkRole(req, res, next) {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

// After
app.use('/admin', AuthorizationMiddlewareFactory.createAdminAuth());
```

### From Manual Permission Checks

```typescript
// Before
function checkPermission(permission) {
  return function(req, res, next) {
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// After
app.use('/api', AuthorizationMiddlewareFactory.createPermissionAuth([
  { resource: 'api', action: 'access' }
]));
```

This comprehensive guide covers all aspects of using the Authorization Middleware effectively in your applications.