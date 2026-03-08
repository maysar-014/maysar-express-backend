/**
 * Security Middleware
 * Provides security-related middleware functions for request validation and protection
 */

import { Request, Response, NextFunction } from 'express';

export interface SecurityConfig {
  enableRateLimit: boolean;
  enableCsrf: boolean;
  enableXss: boolean;
  enableSqlInjection: boolean;
}

export class SecurityMiddleware {
  constructor(config?: Partial<SecurityConfig>) {
    this.config = {
      enableRateLimit: true,
      enableCsrf: true,
      enableXss: true,
      enableSqlInjection: true,
      ...config
    };
  }

  private readonly config: SecurityConfig;

  /**
   * Rate limiting middleware
   */
  rateLimit(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
    const requests = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableRateLimit) {
        return next();
      }

      const clientId = req.ip || 'unknown';
      const now = Date.now();
      const windowStart = now - windowMs;

      const clientData = requests.get(clientId);
      if (!clientData || clientData.resetTime < windowStart) {
        requests.set(clientId, { count: 1, resetTime: now + windowMs });
        return next();
      }

      if (clientData.count >= maxRequests) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded'
        });
      }

      clientData.count++;
      next();
    };
  }

  /**
   * CSRF protection middleware
   */
  csrfProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableCsrf) {
        return next();
      }

      // Simple CSRF token validation
      const token = req.headers['x-csrf-token'] || req.body._csrf;
      if (!token) {
        return res.status(403).json({
          error: 'CSRF token missing'
        });
      }

      // In a real implementation, validate the token
      next();
    };
  }

  /**
   * XSS protection middleware
   */
  xssProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableXss) {
        return next();
      }

      // Set XSS protection headers
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');

      next();
    };
  }

  /**
   * SQL injection protection middleware
   */
  sqlInjectionProtection() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enableSqlInjection) {
        return next();
      }

      // Basic SQL injection pattern detection
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b)/i,
        /(UNION|OR|AND)\s+\d+\s*=\s*\d+/i,
        /['"]\s*(OR|AND)\s*['"]\s*=\s*['"]?/i
      ];

      const checkForSqlInjection = (value: any): boolean => {
        if (typeof value === 'string') {
          return sqlPatterns.some(pattern => pattern.test(value));
        }
        if (typeof value === 'object' && value !== null) {
          return Object.values(value).some(checkForSqlInjection);
        }
        return false;
      };

      if (checkForSqlInjection(req.body) || checkForSqlInjection(req.query)) {
        return res.status(400).json({
          error: 'Potential SQL injection detected'
        });
      }

      next();
    };
  }

  /**
   * Combined security middleware
   */
  secure() {
    return [
      this.xssProtection(),
      this.csrfProtection(),
      this.sqlInjectionProtection(),
      this.rateLimit()
    ];
  }

  sanitizeInput(input: string): string {
    return input
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.includes('..');
  }

  validatePhoneNumber(phone: string): boolean {
    const normalized = phone.replace(/[\s()-]/g, '');
    return /^\+?\d{10,15}$/.test(normalized);
  }

  validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:', 'ftp:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  containsSqlInjection(input: string): boolean {
    const patterns = [
      /(\bor\b|\band\b)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
      /\bunion\s+select\b/i,
      /\bdrop\s+table\b/i,
      /\binsert\s+into\b/i,
      /;\s*--/
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  containsXss(input: string): boolean {
    const patterns = [
      /<script[\s\S]*?>/i,
      /\bon\w+\s*=/i,
      /javascript:/i,
      /<iframe/i,
      /<svg/i
    ];
    return patterns.some(pattern => pattern.test(input));
  }

  validateJwtToken(token: string): boolean {
    return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(token);
  }

  validateApiKey(apiKey: string): boolean {
    return /^ak_live_[a-f0-9]{32}$/i.test(apiKey);
  }

  validateSessionToken(sessionToken: string): boolean {
    return /^sess_[a-f0-9]{64}$/i.test(sessionToken);
  }

  detectBruteForce(ip: string, attempts: Array<{ ip: string; timestamp: number }>): boolean {
    const now = Date.now();
    const recentAttempts = attempts.filter(attempt => attempt.ip === ip && now - attempt.timestamp <= 5 * 60 * 1000);
    return recentAttempts.length >= 5;
  }

  detectDdos(requests: Array<{ ip: string; timestamp: number }>): boolean {
    return requests.length >= 500;
  }

  isRateLimited(requestTimestamps: number[], windowSeconds: number, maxRequests: number): boolean {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const recent = requestTimestamps.filter(timestamp => now - timestamp <= windowMs);
    return recent.length > maxRequests;
  }

  validateFileUpload(file: { name: string; size: number; type: string }): boolean {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    const maxSize = 10 * 1024 * 1024;
    return allowedMimeTypes.includes(file.type) && file.size <= maxSize;
  }

  sanitizeFileName(fileName: string): string {
    const decoded = decodeURIComponent(fileName);
    return decoded
      .replace(/(\.\.[/\\])+/g, '')
      .replace(/<[^>]*>/g, '-')
      .replace(/[\/\\%]/g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^\.+/, '')
      .replace(/^\-+/, '');
  }

  validateJson(input: string): boolean {
    try {
      JSON.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  validateDataType(value: string, type: string): boolean {
    switch (type) {
      case 'number':
        return !Number.isNaN(Number(value));
      case 'boolean':
        return value === 'true' || value === 'false';
      case 'date':
        return !Number.isNaN(Date.parse(value));
      case 'email':
        return this.validateEmail(value);
      default:
        return false;
    }
  }

  sanitizeErrorMessage(errorMessage: string): string {
    if (errorMessage.includes(':')) {
      return errorMessage.split(':')[0];
    }
    if (errorMessage.includes(' for ')) {
      return errorMessage.split(' for ')[0];
    }
    return errorMessage;
  }

  validateErrorCode(code: number): boolean {
    return Number.isInteger(code) && code >= 400 && code <= 599;
  }

  sanitizeSensitiveData<T extends Record<string, unknown>>(data: T): T {
    const sensitiveKeys = new Set(['password', 'apiKey', 'databaseUrl', 'privateKey', 'sessionToken']);
    const sanitizedEntries = Object.entries(data).map(([key, value]) =>
      sensitiveKeys.has(key) ? [key, '***'] : [key, value]
    );
    return Object.fromEntries(sanitizedEntries) as T;
  }

  validateSecurityHeader(header: string, value: string): boolean {
    const expected: Record<string, string[]> = {
      'X-Content-Type-Options': ['nosniff'],
      'X-Frame-Options': ['DENY'],
      'X-XSS-Protection': ['1; mode=block'],
      'Strict-Transport-Security': ['max-age=31536000; includeSubDomains'],
      'Content-Security-Policy': ["default-src 'self'"]
    };

    return (expected[header] || []).includes(value);
  }

  generateSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'",
      'X-Permitted-Cross-Domain-Policies': 'none',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }

  validatePasswordStrength(password: string): boolean {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
  }

  validateCryptoKey(key: string): boolean {
    return /^-----BEGIN (PUBLIC|PRIVATE) KEY-----[\s\S]+$/m.test(key);
  }

  validateHashAlgorithm(algorithm: string): boolean {
    return ['sha256', 'sha512', 'bcrypt', 'argon2'].includes(algorithm.toLowerCase());
  }

  validateCorsRequest(
    request: { origin: string; method: string; headers: Record<string, string> },
    corsConfig: { origin: string[]; methods: string[]; allowedHeaders: string[]; credentials: boolean }
  ): boolean {
    return corsConfig.origin.includes(request.origin) && corsConfig.methods.includes(request.method);
  }

  validateRequestSize(size: number, maxSize: number): boolean {
    return size <= maxSize;
  }

  validateContentType(contentType: string): boolean {
    return ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data'].includes(contentType);
  }
}
