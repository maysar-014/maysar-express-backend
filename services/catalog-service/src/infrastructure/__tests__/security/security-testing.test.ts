/**
 * Security Testing Suite
 * 
 * Purpose: Validate security measures and identify potential vulnerabilities
 * Scope: Infrastructure layer security testing with comprehensive coverage
 * Coverage Target: 95% (critical security paths)
 * 
 * Test Categories:
 * - Input validation and sanitization
 * - Authentication and authorization
 * - SQL injection prevention
 * - XSS prevention
 * - Rate limiting and DoS protection
 * - Data validation and sanitization
 * - Error handling security
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../../../domain/interfaces';
import { SecurityMiddleware } from '../../../middleware/security.middleware';

describe('Security Testing', () => {
  let securityMiddleware: SecurityMiddleware;

  beforeEach(() => {
    securityMiddleware = new SecurityMiddleware();
  });

  describe('Input Validation and Sanitization', () => {
    it('should sanitize malicious HTML content', () => {
      // Given: Malicious HTML input
      const maliciousInput = '<script>alert("XSS")</script><img src=x onerror=alert(1)>Hello World';
      const expectedOutput = 'Hello World'; // Should strip all HTML tags

      // When: Sanitizing input
      const sanitized = securityMiddleware.sanitizeInput(maliciousInput);

      // Then: HTML should be stripped
      expect(sanitized).toBe(expectedOutput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('<img');
    });

    it('should validate email format', () => {
      // Given: Various email inputs
      const validEmails = [
        'user@example.com',
        'test.email+tag@domain.co.uk',
        'user123@test-domain.com'
      ];

      const invalidEmails = [
        'invalid-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user space@domain.com',
        'user@domain..com'
      ];

      // When/Then: Validating emails
      validEmails.forEach(email => {
        expect(securityMiddleware.validateEmail(email)).toBe(true);
      });

      invalidEmails.forEach(email => {
        expect(securityMiddleware.validateEmail(email)).toBe(false);
      });
    });

    it('should validate phone number format', () => {
      // Given: Various phone number inputs
      const validPhones = [
        '+1234567890',
        '+1 (555) 123-4567',
        '555-123-4567',
        '(555) 123-4567',
        '5551234567'
      ];

      const invalidPhones = [
        '123',
        'abc-def-ghij',
        '+12345678901234567890', // Too long
        'not-a-phone'
      ];

      // When/Then: Validating phone numbers
      validPhones.forEach(phone => {
        expect(securityMiddleware.validatePhoneNumber(phone)).toBe(true);
      });

      invalidPhones.forEach(phone => {
        expect(securityMiddleware.validatePhoneNumber(phone)).toBe(false);
      });
    });

    it('should validate URL format', () => {
      // Given: Various URL inputs
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://subdomain.example.com/path?param=value',
        'ftp://files.example.com'
      ];

      const invalidUrls = [
        'not-a-url',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'file:///etc/passwd'
      ];

      // When/Then: Validating URLs
      validUrls.forEach(url => {
        expect(securityMiddleware.validateUrl(url)).toBe(true);
      });

      invalidUrls.forEach(url => {
        expect(securityMiddleware.validateUrl(url)).toBe(false);
      });
    });

    it('should validate SQL injection attempts', () => {
      // Given: SQL injection attempts
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES('hacker', 'password'); --",
        "' UNION SELECT * FROM users --",
        "admin'; --"
      ];

      // When/Then: SQL injection should be detected
      sqlInjectionAttempts.forEach(input => {
        expect(securityMiddleware.containsSqlInjection(input)).toBe(true);
      });

      // Valid inputs should not trigger
      const validInputs = [
        "user's name",
        "O'Connor",
        "It's a valid input",
        "SELECT * FROM products WHERE id = 1"
      ];

      validInputs.forEach(input => {
        expect(securityMiddleware.containsSqlInjection(input)).toBe(false);
      });
    });

    it('should validate XSS attempts', () => {
      // Given: XSS attempts
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg onload=alert(1)>',
        '<iframe src="javascript:alert(1)"></iframe>'
      ];

      // When/Then: XSS should be detected
      xssAttempts.forEach(input => {
        expect(securityMiddleware.containsXss(input)).toBe(true);
      });

      // Valid inputs should not trigger
      const validInputs = [
        'This is a normal text',
        'JavaScript is a programming language',
        '<p>This is safe HTML</p>',
        'alert("This is not XSS")'
      ];

      validInputs.forEach(input => {
        expect(securityMiddleware.containsXss(input)).toBe(false);
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should validate JWT tokens', () => {
      // Given: JWT tokens
      const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const invalidTokens = [
        'invalid-token',
        '',
        'Bearer invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid-payload.invalid-signature'
      ];

      // When/Then: Token validation
      expect(securityMiddleware.validateJwtToken(validToken)).toBe(true);

      invalidTokens.forEach(token => {
        expect(securityMiddleware.validateJwtToken(token)).toBe(false);
      });
    });

    it('should validate API keys', () => {
      // Given: API keys
      const validApiKey = 'ak_live_1234567890abcdef1234567890abcdef';
      const invalidApiKeys = [
        'invalid-key',
        '',
        'sk_test_123', // Too short
        'ak_live_invalid_format'
      ];

      // When/Then: API key validation
      expect(securityMiddleware.validateApiKey(validApiKey)).toBe(true);

      invalidApiKeys.forEach(key => {
        expect(securityMiddleware.validateApiKey(key)).toBe(false);
      });
    });

    it('should validate session tokens', () => {
      // Given: Session tokens
      const validSession = 'sess_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const invalidSessions = [
        'invalid-session',
        '',
        'sess_short',
        'sess_invalid_format'
      ];

      // When/Then: Session validation
      expect(securityMiddleware.validateSessionToken(validSession)).toBe(true);

      invalidSessions.forEach(session => {
        expect(securityMiddleware.validateSessionToken(session)).toBe(false);
      });
    });
  });

  describe('Rate Limiting and DoS Protection', () => {
    it('should detect brute force attacks', () => {
      // Given: Multiple failed login attempts
      const attackAttempts = [
        { ip: '192.168.1.100', timestamp: Date.now() - 1000 },
        { ip: '192.168.1.100', timestamp: Date.now() - 2000 },
        { ip: '192.168.1.100', timestamp: Date.now() - 3000 },
        { ip: '192.168.1.100', timestamp: Date.now() - 4000 },
        { ip: '192.168.1.100', timestamp: Date.now() - 5000 }
      ];

      // When: Checking for brute force
      const isAttack = securityMiddleware.detectBruteForce('192.168.1.100', attackAttempts);

      // Then: Should detect brute force
      expect(isAttack).toBe(true);
    });

    it('should detect DDoS attacks', () => {
      // Given: High volume of requests from multiple IPs
      const requests = Array(1000).fill(null).map((_, index) => ({
        ip: `192.168.1.${index % 255}`,
        timestamp: Date.now() - Math.random() * 10000
      }));

      // When: Checking for DDoS
      const isDdos = securityMiddleware.detectDdos(requests);

      // Then: Should detect DDoS
      expect(isDdos).toBe(true);
    });

    it('should validate request rate limits', () => {
      // Given: Request timestamps
      const recentRequests = Array(100).fill(null).map((_, index) => 
        Date.now() - (index * 100)
      );

      const oldRequests = Array(50).fill(null).map((_, index) => 
        Date.now() - (60000 + index * 1000) // Older than 1 minute
      );

      // When: Checking rate limits
      const isRateLimitedRecent = securityMiddleware.isRateLimited(recentRequests, 60, 50);
      const isRateLimitedOld = securityMiddleware.isRateLimited(oldRequests, 60, 50);

      // Then: Recent requests should be rate limited, old requests should not
      expect(isRateLimitedRecent).toBe(true);
      expect(isRateLimitedOld).toBe(false);
    });
  });

  describe('Data Validation and Sanitization', () => {
    it('should validate file uploads', () => {
      // Given: File upload data
      const validFiles = [
        { name: 'document.pdf', size: 1024000, type: 'application/pdf' },
        { name: 'image.jpg', size: 512000, type: 'image/jpeg' },
        { name: 'spreadsheet.xlsx', size: 2048000, type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      ];

      const invalidFiles = [
        { name: 'malicious.exe', size: 1024, type: 'application/x-executable' },
        { name: 'script.js', size: 1024, type: 'application/javascript' },
        { name: 'document.pdf', size: 50000000, type: 'application/pdf' }, // Too large
        { name: 'file', size: 1024, type: 'unknown/type' } // Unknown type
      ];

      // When/Then: File validation
      validFiles.forEach(file => {
        expect(securityMiddleware.validateFileUpload(file)).toBe(true);
      });

      invalidFiles.forEach(file => {
        expect(securityMiddleware.validateFileUpload(file)).toBe(false);
      });
    });

    it('should sanitize file names', () => {
      // Given: Malicious file names
      const maliciousNames = [
        '../../../etc/passwd',
        'file<script>alert(1)</script>.txt',
        'file%2e%2e%2f%2e%2e%2fetc%2fpasswd',
        'file\\..\\..\\etc\\passwd'
      ];

      const expectedNames = [
        'etc-passwd',
        'file-alert-1-.txt',
        'file-etc-passwd',
        'file-etc-passwd'
      ];

      // When/Then: File name sanitization
      maliciousNames.forEach((name, index) => {
        const sanitized = securityMiddleware.sanitizeFileName(name);
        expect(sanitized).toBe(expectedNames[index]);
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('/');
        expect(sanitized).not.toContain('\\');
      });
    });

    it('should validate JSON input', () => {
      // Given: JSON inputs
      const validJson = '{"name": "test", "value": 123}';
      const invalidJson = [
        '{"name": "test", "value": }', // Invalid JSON
        '{"name": "test", "value": 123', // Incomplete JSON
        'function(){}', // Not JSON
        'undefined' // Not JSON
      ];

      // When/Then: JSON validation
      expect(securityMiddleware.validateJson(validJson)).toBe(true);

      invalidJson.forEach(json => {
        expect(securityMiddleware.validateJson(json)).toBe(false);
      });
    });

    it('should validate data types', () => {
      // Given: Various data types
      const testCases = [
        { value: '123', type: 'number', expected: true },
        { value: 'abc', type: 'number', expected: false },
        { value: 'true', type: 'boolean', expected: true },
        { value: 'false', type: 'boolean', expected: true },
        { value: 'maybe', type: 'boolean', expected: false },
        { value: '2023-01-01', type: 'date', expected: true },
        { value: 'invalid-date', type: 'date', expected: false },
        { value: 'user@example.com', type: 'email', expected: true },
        { value: 'not-an-email', type: 'email', expected: false }
      ];

      // When/Then: Data type validation
      testCases.forEach(({ value, type, expected }) => {
        expect(securityMiddleware.validateDataType(value, type)).toBe(expected);
      });
    });
  });

  describe('Error Handling Security', () => {
    it('should sanitize error messages', () => {
      // Given: Error messages with sensitive information
      const sensitiveErrors = [
        'Database connection failed: Connection refused to localhost:5432',
        'File not found: /etc/passwd',
        'Authentication failed for user: admin',
        'SQL Error: Table users does not exist'
      ];

      const expectedSanitized = [
        'Database connection failed',
        'File not found',
        'Authentication failed',
        'SQL Error'
      ];

      // When/Then: Error message sanitization
      sensitiveErrors.forEach((error, index) => {
        const sanitized = securityMiddleware.sanitizeErrorMessage(error);
        expect(sanitized).toBe(expectedSanitized[index]);
        expect(sanitized).not.toContain('localhost');
        expect(sanitized).not.toContain('/etc/passwd');
        expect(sanitized).not.toContain('admin');
      });
    });

    it('should validate error codes', () => {
      // Given: Error codes
      const validCodes = [400, 401, 403, 404, 500, 502, 503];
      const invalidCodes = [-1, 0, 100, 399, 405.5, 600, 1000];

      // When/Then: Error code validation
      validCodes.forEach(code => {
        expect(securityMiddleware.validateErrorCode(code)).toBe(true);
      });

      invalidCodes.forEach(code => {
        expect(securityMiddleware.validateErrorCode(code)).toBe(false);
      });
    });

    it('should prevent information disclosure', () => {
      // Given: Sensitive information
      const sensitiveData = {
        password: 'secret123',
        apiKey: 'ak_live_1234567890abcdef',
        databaseUrl: 'postgresql://user:pass@localhost:5432/db',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...',
        sessionToken: 'sess_1234567890abcdef1234567890abcdef'
      };

      // When: Sanitizing sensitive data
      const sanitized = securityMiddleware.sanitizeSensitiveData(sensitiveData);

      // Then: Sensitive data should be masked
      expect(sanitized.password).toBe('***');
      expect(sanitized.apiKey).toBe('***');
      expect(sanitized.databaseUrl).toBe('***');
      expect(sanitized.privateKey).toBe('***');
      expect(sanitized.sessionToken).toBe('***');
    });
  });

  describe('Security Headers', () => {
    it('should validate security headers', () => {
      // Given: Security headers
      const validHeaders = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'"
      };

      const invalidHeaders = {
        'X-Content-Type-Options': 'sniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '0',
        'Strict-Transport-Security': 'max-age=0',
        'Content-Security-Policy': "default-src '*'"
      };

      // When/Then: Header validation
      Object.entries(validHeaders).forEach(([header, value]) => {
        expect(securityMiddleware.validateSecurityHeader(header, value)).toBe(true);
      });

      Object.entries(invalidHeaders).forEach(([header, value]) => {
        expect(securityMiddleware.validateSecurityHeader(header, value)).toBe(false);
      });
    });

    it('should generate secure headers', () => {
      // When: Generating security headers
      const headers = securityMiddleware.generateSecurityHeaders();

      // Then: All required headers should be present
      expect(headers).toHaveProperty('X-Content-Type-Options', 'nosniff');
      expect(headers).toHaveProperty('X-Frame-Options', 'DENY');
      expect(headers).toHaveProperty('X-XSS-Protection', '1; mode=block');
      expect(headers).toHaveProperty('Strict-Transport-Security');
      expect(headers).toHaveProperty('Content-Security-Policy');
      expect(headers).toHaveProperty('X-Permitted-Cross-Domain-Policies', 'none');
      expect(headers).toHaveProperty('Referrer-Policy', 'strict-origin-when-cross-origin');
    });
  });

  describe('Cryptography and Hashing', () => {
    it('should validate password strength', () => {
      // Given: Passwords
      const strongPasswords = [
        'StrongPassword123!',
        'My$ecureP@ssw0rd',
        'C0mplexP@ssword!23'
      ];

      const weakPasswords = [
        'password',
        '123456',
        'abc123',
        'Password', // Missing special character and number
        'password123' // Missing uppercase and special character
      ];

      // When/Then: Password strength validation
      strongPasswords.forEach(password => {
        expect(securityMiddleware.validatePasswordStrength(password)).toBe(true);
      });

      weakPasswords.forEach(password => {
        expect(securityMiddleware.validatePasswordStrength(password)).toBe(false);
      });
    });

    it('should validate cryptographic keys', () => {
      // Given: Cryptographic keys
      const validKeys = [
        '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...',
        '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...'
      ];

      const invalidKeys = [
        'invalid-key',
        '-----BEGIN PUBLIC KEY-----\ninvalid-content',
        '-----BEGIN PRIVATE KEY-----\ninvalid-content'
      ];

      // When/Then: Key validation
      validKeys.forEach(key => {
        expect(securityMiddleware.validateCryptoKey(key)).toBe(true);
      });

      invalidKeys.forEach(key => {
        expect(securityMiddleware.validateCryptoKey(key)).toBe(false);
      });
    });

    it('should validate hash algorithms', () => {
      // Given: Hash algorithms
      const validAlgorithms = ['sha256', 'sha512', 'bcrypt', 'argon2'];
      const invalidAlgorithms = ['md5', 'sha1', 'des', 'rc4'];

      // When/Then: Algorithm validation
      validAlgorithms.forEach(algorithm => {
        expect(securityMiddleware.validateHashAlgorithm(algorithm)).toBe(true);
      });

      invalidAlgorithms.forEach(algorithm => {
        expect(securityMiddleware.validateHashAlgorithm(algorithm)).toBe(false);
      });
    });
  });

  describe('Middleware Security', () => {
    it('should implement CORS security', () => {
      // Given: CORS configuration
      const corsConfig = {
        origin: ['https://example.com', 'https://api.example.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
      };

      // When: Validating CORS request
      const validRequest = {
        origin: 'https://example.com',
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      };

      const invalidRequest = {
        origin: 'https://malicious.com',
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      };

      // Then: CORS validation
      expect(securityMiddleware.validateCorsRequest(validRequest, corsConfig)).toBe(true);
      expect(securityMiddleware.validateCorsRequest(invalidRequest, corsConfig)).toBe(false);
    });

    it('should validate request size', () => {
      // Given: Request sizes
      const validSize = 1024 * 1024; // 1MB
      const invalidSize = 10 * 1024 * 1024; // 10MB

      // When/Then: Size validation
      expect(securityMiddleware.validateRequestSize(validSize, 5 * 1024 * 1024)).toBe(true);
      expect(securityMiddleware.validateRequestSize(invalidSize, 5 * 1024 * 1024)).toBe(false);
    });

    it('should validate content type', () => {
      // Given: Content types
      const validTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data'
      ];

      const invalidTypes = [
        'text/html',
        'application/javascript',
        'text/css'
      ];

      // When/Then: Content type validation
      validTypes.forEach(type => {
        expect(securityMiddleware.validateContentType(type)).toBe(true);
      });

      invalidTypes.forEach(type => {
        expect(securityMiddleware.validateContentType(type)).toBe(false);
      });
    });
  });
});