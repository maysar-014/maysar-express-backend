/**
 * Authentication Middleware Types
 * Type definitions for authentication middleware functionality
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface TokenValidationResult {
  valid: boolean;
  payload?: any;
  expiresAt?: number;
  issuedAt?: number;
  error?: string;
}

export interface TokenBlacklistResult {
  isBlacklisted: boolean;
  blacklistedAt?: number;
  error?: string;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  serviceId?: string;
  permissions?: string[];
  error?: string;
}

export interface BruteForceResult {
  isBlocked: boolean;
  attempts: number;
  timeUntilReset: number;
  error?: string;
}

export interface DeviceTrackingResult {
  userId: string;
  deviceId: string;
  deviceInfo: any;
  firstSeen: number;
  lastSeen: number;
  isNewDevice: boolean;
  locationHistory: Array<{
    timestamp: number;
    location: string;
    ipAddress: string;
  }>;
  riskScore: number;
  success?: boolean;
  reason?: string;
}

export interface SessionResult {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
}

export interface MetricsResult {
  timestamp: number;
  totalBlacklistedTokens?: number;
  activeSessions?: number;
  totalDevices?: number;
  totalBruteForceAttempts?: number;
  services?: {
    jwt?: { enabled: boolean };
    tokenBlacklisting?: { enabled: boolean; count?: number };
    apiKey?: { enabled: boolean };
    bruteForce?: { enabled: boolean; totalAttempts?: number };
    deviceTracking?: { enabled: boolean; totalDevices?: number };
    session?: { enabled: boolean; activeSessions?: number };
  };
  error?: string;
}

export interface AuthenticationFailureData {
  identifier: string;
  type: 'ip' | 'email' | 'user_id';
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface DeviceTrackingData {
  userId: string;
  deviceId: string;
  deviceInfo: any;
  isNewDevice: boolean;
}

export interface SessionData {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: any;
}