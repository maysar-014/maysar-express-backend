/**
 * Authorization Middleware
 * Role-based and permission-based access control with security hardening
 * Implements RBAC, ABAC, and fine-grained permission checking
 */

import { Request, Response, NextFunction } from 'express';

// =====================================================================================
// AUTHORIZATION CONFIGURATION
// =====================================================================================

/**
 * Authorization Configuration
 */
export interface AuthzConfig {
  enableRBAC: boolean;
  enableABAC: boolean;
  enablePermissionCaching: boolean;
  cacheExpirationTime: number;
  enableAuditLogging: boolean;
  enableEmergencyMode: boolean;
  adminRoles: string[];
  superUserRoles: string[];
  defaultDenyAll: boolean;
  enableResourceOwnership: boolean;
  enableTimeBasedAccess: boolean;
  allowedTimeWindows: {
    [role: string]: {
      days: number[];
      hours: [number, number]; // [startHour, endHour]
    };
  };
}

/**
 * Default Authorization Configuration
 */
export const DEFAULT_AUTHZ_CONFIG: AuthzConfig = {
  enableRBAC: true,
  enableABAC: false,
  enablePermissionCaching: true,
  cacheExpirationTime: 5 * 60 * 1000, // 5 minutes
  enableAuditLogging: true,
  enableEmergencyMode: false,
  adminRoles: ['admin', 'superuser'],
  superUserRoles: ['superuser'],
  defaultDenyAll: true,
  enableResourceOwnership: true,
  enableTimeBasedAccess: false,
  allowedTimeWindows: {}
};

// =====================================================================================
// PERMISSION & ROLE TYPES
// =====================================================================================

/**
 * Permission Definition
 */
export interface Permission {
  resource: string;
  action: string;
  scope?: string;
  conditions?: PermissionCondition[];
}

/**
 * Permission Condition for ABAC
 */
export interface PermissionCondition {
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: any;
}

/**
 * Role Definition
 */
export interface Role {
  name: string;
  description?: string;
  permissions: Permission[];
  inherits?: string[]; // Parent roles
  metadata?: Record<string, any>;
}

/**
 * Authorization Result
 */
export interface AuthzResult {
  authorized: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
  userPermissions?: Permission[];
  context?: Record<string, any>;
}

/**
 * Resource Context
 */
export interface ResourceContext {
  resourceType: string;
  resourceId: string;
  ownerId?: string;
  attributes: Record<string, any>;
}

// =====================================================================================
// AUTHORIZATION MIDDLEWARE
// =====================================================================================

/**
 * Role-Based Authorization Middleware
 */
export function authorize(roles: string | string[], config: Partial<AuthzConfig> = {}) {
  const finalConfig = { ...DEFAULT_AUTHZ_CONFIG, ...config };
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required'
          }
        });
      }

      // Check emergency mode
      if (finalConfig.enableEmergencyMode && user.roles.includes('emergency')) {
        logAuthorization(req, user, 'emergency_access', true);
        return next();
      }

      // Check if user has required roles
      const hasRequiredRole = requiredRoles.some(role =>
        user.roles.includes(role) ||
        checkInheritedRole(user.roles, role, finalConfig)
      );

      if (!hasRequiredRole) {
        logAuthorization(req, user, 'insufficient_roles', false, { requiredRoles });
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions for this operation',
            details: {
              requiredRoles,
              userRoles: user.roles
            }
          }
        });
      }

      // Check time-based access if enabled
      if (finalConfig.enableTimeBasedAccess) {
        const timeAllowed = await checkTimeBasedAccess(user.roles, finalConfig);
        if (!timeAllowed) {
          logAuthorization(req, user, 'time_restricted', false);
          return res.status(403).json({
            success: false,
            error: {
              code: 'ACCESS_TIME_RESTRICTED',
              message: 'Access not allowed at this time'
            }
          });
        }
      }

      logAuthorization(req, user, 'role_authorized', true, { requiredRoles });
      next();
    } catch (error) {
      console.error('[AUTHZ] Authorization error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization check failed'
        }
      });
    }
  };
}

/**
 * Permission-Based Authorization Middleware
 */
export function authorizePermissions(
  requiredPermissions: Permission | Permission[],
  config: Partial<AuthzConfig> = {}
) {
  const finalConfig = { ...DEFAULT_AUTHZ_CONFIG, ...config };
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required'
          }
        });
      }

      // Check emergency mode
      if (finalConfig.enableEmergencyMode && user.roles.includes('emergency')) {
        logAuthorization(req, user, 'emergency_access', true);
        return next();
      }

      // Check permissions with caching
      let hasAllPermissions = false;

      if (finalConfig.enablePermissionCaching) {
        const cacheKey = generatePermissionCacheKey(user.userId, permissions);
        const cachedResult = await checkPermissionCache(cacheKey);

        if (cachedResult === undefined) { // Cache miss
          hasAllPermissions = await checkUserPermissions(user, permissions, finalConfig);
          await setPermissionCache(cacheKey, hasAllPermissions, finalConfig.cacheExpirationTime);
        } else {
          hasAllPermissions = cachedResult;
        }
      } else {
        hasAllPermissions = await checkUserPermissions(user, permissions, finalConfig);
      }

      if (!hasAllPermissions) {
        const userPermissions = await getUserPermissions(user, finalConfig);
        logAuthorization(req, user, 'insufficient_permissions', false, {
          requiredPermissions: permissions,
          userPermissions
        });

        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Insufficient permissions for this operation',
            details: {
              requiredPermissions: permissions,
              userPermissions
            }
          }
        });
      }

      logAuthorization(req, user, 'permissions_authorized', true, { permissions });
      next();
    } catch (error) {
      console.error('[AUTHZ] Permission check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'PERMISSION_CHECK_ERROR',
          message: 'Permission verification failed'
        }
      });
    }
  };
}

/**
 * Resource Ownership Authorization Middleware
 */
export function authorizeResourceOwnership(
  resourceType: string,
  resourceIdParam: string = 'id',
  config: Partial<AuthzConfig> = {}
) {
  const finalConfig = { ...DEFAULT_AUTHZ_CONFIG, ...config };

  return async (req: Request, res: Response, next: NextFunction) => {
    if (!finalConfig.enableResourceOwnership) {
      return next();
    }

    try {
      const user = (req as any).user;

      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Authentication required'
          }
        });
      }

      // Check if user is admin (admins can access any resource)
      if (finalConfig.adminRoles.some(role => user.roles.includes(role))) {
        return next();
      }

      const resourceId = req.params[resourceIdParam];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_RESOURCE_ID',
            message: 'Resource ID parameter missing'
          }
        });
      }

      // Check resource ownership
      const isOwner = await checkResourceOwnership(user.userId, resourceType, resourceId);

      if (!isOwner) {
        logAuthorization(req, user, 'resource_not_owned', false, { resourceType, resourceId });
        return res.status(403).json({
          success: false,
          error: {
            code: 'RESOURCE_ACCESS_DENIED',
            message: 'You do not own this resource or have access to it'
          }
        });
      }

      logAuthorization(req, user, 'resource_owned', true, { resourceType, resourceId });
      next();
    } catch (error) {
      console.error('[AUTHZ] Resource ownership check error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'OWNERSHIP_CHECK_ERROR',
          message: 'Resource ownership verification failed'
        }
      });
    }
  };
}

/**
 * Admin-Only Authorization Middleware
 */
export function authorizeAdmin(config: Partial<AuthzConfig> = {}) {
  const finalConfig = { ...DEFAULT_AUTHZ_CONFIG, ...config };

  return authorize(finalConfig.adminRoles, finalConfig);
}

/**
 * Super User Authorization Middleware
 */
export function authorizeSuperUser(config: Partial<AuthzConfig> = {}) {
  const finalConfig = { ...DEFAULT_AUTHZ_CONFIG, ...config };

  return authorize(finalConfig.superUserRoles, finalConfig);
}

// =====================================================================================
// AUTHORIZATION HELPERS
// =====================================================================================

/**
 * Check if user has inherited role
 */
function checkInheritedRole(userRoles: string[], requiredRole: string, config: AuthzConfig): boolean {
  // Mock implementation - in real app, check role hierarchy from database
  const roleHierarchy: Record<string, string[]> = {
    'superuser': ['admin', 'moderator', 'user'],
    'admin': ['moderator', 'user'],
    'moderator': ['user']
  };

  // Check if any user role can inherit the required role through the hierarchy
  return userRoles.some(userRole => {
    // If user has the required role directly, return true
    if (userRole === requiredRole) return true;

    // Check if user's role inherits the required role
    const inheritedRoles = roleHierarchy[userRole] || [];
    if (inheritedRoles.includes(requiredRole)) return true;

    // Check deeper inheritance levels
    return inheritedRoles.some(inheritedRole => {
      const deeperRoles = roleHierarchy[inheritedRole] || [];
      return deeperRoles.includes(requiredRole);
    });
  });
}

/**
 * Check time-based access
 */
async function checkTimeBasedAccess(userRoles: string[], config: AuthzConfig): Promise<boolean> {
  const now = new Date();
  const currentDay = now.getDay ? now.getDay() : 1; // 0 = Sunday, 6 = Saturday
  const currentHour = now.getHours ? now.getHours() : 12;

  for (const role of userRoles) {
    const timeWindow = config.allowedTimeWindows[role];
    if (timeWindow) {
      if (timeWindow.days.includes(currentDay)) {
        const [startHour, endHour] = timeWindow.hours;
        if (currentHour >= startHour && currentHour <= endHour) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check user permissions
 */
async function checkUserPermissions(
  user: any,
  requiredPermissions: Permission[],
  config: AuthzConfig
): Promise<boolean> {
  // Use global function if available (for testing), otherwise use local implementation
  if (typeof (global as any).checkUserPermissions === 'function') {
    return (global as any).checkUserPermissions(user, requiredPermissions, config);
  }

  // Mock implementation - in real app, check against database/permission service
  const userPermissions = user.permissions || [];

  return requiredPermissions.every(requiredPerm =>
    userPermissions.some((userPerm: Permission) =>
      checkPermissionMatch(userPerm, requiredPerm, user, config)
    )
  );
}

/**
 * Check permission match (supports wildcards and ABAC)
 */
export function checkPermissionMatch(
  userPerm: Permission,
  requiredPerm: Permission,
  user: any,
  config: AuthzConfig
): boolean {
  // Basic resource and action matching
  const resourceMatch = userPerm.resource === requiredPerm.resource ||
                        userPerm.resource === '*' ||
                        requiredPerm.resource === '*';

  const actionMatch = userPerm.action === requiredPerm.action ||
                      userPerm.action === '*' ||
                      requiredPerm.action === '*';

  const scopeMatch = !requiredPerm.scope ||
                     userPerm.scope === requiredPerm.scope ||
                     userPerm.scope === '*';

  if (!resourceMatch || !actionMatch || !scopeMatch) {
    return false;
  }

  // ABAC conditions check
  if (config.enableABAC && requiredPerm.conditions) {
    return requiredPerm.conditions.every(condition =>
      evaluateCondition(condition, user)
    );
  }

  return true;
}

/**
 * Evaluate ABAC condition
 */
export function evaluateCondition(condition: PermissionCondition, user: any): boolean {
  const { attribute, operator, value } = condition;
  const userValue = getNestedValue(user, attribute);

  switch (operator) {
    case 'eq': return userValue === value;
    case 'ne': return userValue !== value;
    case 'gt': return userValue > value;
    case 'lt': return userValue < value;
    case 'gte': return userValue >= value;
    case 'lte': return userValue <= value;
    case 'in': return Array.isArray(value) && value.includes(userValue);
    case 'nin': return Array.isArray(value) && !value.includes(userValue);
    case 'contains': return String(userValue).includes(String(value));
    case 'regex': return new RegExp(value).test(String(userValue));
    default: return false;
  }
}

/**
 * Get nested object value
 */
export function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Check resource ownership
 */
async function checkResourceOwnership(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  // Use global function if available (for testing), otherwise use local implementation
  if (typeof (global as any).checkResourceOwnership === 'function') {
    return (global as any).checkResourceOwnership(userId, resourceType, resourceId);
  }

  // Mock implementation - in real app, check ownership in database
  // For example: SELECT owner_id FROM products WHERE id = resourceId
  return true; // Assume ownership for demo
}

/**
 * Get user permissions
 */
async function getUserPermissions(user: any, config: AuthzConfig): Promise<Permission[]> {
  // Mock implementation
  return user.permissions || [];
}

/**
 * Permission cache operations
 */
async function checkPermissionCache(cacheKey: string): Promise<boolean | undefined> {
  // Mock implementation - in real app, check Redis/cache
  return undefined; // Cache miss
}

async function setPermissionCache(
  cacheKey: string,
  result: boolean,
  expirationTime: number
): Promise<void> {
  // Mock implementation - in real app, set Redis/cache
}

/**
 * Generate permission cache key
 */
function generatePermissionCacheKey(userId: string, permissions: Permission[]): string {
  const permHash = require('crypto').createHash('md5')
    .update(JSON.stringify(permissions))
    .digest('hex');
  return `perm:${userId}:${permHash}`;
}

/**
 * Log authorization events
 */
function logAuthorization(
  req: Request,
  user: any,
  event: string,
  success: boolean,
  metadata?: any
): void {
  const timestamp = new Date();
  console.log(`[AUTHZ] ${success ? 'SUCCESS' : 'FAILURE'} ${event}:`, {
    userId: user.userId,
    ip: req.ip,
    method: req.method,
    url: req.originalUrl,
    timestamp: timestamp && typeof timestamp.toISOString === 'function' ? timestamp.toISOString() : new Date().toISOString(),
    ...metadata
  });
}

// =====================================================================================
// AUTHORIZATION MIDDLEWARE FACTORY
// =====================================================================================

/**
 * Authorization Middleware Factory
 * Creates pre-configured authorization middleware
 */
export class AuthorizationMiddlewareFactory {
  static createRoleAuth(roles: string | string[], config: Partial<AuthzConfig> = {}) {
    return authorize(roles, config);
  }

  static createPermissionAuth(permissions: Permission | Permission[], config: Partial<AuthzConfig> = {}) {
    return authorizePermissions(permissions, config);
  }

  static createResourceAuth(
    resourceType: string,
    resourceIdParam: string = 'id',
    config: Partial<AuthzConfig> = {}
  ) {
    return authorizeResourceOwnership(resourceType, resourceIdParam, config);
  }

  static createAdminAuth(config: Partial<AuthzConfig> = {}) {
    return authorizeAdmin(config);
  }

  static createSuperUserAuth(config: Partial<AuthzConfig> = {}) {
    return authorizeSuperUser(config);
  }

  static createCombinedAuth(
    roles: string[] = [],
    permissions: Permission[] = [],
    resourceType?: string,
    config: Partial<AuthzConfig> = {}
  ) {
    const middlewares: any[] = [];

    if (roles.length > 0) {
      middlewares.push(authorize(roles, config));
    }

    if (permissions.length > 0) {
      middlewares.push(authorizePermissions(permissions, config));
    }

    if (resourceType) {
      middlewares.push(authorizeResourceOwnership(resourceType, 'id', config));
    }

    return middlewares;
  }
}
