/**
 * Authorization Middleware
 * Enterprise-grade role-based and attribute-based access control (RBAC/ABAC)
 * Implements fine-grained permission checking with caching, audit logging, and security hardening
 * 
 * @author Maysar Express Security Team
 * @version 2.0.0
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../infrastructure/services/logger.service';

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

/**
 * Permission Definition with enhanced metadata
 */
export interface Permission {
  resource: string;
  action: string;
  scope?: string;
  conditions?: PermissionCondition[];
  metadata?: {
    description?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    auditRequired?: boolean;
    expirationDate?: Date;
  };
}

/**
 * Permission Condition for ABAC with advanced operators
 */
export interface PermissionCondition {
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'regex' | 'startsWith' | 'endsWith' | 'between' | 'exists';
  value: any;
  caseSensitive?: boolean;
  negate?: boolean;
}

/**
 * Role Definition with inheritance and metadata
 */
export interface Role {
  name: string;
  description?: string;
  permissions: Permission[];
  inherits?: string[]; // Parent roles for hierarchical inheritance
  metadata?: {
    level?: number;
    department?: string;
    location?: string;
    riskLevel?: 'low' | 'medium' | 'high';
    active?: boolean;
  };
}

/**
 * Resource Context for ownership and attribute-based checks
 */
export interface ResourceContext {
  resourceType: string;
  resourceId: string;
  ownerId?: string;
  attributes: Record<string, any>;
  metadata?: {
    classification?: 'public' | 'internal' | 'confidential' | 'restricted';
    department?: string;
    createdDate?: Date;
    lastModified?: Date;
  };
}

/**
 * User Context with enhanced security attributes
 */
export interface UserContext {
  userId: string;
  email: string;
  roles: string[];
  permissions: Permission[];
  attributes: Record<string, any>;
  sessionInfo?: {
    sessionId: string;
    deviceId: string;
    ipAddress: string;
    userAgent: string;
    loginTime: Date;
    lastActivity: Date;
  };
  securityContext?: {
    mfaEnabled: boolean;
    accountStatus: 'active' | 'suspended' | 'locked' | 'pending';
    passwordLastChanged: Date;
    failedLoginAttempts: number;
    lastFailedLogin?: Date;
  };
}

/**
 * Authorization Configuration with enterprise settings
 */
export interface AuthzConfig {
  // Core Features
  enableRBAC: boolean;
  enableABAC: boolean;
  enablePermissionCaching: boolean;
  enableAuditLogging: boolean;
  enableEmergencyMode: boolean;
  enableResourceOwnership: boolean;
  enableTimeBasedAccess: boolean;
  enableRiskBasedAuth: boolean;
  enableDynamicPolicies: boolean;

  // Security Settings
  cacheExpirationTime: number;
  maxFailedAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  requireMFAForCritical: boolean;
  enableIPWhitelist: boolean;
  enableGeofencing: boolean;

  // Role Configuration
  adminRoles: string[];
  superUserRoles: string[];
  emergencyRoles: string[];
  defaultDenyAll: boolean;
  enableRoleInheritance: boolean;
  maxRoleDepth: number;

  // Time-based Access
  allowedTimeWindows: {
    [role: string]: {
      days: number[]; // 0-6 (Sunday-Saturday)
      hours: [number, number]; // [startHour, endHour] in 24h format
      timezone?: string;
    };
  };

  // Risk-based Authentication
  riskFactors: {
    newDeviceThreshold: number;
    unusualLocationThreshold: number;
    timeAnomalyThreshold: number;
    velocityThreshold: number; // km/h
  };

  // IP and Location Security
  allowedIPs: string[];
  blockedCountries: string[];
  allowedCountries: string[];

  // Performance and Monitoring
  enableMetrics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  auditLogRetentionDays: number;
}

/**
 * Authorization Result with detailed context
 */
export interface AuthzResult {
  authorized: boolean;
  reason?: string;
  requiredPermissions?: Permission[];
  userPermissions?: Permission[];
  context?: Record<string, any>;
  riskScore?: number;
  auditTrail?: AuditEvent[];
}

/**
 * Audit Event for comprehensive logging
 */
export interface AuditEvent {
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

// =====================================================================================
// DEFAULT CONFIGURATION
// =====================================================================================

/**
 * Default Authorization Configuration
 */
export const DEFAULT_AUTHZ_CONFIG: AuthzConfig = {
  // Core Features
  enableRBAC: true,
  enableABAC: true,
  enablePermissionCaching: true,
  enableAuditLogging: true,
  enableEmergencyMode: false,
  enableResourceOwnership: true,
  enableTimeBasedAccess: false,
  enableRiskBasedAuth: true,
  enableDynamicPolicies: true,

  // Security Settings
  cacheExpirationTime: 5 * 60 * 1000, // 5 minutes
  maxFailedAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
  sessionTimeout: 8 * 60 * 60 * 1000, // 8 hours
  requireMFAForCritical: true,
  enableIPWhitelist: false,
  enableGeofencing: false,

  // Role Configuration
  adminRoles: ['admin', 'superuser'],
  superUserRoles: ['superuser'],
  emergencyRoles: ['emergency'],
  defaultDenyAll: true,
  enableRoleInheritance: true,
  maxRoleDepth: 5,

  // Time-based Access
  allowedTimeWindows: {},

  // Risk-based Authentication
  riskFactors: {
    newDeviceThreshold: 30, // days
    unusualLocationThreshold: 100, // km
    timeAnomalyThreshold: 2, // standard deviations
    velocityThreshold: 800 // km/h (commercial flight speed)
  },

  // IP and Location Security
  allowedIPs: [],
  blockedCountries: [],
  allowedCountries: [],

  // Performance and Monitoring
  enableMetrics: true,
  logLevel: 'info',
  auditLogRetentionDays: 90
};

// =====================================================================================
// AUTHORIZATION MIDDLEWARE CLASSES
// =====================================================================================

/**
 * Enterprise Authorization Middleware
 * Provides comprehensive RBAC and ABAC with enterprise security features
 */
export class AuthorizationMiddleware {
  private config: AuthzConfig;
  private cache: Map<string, { result: boolean; timestamp: number }> = new Map();
  private failedAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private deviceFingerprints: Map<string, { lastSeen: Date; locations: string[] }> = new Map();

  constructor(config: Partial<AuthzConfig> = {}) {
    this.config = { ...DEFAULT_AUTHZ_CONFIG, ...config };
  }

  /**
   * Role-Based Authorization Middleware
   */
  public authorizeRoles(roles: string | string[], customConfig?: Partial<AuthzConfig>) {
    const finalConfig = { ...this.config, ...customConfig };
    const requiredRoles = Array.isArray(roles) ? roles : [roles];

    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const user = (req as any).user as UserContext;
      const sessionId = (req as any).session?.id || 'unknown';

      try {
        const result = await this.checkRoleAuthorization(user, requiredRoles, finalConfig, req);
        const decisionTime = Date.now() - startTime;

        if (result.authorized) {
          this.logAuthorizationEvent('AUTHORIZATION_SUCCESS', user, req, {
            requiredRoles,
            decisionTime,
            cacheHit: result.context?.cacheHit || false
          });
          next();
        } else {
          this.logAuthorizationEvent('AUTHORIZATION_FAILURE', user, req, {
            requiredRoles,
            reason: result.reason,
            decisionTime
          });

          return res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: result.reason || 'Insufficient permissions for this operation',
              details: {
                requiredRoles,
                userRoles: user?.roles || [],
                timestamp: new Date().toISOString()
              }
            }
          });
        }
      } catch (error) {
        logger.error('Role authorization error', error instanceof Error ? error : new Error(String(error)));
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
  public authorizePermissions(
    permissions: Permission | Permission[],
    customConfig?: Partial<AuthzConfig>
  ) {
    const finalConfig = { ...this.config, ...customConfig };
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];

    return async (req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const user = (req as any).user as UserContext;
      const sessionId = (req as any).session?.id || 'unknown';

      try {
        const result = await this.checkPermissionAuthorization(user, requiredPermissions, finalConfig, req);
        const decisionTime = Date.now() - startTime;

        if (result.authorized) {
          this.logAuthorizationEvent('AUTHORIZATION_SUCCESS', user, req, {
            requiredPermissions,
            decisionTime,
            riskScore: result.riskScore,
            cacheHit: result.context?.cacheHit || false
          });
          next();
        } else {
          this.logAuthorizationEvent('AUTHORIZATION_FAILURE', user, req, {
            requiredPermissions,
            reason: result.reason,
            decisionTime,
            riskScore: result.riskScore
          });

          return res.status(403).json({
            success: false,
            error: {
              code: 'INSUFFICIENT_PERMISSIONS',
              message: result.reason || 'Insufficient permissions for this operation',
              details: {
                requiredPermissions,
                userPermissions: user?.permissions || [],
                timestamp: new Date().toISOString()
              }
            }
          });
        }
      } catch (error) {
        logger.error('Permission authorization error', error instanceof Error ? error : new Error(String(error)));
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
  public authorizeResourceOwnership(
    resourceType: string,
    resourceIdParam: string = 'id',
    customConfig?: Partial<AuthzConfig>
  ) {
    const finalConfig = { ...this.config, ...customConfig };

    return async (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user as UserContext;
      const sessionId = (req as any).session?.id || 'unknown';

      if (!finalConfig.enableResourceOwnership) {
        return next();
      }

      try {
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

        // Check if user is admin (admins can access any resource)
        if (finalConfig.adminRoles.some(role => user?.roles?.includes(role))) {
          return next();
        }

        const isOwner = await this.checkResourceOwnership(user, resourceType, resourceId, req);
        
        if (isOwner) {
          this.logAuthorizationEvent('AUTHORIZATION_SUCCESS', user, req, {
            resourceType,
            resourceId,
            ownershipCheck: true
          });
          next();
        } else {
          this.logAuthorizationEvent('AUTHORIZATION_FAILURE', user, req, {
            resourceType,
            resourceId,
            reason: 'Resource ownership verification failed'
          });

          return res.status(403).json({
            success: false,
            error: {
              code: 'RESOURCE_ACCESS_DENIED',
              message: 'You do not own this resource or have access to it'
            }
          });
        }
      } catch (error) {
        logger.error('Resource ownership check error', { error: error instanceof Error ? error : new Error(String(error)), userId: user?.userId, sessionId });
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
  public authorizeAdmin(customConfig?: Partial<AuthzConfig>) {
    return this.authorizeRoles(this.config.adminRoles, customConfig);
  }

  /**
   * Super User Authorization Middleware
   */
  public authorizeSuperUser(customConfig?: Partial<AuthzConfig>) {
    return this.authorizeRoles(this.config.superUserRoles, customConfig);
  }

  /**
   * Emergency Access Authorization Middleware
   */
  public authorizeEmergency(customConfig?: Partial<AuthzConfig>) {
    const finalConfig = { ...this.config, ...customConfig, enableEmergencyMode: true };
    return this.authorizeRoles(finalConfig.emergencyRoles, finalConfig);
  }

  /**
   * Risk-Based Authentication Middleware
   */
  public authorizeWithRiskAssessment(customConfig?: Partial<AuthzConfig>) {
    const finalConfig = { ...this.config, ...customConfig };

    return async (req: Request, res: Response, next: NextFunction) => {
      const user = (req as any).user as UserContext;
      const sessionId = (req as any).session?.id || 'unknown';

      try {
        const riskScore = await this.calculateRiskScore(user, req);
        const isHighRisk = riskScore > 70; // Threshold for high risk

        if (isHighRisk && finalConfig.requireMFAForCritical && !user?.securityContext?.mfaEnabled) {
          this.logAuthorizationEvent('AUTHORIZATION_FAILURE', user, req, {
            reason: 'High risk access requires MFA',
            riskScore
          });

          return res.status(403).json({
            success: false,
            error: {
              code: 'MFA_REQUIRED',
              message: 'Multi-factor authentication required for high-risk access'
            }
          });
        }

        this.logAuthorizationEvent('AUTHORIZATION_SUCCESS', user, req, {
          riskScore,
          mfaRequired: isHighRisk && finalConfig.requireMFAForCritical
        });

        next();
      } catch (error) {
        logger.error('Risk assessment error', { error: error instanceof Error ? error : new Error(String(error)), userId: user?.userId, sessionId });
        return res.status(500).json({
          success: false,
          error: {
            code: 'RISK_ASSESSMENT_ERROR',
            message: 'Risk assessment failed'
          }
        });
      }
    };
  }

  // =====================================================================================
  // PRIVATE AUTHORIZATION METHODS
  // =====================================================================================

  private async checkRoleAuthorization(
    user: UserContext,
    requiredRoles: string[],
    config: AuthzConfig,
    req: Request
  ): Promise<AuthzResult> {
    if (!user) {
      return { authorized: false, reason: 'Authentication required' };
    }

    // Check emergency mode
    if (config.enableEmergencyMode && user.roles.some(role => config.emergencyRoles.includes(role))) {
      return { authorized: true, reason: 'Emergency access granted' };
    }

    // Check account status
    if (user.securityContext?.accountStatus !== 'active') {
      return { authorized: false, reason: `Account is ${user.securityContext?.accountStatus}` };
    }

    // Check session timeout
    if (user.sessionInfo?.lastActivity) {
      const sessionAge = Date.now() - user.sessionInfo.lastActivity.getTime();
      if (sessionAge > config.sessionTimeout) {
        return { authorized: false, reason: 'Session timeout' };
      }
    }

    // Check time-based access
    if (config.enableTimeBasedAccess) {
      const timeAllowed = await this.checkTimeBasedAccess(user.roles, config);
      if (!timeAllowed) {
        return { authorized: false, reason: 'Access not allowed at this time' };
      }
    }

    // Check IP whitelist if enabled
    if (config.enableIPWhitelist && config.allowedIPs.length > 0) {
      const clientIP = this.getClientIP(req);
      if (!config.allowedIPs.includes(clientIP)) {
        return { authorized: false, reason: 'IP address not in whitelist' };
      }
    }

    // Check geofencing if enabled
    if (config.enableGeofencing) {
      const geoAllowed = await this.checkGeofencing(user, req);
      if (!geoAllowed) {
        return { authorized: false, reason: 'Access not allowed from this location' };
      }
    }

    // Check role inheritance
    const hasRequiredRole = await this.checkRoleInheritance(user.roles, requiredRoles, config);
    if (!hasRequiredRole) {
      return {
        authorized: false,
        reason: 'Insufficient role permissions',
        requiredPermissions: [],
        userPermissions: []
      };
    }

    return { authorized: true, reason: 'Role authorization successful' };
  }

  private async checkPermissionAuthorization(
    user: UserContext,
    requiredPermissions: Permission[],
    config: AuthzConfig,
    req: Request
  ): Promise<AuthzResult> {
    if (!user) {
      return { authorized: false, reason: 'Authentication required' };
    }

    // Check emergency mode
    if (config.enableEmergencyMode && user.roles.some(role => config.emergencyRoles.includes(role))) {
      return { authorized: true, reason: 'Emergency access granted' };
    }

    // Check account status and session
    const roleResult = await this.checkRoleAuthorization(user, [], config, req);
    if (!roleResult.authorized) {
      return roleResult;
    }

    // Check permission cache
    if (config.enablePermissionCaching) {
      const cacheKey = this.generatePermissionCacheKey(user.userId, requiredPermissions);
      const cachedResult = this.checkPermissionCache(cacheKey);

      if (cachedResult !== undefined) {
        return {
          authorized: cachedResult,
          reason: cachedResult ? 'Permissions authorized (cached)' : 'Insufficient permissions (cached)',
          context: { cacheHit: true }
        };
      }
    }

    // Check permissions
    const hasAllPermissions = await this.checkUserPermissions(user, requiredPermissions, config, req);
    const userPermissions = user.permissions || [];

    if (config.enablePermissionCaching) {
      const cacheKey = this.generatePermissionCacheKey(user.userId, requiredPermissions);
      this.setPermissionCache(cacheKey, hasAllPermissions, config.cacheExpirationTime);
    }

    if (!hasAllPermissions) {
      return {
        authorized: false,
        reason: 'Insufficient permissions',
        requiredPermissions,
        userPermissions
      };
    }

    return {
      authorized: true,
      reason: 'Permission authorization successful',
      requiredPermissions,
      userPermissions,
      riskScore: await this.calculateRiskScore(user, req)
    };
  }

  private async checkResourceOwnership(
    user: UserContext,
    resourceType: string,
    resourceId: string,
    req: Request
  ): Promise<boolean> {
    // In a real implementation, this would check against a database
    // For now, we'll implement a mock that could be replaced with actual logic
    try {
      // Mock implementation - replace with actual ownership check
      const resourceOwners = {
        'products': { 'prod-123': 'user-123', 'prod-456': 'user-456' },
        'orders': { 'ord-123': 'user-123', 'ord-456': 'user-456' }
      };

      const owners = (resourceOwners as any)[resourceType];
      if (!owners) return false;

      const owner = owners[resourceId];
      return owner === user.userId;
    } catch (error) {
      logger.error('Resource ownership check failed', { error: error instanceof Error ? error : new Error(String(error)), userId: user.userId, resourceType, resourceId });
      return false;
    }
  }

  // =====================================================================================
  // HELPER METHODS
  // =====================================================================================

  private async checkRoleInheritance(userRoles: string[], requiredRoles: string[], config: AuthzConfig): Promise<boolean> {
    if (!config.enableRoleInheritance) {
      return requiredRoles.some(role => userRoles.includes(role));
    }

    // Mock role hierarchy - in real implementation, this would come from database
    const roleHierarchy: Record<string, string[]> = {
      'superuser': ['admin', 'moderator', 'user'],
      'admin': ['moderator', 'user'],
      'moderator': ['user']
    };

    for (const requiredRole of requiredRoles) {
      for (const userRole of userRoles) {
        if (userRole === requiredRole) return true;

        const inheritedRoles = roleHierarchy[userRole] || [];
        if (inheritedRoles.includes(requiredRole)) return true;

        // Check deeper inheritance levels
        for (const inheritedRole of inheritedRoles) {
          const deeperRoles = roleHierarchy[inheritedRole] || [];
          if (deeperRoles.includes(requiredRole)) return true;
        }
      }
    }

    return false;
  }

  private async checkTimeBasedAccess(userRoles: string[], config: AuthzConfig): Promise<boolean> {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();

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

  private async checkGeofencing(user: UserContext, req: Request): Promise<boolean> {
    // Mock geofencing implementation
    // In real implementation, this would use IP geolocation services
    const userCountry = user.attributes?.country || 'unknown';
    const config = this.config;

    if (config.blockedCountries.length > 0 && config.blockedCountries.includes(userCountry)) {
      return false;
    }

    if (config.allowedCountries.length > 0 && !config.allowedCountries.includes(userCountry)) {
      return false;
    }

    return true;
  }

  private async checkUserPermissions(
    user: UserContext,
    requiredPermissions: Permission[],
    config: AuthzConfig,
    req: Request
  ): Promise<boolean> {
    const userPermissions = user.permissions || [];

    return requiredPermissions.every(requiredPerm =>
      userPermissions.some(userPerm =>
        this.checkPermissionMatch(userPerm, requiredPerm, user, config, req)
      )
    );
  }

  private checkPermissionMatch(
    userPerm: Permission,
    requiredPerm: Permission,
    user: UserContext,
    config: AuthzConfig,
    req: Request
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
        this.evaluateCondition(condition, user, req)
      );
    }

    return true;
  }

  private evaluateCondition(condition: PermissionCondition, user: UserContext, req: Request): boolean {
    const { attribute, operator, caseSensitive = true, negate = false } = condition;
    let { value } = condition;
    let userValue = this.getNestedValue(user, attribute);

    // Handle case sensitivity
    if (typeof userValue === 'string' && !caseSensitive) {
      userValue = userValue.toLowerCase();
    }
    if (typeof value === 'string' && !caseSensitive) {
      value = value.toLowerCase();
    }

    let result: boolean;

    switch (operator) {
      case 'eq': result = userValue === value; break;
      case 'ne': result = userValue !== value; break;
      case 'gt': result = userValue > value; break;
      case 'lt': result = userValue < value; break;
      case 'gte': result = userValue >= value; break;
      case 'lte': result = userValue <= value; break;
      case 'in': result = Array.isArray(value) && value.includes(userValue); break;
      case 'nin': result = Array.isArray(value) && !value.includes(userValue); break;
      case 'contains': result = String(userValue).includes(String(value)); break;
      case 'regex': result = new RegExp(value).test(String(userValue)); break;
      case 'startsWith': result = String(userValue).startsWith(String(value)); break;
      case 'endsWith': result = String(userValue).endsWith(String(value)); break;
      case 'between': 
        result = Array.isArray(value) && value.length === 2 && 
                userValue >= value[0] && userValue <= value[1]; 
        break;
      case 'exists': result = userValue !== undefined && userValue !== null; break;
      default: return false;
    }

    return negate ? !result : result;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private generatePermissionCacheKey(userId: string, permissions: Permission[]): string {
    const crypto = require('crypto');
    const permHash = crypto.createHash('md5')
      .update(JSON.stringify(permissions))
      .digest('hex');
    return `perm:${userId}:${permHash}`;
  }

  private checkPermissionCache(cacheKey: string): boolean | undefined {
    const cached = this.cache.get(cacheKey);
    if (!cached) return undefined;

    if (Date.now() - cached.timestamp > this.config.cacheExpirationTime) {
      this.cache.delete(cacheKey);
      return undefined;
    }

    return cached.result;
  }

  private setPermissionCache(cacheKey: string, result: boolean, expirationTime: number): void {
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    // Set automatic cleanup
    setTimeout(() => {
      this.cache.delete(cacheKey);
    }, expirationTime);
  }

  private async calculateRiskScore(user: UserContext, req: Request): Promise<number> {
    let riskScore = 0;

    // Account age factor
    const accountAge = Date.now() - new Date(user.attributes?.accountCreated || Date.now()).getTime();
    if (accountAge < 7 * 24 * 60 * 60 * 1000) { // Less than 7 days
      riskScore += 20;
    }

    // MFA factor
    if (!user.securityContext?.mfaEnabled) {
      riskScore += 30;
    }

    // Failed login attempts
    const failedLoginAttempts = user.securityContext?.failedLoginAttempts ?? 0;
    if (failedLoginAttempts > 0) {
      riskScore += failedLoginAttempts * 10;
    }

    // Session age
    if (user.sessionInfo?.lastActivity) {
      const sessionAge = Date.now() - user.sessionInfo.lastActivity.getTime();
      if (sessionAge > 2 * 60 * 60 * 1000) { // More than 2 hours
        riskScore += 10;
      }
    }

    // Device fingerprinting
    const deviceFingerprint = this.getDeviceFingerprint(req);
    const knownDevice = this.deviceFingerprints.has(deviceFingerprint);
    if (!knownDevice) {
      riskScore += 25;
    }

    // IP reputation (mock implementation)
    const clientIP = this.getClientIP(req);
    if (this.isSuspiciousIP(clientIP)) {
      riskScore += 40;
    }

    return Math.min(riskScore, 100); // Cap at 100
  }

  private getDeviceFingerprint(req: Request): string {
    const crypto = require('crypto');
    const userAgent = req.get('User-Agent') || '';
    const acceptLanguage = req.get('Accept-Language') || '';
    const acceptEncoding = req.get('Accept-Encoding') || '';

    return crypto.createHash('md5')
      .update(userAgent + acceptLanguage + acceptEncoding)
      .digest('hex');
  }

  private getClientIP(req: Request): string {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           (req.connection as any)?.socket?.remoteAddress ||
           'unknown';
  }

  private isSuspiciousIP(ip: string): boolean {
    // Mock implementation - in real app, use IP reputation services
    const suspiciousPatterns = ['10.0.0.', '192.168.', '172.16.'];
    return suspiciousPatterns.some(pattern => ip.startsWith(pattern));
  }

  private logAuthorizationEvent(
    eventType: AuditEvent['eventType'],
    user: UserContext,
    req: Request,
    details: Record<string, any>
  ): void {
    if (!this.config.enableAuditLogging) return;

    const auditEvent: AuditEvent = {
      timestamp: new Date(),
      eventType,
      userId: user.userId,
      sessionId: user.sessionInfo?.sessionId || 'unknown',
      resource: req.originalUrl || req.url || 'unknown',
      action: req.method || 'unknown',
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent') || 'unknown',
      riskScore: details.riskScore || 0,
      details,
      metadata: {
        policyVersion: '2.0.0',
        decisionTime: details.decisionTime || 0,
        cacheHit: details.cacheHit || false
      }
    };

    logger.info('Authorization event', auditEvent);

    // In a real implementation, this would be stored in an audit database
    // For now, we'll just log it
  }
}

// =====================================================================================
// AUTHORIZATION MIDDLEWARE FACTORY
// =====================================================================================

/**
 * Authorization Middleware Factory
 * Creates pre-configured authorization middleware instances
 */
export class AuthorizationMiddlewareFactory {
  private static instance: AuthorizationMiddleware;

  static initialize(config: Partial<AuthzConfig> = {}): void {
    this.instance = new AuthorizationMiddleware(config);
  }

  static getInstance(): AuthorizationMiddleware {
    if (!this.instance) {
      this.instance = new AuthorizationMiddleware();
    }
    return this.instance;
  }

  static createRoleAuth(roles: string | string[], config?: Partial<AuthzConfig>) {
    const middleware = this.getInstance();
    return middleware.authorizeRoles(roles, config);
  }

  static createPermissionAuth(permissions: Permission | Permission[], config?: Partial<AuthzConfig>) {
    const middleware = this.getInstance();
    return middleware.authorizePermissions(permissions, config);
  }

  static createResourceAuth(
    resourceType: string,
    resourceIdParam: string = 'id',
    config?: Partial<AuthzConfig>
  ) {
    const middleware = this.getInstance();
    return middleware.authorizeResourceOwnership(resourceType, resourceIdParam, config);
  }

  static createAdminAuth(config?: Partial<AuthzConfig>) {
    const middleware = this.getInstance();
    return middleware.authorizeAdmin(config);
  }

  static createSuperUserAuth(config?: Partial<AuthzConfig>) {
    const middleware = this.getInstance();
    return middleware.authorizeSuperUser(config);
  }

  static createEmergencyAuth(config?: Partial<AuthzConfig>) {
    const middleware = this.getInstance();
    return middleware.authorizeEmergency(config);
  }

  static createRiskBasedAuth(config?: Partial<AuthzConfig>) {
    const middleware = this.getInstance();
    return middleware.authorizeWithRiskAssessment(config);
  }

  static createCombinedAuth(
    roles: string[] = [],
    permissions: Permission[] = [],
    resourceType?: string,
    config?: Partial<AuthzConfig>
  ) {
    const middleware = this.getInstance();
    const middlewares: any[] = [];

    if (roles.length > 0) {
      middlewares.push(middleware.authorizeRoles(roles, config));
    }

    if (permissions.length > 0) {
      middlewares.push(middleware.authorizePermissions(permissions, config));
    }

    if (resourceType) {
      middlewares.push(middleware.authorizeResourceOwnership(resourceType, 'id', config));
    }

    return middlewares;
  }

  static createSecureAuth(config?: Partial<AuthzConfig>) {
    const middleware = this.getInstance();
    return [
      middleware.authorizeWithRiskAssessment(config),
      middleware.authorizeRoles(['user', 'admin'], config)
    ];
  }
}

// =====================================================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// =====================================================================================

// Re-export for backward compatibility with existing code
export const authorize = AuthorizationMiddlewareFactory.createRoleAuth;
export const authorizePermissions = AuthorizationMiddlewareFactory.createPermissionAuth;
export const authorizeResourceOwnership = AuthorizationMiddlewareFactory.createResourceAuth;
export const authorizeAdmin = AuthorizationMiddlewareFactory.createAdminAuth;
export const authorizeSuperUser = AuthorizationMiddlewareFactory.createSuperUserAuth;
export const AuthzFactory = AuthorizationMiddlewareFactory;
export type { Permission as AuthzPermission, PermissionCondition as AuthzPermissionCondition, Role as AuthzRole, UserContext as AuthzUserContext, ResourceContext as AuthzResourceContext };
export { DEFAULT_AUTHZ_CONFIG as AUTHZ_DEFAULT_CONFIG };
