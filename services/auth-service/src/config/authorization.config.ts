/**
 * Authorization Configuration Management
 * Enterprise-grade configuration system for authorization policies, roles, and permissions
 * 
 * @author Maysar Express Security Team
 * @version 2.0.0
 */

import { AuthzConfig, Permission, PermissionCondition, Role, UserContext } from '../api/middleware/authorization.middleware';
import { logger } from '../infrastructure/services/logger.service';

// =====================================================================================
// CONFIGURATION INTERFACES
// =====================================================================================

/**
 * Authorization Policy Configuration
 */
export interface AuthorizationPolicy {
  id: string;
  name: string;
  description?: string;
  version: string;
  enabled: boolean;
  priority: number;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  metadata?: {
    createdBy: string;
    createdAt: Date;
    lastModified: Date;
    tags: string[];
  };
}

/**
 * Policy Condition for dynamic authorization rules
 */
export interface PolicyCondition {
  type: 'time' | 'location' | 'device' | 'risk' | 'custom';
  operator: 'and' | 'or' | 'not';
  rules: ConditionRule[];
  metadata?: {
    description?: string;
    weight?: number;
  };
}

/**
 * Condition Rule for specific policy conditions
 */
export interface ConditionRule {
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'regex' | 'startsWith' | 'endsWith' | 'between' | 'exists';
  value: any;
  caseSensitive?: boolean;
  negate?: boolean;
  metadata?: {
    description?: string;
    weight?: number;
  };
}

/**
 * Policy Action for authorization decisions
 */
export interface PolicyAction {
  type: 'allow' | 'deny' | 'challenge' | 'audit' | 'redirect';
  target: string[];
  parameters?: Record<string, any>;
  metadata?: {
    description?: string;
    priority?: number;
  };
}

/**
 * Role Configuration with inheritance and metadata
 */
export interface RoleConfiguration {
  name: string;
  description?: string;
  permissions: Permission[];
  inherits?: string[];
  metadata?: {
    level?: number;
    department?: string;
    location?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    active?: boolean;
    expirationDate?: Date;
  };
  policies?: string[]; // Policy IDs that apply to this role
}

/**
 * Permission Configuration with advanced metadata
 */
export interface PermissionConfiguration {
  resource: string;
  action: string;
  scope?: string;
  conditions?: PermissionCondition[];
  metadata?: {
    description?: string;
    riskLevel?: 'low' | 'medium' | 'high' | 'critical';
    auditRequired?: boolean;
    expirationDate?: Date;
    businessJustification?: string;
  };
}

/**
 * Environment-specific configuration overrides
 */
export interface EnvironmentConfig {
  environment: 'development' | 'staging' | 'production' | 'test';
  overrides: Partial<AuthzConfig>;
  roles: RoleConfiguration[];
  permissions: PermissionConfiguration[];
  policies: AuthorizationPolicy[];
  metadata?: {
    lastUpdated: Date;
    version: string;
    checksum?: string;
  };
}

// =====================================================================================
// DEFAULT CONFIGURATIONS
// =====================================================================================

/**
 * Default Role Configurations
 */
export const DEFAULT_ROLES: RoleConfiguration[] = [
  {
    name: 'superuser',
    description: 'System superuser with all permissions',
    permissions: [
      { resource: '*', action: '*', scope: '*' }
    ],
    inherits: [],
    metadata: {
      level: 5,
      riskLevel: 'critical',
      active: true
    }
  },
  {
    name: 'admin',
    description: 'Administrator with full system access',
    permissions: [
      { resource: 'users', action: '*', scope: 'organization' },
      { resource: 'products', action: '*', scope: 'organization' },
      { resource: 'orders', action: '*', scope: 'organization' },
      { resource: 'suppliers', action: '*', scope: 'organization' },
      { resource: 'enablers', action: '*', scope: 'organization' },
      { resource: 'system', action: 'manage', scope: 'global' }
    ],
    inherits: [],
    metadata: {
      level: 4,
      riskLevel: 'high',
      active: true
    }
  },
  {
    name: 'buyer',
    description: 'Customer with purchasing capabilities',
    permissions: [
      { resource: 'products', action: 'view', scope: 'public' },
      { resource: 'orders', action: '*', scope: 'own' },
      { resource: 'profile', action: '*', scope: 'own' },
      { resource: 'suppliers', action: 'view', scope: 'public' },
      { resource: 'enablers', action: 'view', scope: 'public' }
    ],
    inherits: [],
    metadata: {
      level: 3,
      riskLevel: 'medium',
      active: true
    }
  },
  {
    name: 'seller',
    description: 'Product seller with access to own products',
    permissions: [
      { resource: 'products', action: '*', scope: 'own' },
      { resource: 'orders', action: 'view', scope: 'own' },
      { resource: 'inventory', action: '*', scope: 'own' },
      { resource: 'profile', action: '*', scope: 'own' }
    ],
    inherits: [],
    metadata: {
      level: 2,
      riskLevel: 'low',
      active: true
    }
  },
  {
    name: 'supplier',
    description: 'Supplier with access to supply chain resources',
    permissions: [
      { resource: 'products', action: 'view', scope: 'public' },
      { resource: 'orders', action: 'view', scope: 'supplier' },
      { resource: 'inventory', action: '*', scope: 'own' },
      { resource: 'suppliers', action: 'view', scope: 'own' },
      { resource: 'profile', action: '*', scope: 'own' }
    ],
    inherits: [],
    metadata: {
      level: 2,
      riskLevel: 'low',
      active: true
    }
  },
  {
    name: 'enabler',
    description: 'Service enabler with access to enablement resources',
    permissions: [
      { resource: 'products', action: 'view', scope: 'public' },
      { resource: 'orders', action: 'view', scope: 'enabler' },
      { resource: 'enablers', action: '*', scope: 'own' },
      { resource: 'profile', action: '*', scope: 'own' }
    ],
    inherits: [],
    metadata: {
      level: 2,
      riskLevel: 'low',
      active: true
    }
  },
  {
    name: 'guest',
    description: 'Guest user with limited access',
    permissions: [
      { resource: 'products', action: 'view', scope: 'public' },
      { resource: 'categories', action: 'view', scope: 'public' },
      { resource: 'suppliers', action: 'view', scope: 'public' },
      { resource: 'enablers', action: 'view', scope: 'public' }
    ],
    inherits: [],
    metadata: {
      level: 0,
      riskLevel: 'low',
      active: true
    }
  }
];

/**
 * Default Permission Configurations
 */
export const DEFAULT_PERMISSIONS: PermissionConfiguration[] = [
  // Product permissions
  {
    resource: 'products',
    action: 'create',
    scope: 'own',
    conditions: [
      {
        attribute: 'user.accountStatus',
        operator: 'eq',
        value: 'active'
      },
      {
        attribute: 'user.accountAge',
        operator: 'gte',
        value: 7 // 7 days
      }
    ],
    metadata: {
      description: 'Create new products',
      riskLevel: 'medium',
      auditRequired: true
    }
  },
  {
    resource: 'products',
    action: 'update',
    scope: 'own',
    conditions: [
      {
        attribute: 'user.accountStatus',
        operator: 'eq',
        value: 'active'
      }
    ],
    metadata: {
      description: 'Update own products',
      riskLevel: 'medium',
      auditRequired: true
    }
  },
  {
    resource: 'products',
    action: 'delete',
    scope: 'own',
    conditions: [
      {
        attribute: 'user.accountStatus',
        operator: 'eq',
        value: 'active'
      },
      {
        attribute: 'user.role',
        operator: 'in',
        value: ['admin', 'moderator']
      }
    ],
    metadata: {
      description: 'Delete products (requires elevated role)',
      riskLevel: 'high',
      auditRequired: true
    }
  },
  // Order permissions
  {
    resource: 'orders',
    action: 'view',
    scope: 'own',
    conditions: [
      {
        attribute: 'user.accountStatus',
        operator: 'eq',
        value: 'active'
      }
    ],
    metadata: {
      description: 'View own orders',
      riskLevel: 'low',
      auditRequired: false
    }
  },
  {
    resource: 'orders',
    action: 'cancel',
    scope: 'own',
    conditions: [
      {
        attribute: 'user.accountStatus',
        operator: 'eq',
        value: 'active'
      },
      {
        attribute: 'order.status',
        operator: 'in',
        value: ['pending', 'processing']
      }
    ],
    metadata: {
      description: 'Cancel own orders',
      riskLevel: 'medium',
      auditRequired: true
    }
  },
  // System permissions
  {
    resource: 'system',
    action: 'manage',
    scope: 'global',
    conditions: [
      {
        attribute: 'user.role',
        operator: 'in',
        value: ['admin', 'superuser']
      },
      {
        attribute: 'user.mfaEnabled',
        operator: 'eq',
        value: true
      },
      {
        attribute: 'session.riskScore',
        operator: 'lt',
        value: 50
      }
    ],
    metadata: {
      description: 'System management (high security required)',
      riskLevel: 'critical',
      auditRequired: true,
      businessJustification: 'System administration requires MFA and low risk score'
    }
  }
];

/**
 * Default Policy Configurations
 */
export const DEFAULT_POLICIES: AuthorizationPolicy[] = [
  {
    id: 'business-hours-access',
    name: 'Business Hours Access Control',
    description: 'Restrict admin access to business hours only',
    version: '1.0.0',
    enabled: true,
    priority: 100,
    conditions: [
      {
        type: 'time',
        operator: 'and',
        rules: [
          {
            attribute: 'time.dayOfWeek',
            operator: 'in',
            value: [1, 2, 3, 4, 5] // Monday to Friday
          },
          {
            attribute: 'time.hourOfDay',
            operator: 'between',
            value: [9, 17] // 9 AM to 5 PM
          }
        ]
      }
    ],
    actions: [
      {
        type: 'allow',
        target: ['admin', 'moderator'],
        parameters: {
          requireMFA: true
        }
      },
      {
        type: 'deny',
        target: ['admin', 'moderator'],
        parameters: {
          message: 'Admin access restricted to business hours'
        }
      }
    ],
    metadata: {
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date(),
      tags: ['time-based', 'admin-only']
    }
  },
  {
    id: 'high-risk-operations',
    name: 'High Risk Operation Protection',
    description: 'Additional security for high-risk operations',
    version: '1.0.0',
    enabled: true,
    priority: 200,
    conditions: [
      {
        type: 'risk',
        operator: 'or',
        rules: [
          {
            attribute: 'session.riskScore',
            operator: 'gte',
            value: 70
          },
          {
            attribute: 'operation.riskLevel',
            operator: 'in',
            value: ['high', 'critical']
          }
        ]
      }
    ],
    actions: [
      {
        type: 'challenge',
        target: ['*'],
        parameters: {
          challengeType: 'mfa',
          message: 'Additional authentication required for high-risk operation'
        }
      }
    ],
    metadata: {
      createdBy: 'system',
      createdAt: new Date(),
      lastModified: new Date(),
      tags: ['risk-based', 'security']
    }
  },
  {
    id: 'geographic-restrictions',
    name: 'Geographic Access Restrictions',
    description: 'Block access from high-risk countries',
    version: '1.0.0',
    enabled: true,
    priority: 300,
    conditions: [
      {
        type: 'location',
        operator: 'or',
        rules: [
          {
            attribute: 'geo.country',
            operator: 'in',
            value: ['CN', 'RU', 'KP', 'IR'] // High-risk countries
          },
          {
            attribute: 'geo.velocity',
            operator: 'gt',
            value: 800 // Impossible travel speed
          }
        ]
      }
    ],
    actions: [
      {
        type: 'deny',
        target: ['*'],
        parameters: {
          message: 'Access denied from restricted location',
          logSecurityEvent: true
        }
      }
    ],
    metadata: {
      createdBy: 'security-team',
      createdAt: new Date(),
      lastModified: new Date(),
      tags: ['geofencing', 'security']
    }
  }
];

// =====================================================================================
// CONFIGURATION MANAGER CLASS
// =====================================================================================

/**
 * Authorization Configuration Manager
 * Manages dynamic configuration loading, validation, and updates
 */
export class AuthorizationConfigManager {
  private static instance: AuthorizationConfigManager;
  private config: AuthzConfig;
  private roles: Map<string, RoleConfiguration> = new Map();
  private permissions: Map<string, PermissionConfiguration> = new Map();
  private policies: Map<string, AuthorizationPolicy> = new Map();
  private environment: string;
  private lastUpdated: Date = new Date();

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.config = this.loadEnvironmentConfig();
    this.loadDefaultConfigurations();
  }

  public static getInstance(): AuthorizationConfigManager {
    if (!this.instance) {
      this.instance = new AuthorizationConfigManager();
    }
    return this.instance;
  }

  /**
   * Load environment-specific configuration
   */
  private loadEnvironmentConfig(): AuthzConfig {
    const baseConfig = this.getDefaultConfig();
    const envOverrides = this.getEnvironmentOverrides();
    
    return { ...baseConfig, ...envOverrides };
  }

  /**
   * Get default authorization configuration
   */
  private getDefaultConfig(): AuthzConfig {
    return {
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
        velocityThreshold: 800 // km/h
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
  }

  /**
   * Get environment-specific overrides
   */
  private getEnvironmentOverrides(): Partial<AuthzConfig> {
    switch (this.environment) {
      case 'development':
        return {
          enableAuditLogging: false,
          cacheExpirationTime: 1 * 60 * 1000, // 1 minute for dev
          maxFailedAttempts: 10,
          enableEmergencyMode: true,
          logLevel: 'debug'
        };

      case 'staging':
        return {
          enableAuditLogging: true,
          cacheExpirationTime: 2 * 60 * 1000, // 2 minutes for staging
          maxFailedAttempts: 5,
          enableEmergencyMode: false,
          logLevel: 'info'
        };

      case 'production':
        return {
          enableAuditLogging: true,
          cacheExpirationTime: 10 * 60 * 1000, // 10 minutes for production
          maxFailedAttempts: 3,
          enableEmergencyMode: false,
          requireMFAForCritical: true,
          enableIPWhitelist: true,
          enableGeofencing: true,
          logLevel: 'warn'
        };

      case 'test':
        return {
          enableAuditLogging: false,
          cacheExpirationTime: 100, // Very short for tests
          maxFailedAttempts: 999, // Don't lock out in tests
          enableEmergencyMode: true,
          logLevel: 'error'
        };

      default:
        return {};
    }
  }

  /**
   * Load default configurations
   */
  private loadDefaultConfigurations(): void {
    // Load default roles
    DEFAULT_ROLES.forEach(role => {
      this.roles.set(role.name, role);
    });

    // Load default permissions
    DEFAULT_PERMISSIONS.forEach(permission => {
      const key = `${permission.resource}:${permission.action}:${permission.scope || '*'}`;
      this.permissions.set(key, permission);
    });

    // Load default policies
    DEFAULT_POLICIES.forEach(policy => {
      this.policies.set(policy.id, policy);
    });

    logger.info('Authorization configurations loaded', {
      environment: this.environment,
      rolesCount: this.roles.size,
      permissionsCount: this.permissions.size,
      policiesCount: this.policies.size
    });
  }

  // =====================================================================================
  // PUBLIC API METHODS
  // =====================================================================================

  /**
   * Get current authorization configuration
   */
  public getConfig(): AuthzConfig {
    return { ...this.config };
  }

  /**
   * Get role configuration by name
   */
  public getRole(name: string): RoleConfiguration | undefined {
    return this.roles.get(name);
  }

  /**
   * Get all role configurations
   */
  public getAllRoles(): RoleConfiguration[] {
    return Array.from(this.roles.values());
  }

  /**
   * Get permission configuration by resource and action
   */
  public getPermission(resource: string, action: string, scope?: string): PermissionConfiguration | undefined {
    const key = `${resource}:${action}:${scope || '*'}`;
    return this.permissions.get(key);
  }

  /**
   * Get all permission configurations
   */
  public getAllPermissions(): PermissionConfiguration[] {
    return Array.from(this.permissions.values());
  }

  /**
   * Get policy by ID
   */
  public getPolicy(id: string): AuthorizationPolicy | undefined {
    return this.policies.get(id);
  }

  /**
   * Get all policies
   */
  public getAllPolicies(): AuthorizationPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Add or update a role configuration
   */
  public updateRole(role: RoleConfiguration): void {
    this.roles.set(role.name, role);
    this.lastUpdated = new Date();
    logger.info('Role configuration updated', { role: role.name, lastUpdated: this.lastUpdated });
  }

  /**
   * Add or update a permission configuration
   */
  public updatePermission(permission: PermissionConfiguration): void {
    const key = `${permission.resource}:${permission.action}:${permission.scope || '*'}`;
    this.permissions.set(key, permission);
    this.lastUpdated = new Date();
    logger.info('Permission configuration updated', { 
      resource: permission.resource, 
      action: permission.action,
      lastUpdated: this.lastUpdated 
    });
  }

  /**
   * Add or update a policy
   */
  public updatePolicy(policy: AuthorizationPolicy): void {
    this.policies.set(policy.id, policy);
    this.lastUpdated = new Date();
    logger.info('Policy configuration updated', { 
      policy: policy.id, 
      lastUpdated: this.lastUpdated 
    });
  }

  /**
   * Remove a role configuration
   */
  public removeRole(name: string): boolean {
    const removed = this.roles.delete(name);
    if (removed) {
      this.lastUpdated = new Date();
      logger.info('Role configuration removed', { role: name, lastUpdated: this.lastUpdated });
    }
    return removed;
  }

  /**
   * Remove a permission configuration
   */
  public removePermission(resource: string, action: string, scope?: string): boolean {
    const key = `${resource}:${action}:${scope || '*'}`;
    const removed = this.permissions.delete(key);
    if (removed) {
      this.lastUpdated = new Date();
      logger.info('Permission configuration removed', { 
        resource, 
        action, 
        scope,
        lastUpdated: this.lastUpdated 
      });
    }
    return removed;
  }

  /**
   * Remove a policy
   */
  public removePolicy(id: string): boolean {
    const removed = this.policies.delete(id);
    if (removed) {
      this.lastUpdated = new Date();
      logger.info('Policy configuration removed', { policy: id, lastUpdated: this.lastUpdated });
    }
    return removed;
  }

  /**
   * Validate configuration consistency
   */
  public validateConfiguration(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate roles
    this.roles.forEach(role => {
      if (!role.permissions || role.permissions.length === 0) {
        warnings.push(`Role '${role.name}' has no permissions`);
      }

      // Check for circular inheritance
      if (role.inherits && this.hasCircularInheritance(role.name, new Set())) {
        errors.push(`Circular inheritance detected in role '${role.name}'`);
      }
    });

    // Validate permissions
    this.permissions.forEach(permission => {
      if (!permission.resource || !permission.action) {
        errors.push(`Invalid permission: missing resource or action`);
      }
    });

    // Validate policies
    this.policies.forEach(policy => {
      if (!policy.conditions || policy.conditions.length === 0) {
        warnings.push(`Policy '${policy.id}' has no conditions`);
      }

      if (!policy.actions || policy.actions.length === 0) {
        errors.push(`Policy '${policy.id}' has no actions`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      lastValidated: new Date()
    };
  }

  /**
   * Get configuration statistics
   */
  public getStatistics(): ConfigStatistics {
    return {
      environment: this.environment,
      rolesCount: this.roles.size,
      permissionsCount: this.permissions.size,
      policiesCount: this.policies.size,
      lastUpdated: this.lastUpdated,
      totalPermissions: this.calculateTotalPermissions(),
      averagePermissionsPerRole: this.calculateAveragePermissionsPerRole()
    };
  }

  /**
   * Export configuration for backup or migration
   */
  public exportConfiguration(): EnvironmentConfig {
    return {
      environment: this.environment as any,
      overrides: this.config,
      roles: this.getAllRoles(),
      permissions: this.getAllPermissions(),
      policies: this.getAllPolicies(),
      metadata: {
        lastUpdated: this.lastUpdated,
        version: '2.0.0',
        checksum: this.calculateChecksum()
      }
    };
  }

  /**
   * Import configuration from backup or migration
   */
  public importConfiguration(config: EnvironmentConfig): void {
    if (config.environment !== this.environment) {
      logger.warn('Importing configuration for different environment', {
        source: config.environment,
        target: this.environment
      });
    }

    // Validate checksum if provided
    if (config.metadata?.checksum && !this.validateChecksum(config)) {
      throw new Error('Configuration checksum validation failed');
    }

    // Import roles
    config.roles.forEach(role => this.updateRole(role));

    // Import permissions
    config.permissions.forEach(permission => this.updatePermission(permission));

    // Import policies
    config.policies.forEach(policy => this.updatePolicy(policy));

    logger.info('Configuration imported successfully', {
      rolesCount: config.roles.length,
      permissionsCount: config.permissions.length,
      policiesCount: config.policies.length
    });
  }

  // =====================================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================================

  private hasCircularInheritance(roleName: string, visited: Set<string>): boolean {
    if (visited.has(roleName)) {
      return true;
    }

    const role = this.roles.get(roleName);
    if (!role || !role.inherits) {
      return false;
    }

    visited.add(roleName);

    for (const parentRole of role.inherits) {
      if (this.hasCircularInheritance(parentRole, new Set(visited))) {
        return true;
      }
    }

    return false;
  }

  private calculateTotalPermissions(): number {
    return Array.from(this.roles.values())
      .reduce((total, role) => total + (role.permissions?.length || 0), 0);
  }

  private calculateAveragePermissionsPerRole(): number {
    const roles = Array.from(this.roles.values());
    if (roles.length === 0) return 0;

    const totalPermissions = this.calculateTotalPermissions();
    return totalPermissions / roles.length;
  }

  private calculateChecksum(): string {
    const crypto = require('crypto');
    const configString = JSON.stringify({
      roles: this.getAllRoles(),
      permissions: this.getAllPermissions(),
      policies: this.getAllPolicies()
    });

    return crypto.createHash('sha256').update(configString).digest('hex');
  }

  private validateChecksum(config: EnvironmentConfig): boolean {
    const currentChecksum = this.calculateChecksum();
    return config.metadata?.checksum === currentChecksum;
  }
}

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

/**
 * Validation result for configuration validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  lastValidated: Date;
}

/**
 * Configuration statistics
 */
export interface ConfigStatistics {
  environment: string;
  rolesCount: number;
  permissionsCount: number;
  policiesCount: number;
  lastUpdated: Date;
  totalPermissions: number;
  averagePermissionsPerRole: number;
}

// =====================================================================================
// EXPORTS
// =====================================================================================

export const authzConfigManager = AuthorizationConfigManager.getInstance();
