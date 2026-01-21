/**
 * Security Configuration
 * Handles security-related settings and policies
 */

export const securityConfig = {
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (req: any) => {
      return req.ip || req.connection.remoteAddress;
    }
  },

  // Session Management
  session: {
    timeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '480', 10), // 8 hours
    maxConcurrentSessions: 5,
    extendOnActivity: true,
    cleanupInterval: 3600000 // 1 hour
  },

  // Account Security
  account: {
    maxFailedLoginAttempts: parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '5', 10),
    lockoutDurationMinutes: parseInt(process.env.ACCOUNT_LOCK_DURATION_MINUTES || '30', 10),
    passwordHistoryCount: 5,
    preventCommonPasswords: true,
    requirePasswordChangeAfterDays: 90
  },

  // JWT Security
  jwt: {
    algorithm: 'HS256',
    issuer: process.env.JWT_ISSUER || 'maysar-auth-service',
    audience: process.env.JWT_AUDIENCE || 'maysar-platform',
    clockTolerance: 30, // seconds
    maxAge: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m'
  },

  // Password Policy
  password: {
    minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8', 10),
    maxLength: 128,
    requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
    requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
    requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
    requireSpecialChars: process.env.PASSWORD_REQUIRE_SPECIAL_CHARS === 'true',
    preventReuse: true,
    commonPasswordsCheck: true
  },

  // Two-Factor Authentication
  twoFactor: {
    enabled: process.env.ENABLE_TWO_FACTOR !== 'false',
    issuer: process.env.TOTP_ISSUER || 'Maysar',
    algorithm: 'SHA1',
    digits: 6,
    window: parseInt(process.env.TOTP_WINDOW || '1', 10),
    step: 30, // seconds
    backupCodesCount: 10
  },

  // CORS Security
  cors: {
    credentials: true,
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 200
  },

  // Headers Security
  headers: {
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "https:"],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"]
      }
    },

    // Other security headers
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },

    noSniff: true,
    frameOptions: 'DENY',
    xssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin'
  },

  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
    tagLength: 16
  },

  // Audit Logging
  audit: {
    enabled: true,
    logLevel: 'info',
    sensitiveFields: ['password', 'token', 'secret', 'key'],
    retentionDays: 365,
    compressOldLogs: true
  },

  // Input Validation
  validation: {
    sanitizeInput: true,
    maxRequestSize: '10mb',
    timeout: 30000, // 30 seconds
    allowedContentTypes: ['application/json', 'application/x-www-form-urlencoded']
  },

  // Security Monitoring
  monitoring: {
    bruteForceDetection: {
      enabled: true,
      timeWindowMinutes: 15,
      maxAttempts: 5,
      blockDurationMinutes: 30
    },

    suspiciousActivityDetection: {
      enabled: true,
      newDeviceAlert: true,
      unusualLocationAlert: true,
      multipleFailedAttemptsAlert: true
    },

    anomalyDetection: {
      enabled: process.env.NODE_ENV === 'production',
      baselinePeriodDays: 30,
      alertThreshold: 0.8
    }
  }
};

/**
 * Security Policies
 */
export const securityPolicies = {
  // Password strength requirements
  passwordStrength: {
    minScore: 3, // 0-5 scale
    checks: {
      length: { weight: 1, minLength: 8 },
      uppercase: { weight: 1 },
      lowercase: { weight: 1 },
      numbers: { weight: 1 },
      specialChars: { weight: 1 },
      dictionary: { weight: 1 },
      commonPasswords: { weight: 2 }
    }
  },

  // Account lockout policy
  accountLockout: {
    progressiveDelays: [0, 30, 300, 3600, 86400], // seconds
    permanentLockoutAfter: 5,
    notifyAdmin: true,
    notifyUser: true
  },

  // Session security
  sessionSecurity: {
    regenerateOnLogin: true,
    destroyOnLogout: true,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000 // 8 hours
    }
  }
};

/**
 * Security Event Types
 */
export enum SecurityEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',

  // Account Events
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_VERIFIED = 'account_verified',
  ACCOUNT_SUSPENDED = 'account_suspended',
  ACCOUNT_REACTIVATED = 'account_reactivated',
  ACCOUNT_DELETED = 'account_deleted',

  // Security Events
  ACCOUNT_LOCKED = 'account_locked',
  ACCOUNT_UNLOCKED = 'account_unlocked',
  TWO_FACTOR_ENABLED = 'two_factor_enabled',
  TWO_FACTOR_DISABLED = 'two_factor_disabled',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',

  // Administrative Events
  ROLE_CHANGED = 'role_changed',
  PERMISSIONS_MODIFIED = 'permissions_modified',
  SECURITY_POLICY_UPDATED = 'security_policy_updated'
}

/**
 * Security Risk Levels
 */
export enum SecurityRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
