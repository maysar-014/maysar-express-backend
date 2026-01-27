/**
 * Authentication Middleware Index
 * Exports all authentication middleware for easy import
 */

export { AuthenticationMiddleware, AuthenticationMiddlewareFactory } from './authentication.middleware';
export type { AuthMiddlewareConfig, UserContext, ServiceContext, AuthResult } from './authentication.middleware';

export { AuthorizationMiddleware, AuthorizationMiddlewareFactory } from './authorization.middleware';
export type { 
  Permission, 
  PermissionCondition, 
  Role, 
  UserContext as AuthzUserContext, 
  ResourceContext, 
  AuthzConfig, 
  AuthzResult,
  AuditEvent
} from './authorization.middleware';
export { DEFAULT_AUTHZ_CONFIG } from './authorization.middleware';

export { requestLoggingMiddleware } from '../../infrastructure/services/logger.service';
export { logger } from '../../infrastructure/services/logger.service';
