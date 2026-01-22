/**
 * API Middleware Index
 * Central export point for all middleware implementations
 * Provides security hardening, performance optimization, monitoring integration, and compliance enforcement
 *
 * Usage:
 * ```typescript
 * import {
 *   createValidationMiddleware,
 *   authenticate,
 *   authorize,
 *   createRateLimit,
 *   createCORS,
 *   errorHandler
 * } from './middleware';
 *
 * // Create middleware stack
 * const middleware = [
 *   createCORS(),
 *   createRateLimit(),
 *   createValidationMiddleware(),
 *   authenticate(),
 *   authorize(['admin']),
 *   errorHandler()
 * ];
 * ```
 */

// =====================================================================================
// INDIVIDUAL MIDDLEWARE EXPORTS
// =====================================================================================

// Validation Middleware
export * from './validation.middleware';

// Authentication Middleware
export * from './authentication.middleware';

// Authorization Middleware
export * from './authorization.middleware';

// Error Handling Middleware
export * from './error.middleware';

// Rate Limiting Middleware
export * from './rate-limit.middleware';

// CORS Middleware
export * from './cors.middleware';

// =====================================================================================
// USAGE EXAMPLES
// =====================================================================================

/**
 * Example: Complete Security Middleware Stack
 * ```typescript
 * import {
 *   createCORS,
 *   createRateLimit,
 *   createValidationMiddleware,
 *   authenticate,
 *   authorize,
 *   errorHandler
 * } from './middleware';
 *
 * const securityMiddleware = [
 *   createCORS({ origin: ['https://myapp.com'] }),
 *   createRateLimit({ maxRequests: 100, windowMs: 900000 }),
 *   createValidationMiddleware({ enableSanitization: true }),
 *   authenticate(),
 *   authorize(['user', 'admin']),
 *   errorHandler({ enableDetailedErrors: false })
 * ];
 * ```
 */

/**
 * Example: Admin-Only Middleware Stack
 * ```typescript
 * import { authenticate, authorizeAdmin, createRateLimit } from './middleware';
 *
 * const adminMiddleware = [
 *   createRateLimit({ maxRequests: 10, windowMs: 60000 }), // Strict limits
 *   authenticate(),
 *   authorizeAdmin()
 * ];
 * ```
 */

/**
 * Example: Public API Middleware Stack
 * ```typescript
 * import { createCORS, createRateLimit, errorHandler } from './middleware';
 *
 * const publicMiddleware = [
 *   createCORS({ origin: true }), // Allow all origins
 *   createRateLimit({ maxRequests: 1000, windowMs: 3600000 }), // Lenient limits
 *   errorHandler()
 * ];
 * ```
 */
