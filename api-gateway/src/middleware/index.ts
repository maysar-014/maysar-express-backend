/**
 * Middleware Index
 * 
 * Exports all middleware components for the Maysar API Gateway
 */

// Core middleware
export { authenticationMiddleware, authenticate, optionalAuthenticate, requireScopes, requireRoles, publicOrAuth } from './authentication.middleware';
export { authorizationMiddleware, authorize, requireAdmin, requireAuthenticated, requireSeller, requireCourier, requireEnabler, requireSupplier, allowSelfOrAdmin } from './authorization.middleware';
export { rateLimitingMiddleware, rateLimit, strictRateLimit, moderateRateLimit, generousRateLimit } from './rate-limiting.middleware';
export { requestLoggerMiddleware, requestLogger } from './request-logger.middleware';
export { responseTransformerMiddleware, responseTransformer } from './response-transformer.middleware';
export { validationMiddleware, validate } from './validation.middleware';
export { authDelegationMiddleware, authenticate as authDelegation } from './auth-delegation.middleware';

// Security middleware
export { compressionMiddleware } from './compression.middleware';
export { timeoutMiddleware } from './timeout.middleware';
export { securityMiddleware } from './security.middleware';
export { errorHandlerMiddleware } from './error-handler.middleware';


// Export middleware types
export * from '../types/middleware';