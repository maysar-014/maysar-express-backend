import { logger } from '../../infrastructure/services/logger.service';
import { AuthMiddlewareConfig } from '../../config/auth-middleware.config';
import { TokenValidationResult, TokenBlacklistResult, ApiKeyValidationResult, BruteForceResult, DeviceTrackingResult, SessionResult, MetricsResult } from '../../domain/types/auth-middleware.types';

/**
 * Authentication Middleware Service
 * Provides business logic for authentication middleware functionality
 * Handles JWT validation, token blacklisting, device tracking, and brute force protection
 */
export class AuthMiddlewareService {
  private config: AuthMiddlewareConfig;
  private tokenBlacklist: Map<string, number> = new Map();
  private bruteForceAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private deviceTracking: Map<string, DeviceTrackingResult> = new Map();
  private sessions: Map<string, SessionResult> = new Map();

  constructor(config: AuthMiddlewareConfig) {
    this.config = config;
    this.startCleanupTasks();
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      // In a real implementation, this would use a JWT library to decode and validate the token
      // For now, we'll implement a mock validation
      const isValid = this.validateTokenFormat(token);
      const payload = isValid ? this.decodeTokenPayload(token) : null;

      if (!isValid || !payload) {
        return {
          valid: false,
          error: 'Invalid token format or expired'
        };
      }

      // Check if token is blacklisted
      if (this.config.getConfig().tokenBlacklisting.enabled && this.isTokenBlacklisted(token)) {
        return {
          valid: false,
          error: 'Token has been revoked'
        };
      }

      return {
        valid: true,
        payload,
        expiresAt: payload.exp * 1000,
        issuedAt: payload.iat * 1000
      };
    } catch (error) {
      logger.error('Token validation failed', error instanceof Error ? error : new Error(String(error)));
      return {
        valid: false,
        error: 'Token validation failed'
      };
    }
  }

  /**
   * Check token blacklist status
   */
  async checkTokenBlacklist(token: string): Promise<TokenBlacklistResult> {
    try {
      const isBlacklisted = this.isTokenBlacklisted(token);
      const blacklistedAt = isBlacklisted ? this.tokenBlacklist.get(token) : undefined;

      return {
        isBlacklisted,
        blacklistedAt
      };
    } catch (error) {
      logger.error('Token blacklist check failed', error instanceof Error ? error : new Error(String(error)));
      return {
        isBlacklisted: false,
        error: 'Failed to check blacklist status'
      };
    }
  }

  /**
   * Blacklist token (logout functionality)
   */
  async blacklistToken(token: string, reason: string): Promise<{ success: boolean; reason: string }> {
    try {
      const config = this.config.getConfig().tokenBlacklisting;
      
      if (!config.enabled) {
        return {
          success: false,
          reason: 'Token blacklisting is disabled'
        };
      }

      const expirationTime = Date.now() + config.cleanupInterval;
      this.tokenBlacklist.set(token, expirationTime);

      logger.info('Token blacklisted', { token: token.substring(0, 10) + '...', reason });

      return {
        success: true,
        reason
      };
    } catch (error) {
      logger.error('Token blacklisting failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        reason: 'Failed to blacklist token'
      };
    }
  }

  /**
   * Validate API key for service-to-service authentication
   */
  async validateApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
    try {
      const config = this.config.getConfig().apiKey;
      
      if (!config.enabled) {
        return {
          valid: false,
          error: 'API key authentication is disabled'
        };
      }

      // In a real implementation, this would validate against a database
      // For now, we'll implement a mock validation
      const isValid = this.validateApiKeyFormat(apiKey);
      const serviceId = isValid ? this.extractServiceId(apiKey) : undefined;
      const permissions = isValid ? ['read', 'write'] : [];

      return {
        valid: isValid,
        serviceId,
        permissions,
        error: isValid ? undefined : 'Invalid API key format'
      };
    } catch (error) {
      logger.error('API key validation failed', error instanceof Error ? error : new Error(String(error)));
      return {
        valid: false,
        error: 'API key validation failed'
      };
    }
  }

  /**
   * Generate new API key for service
   */
  async generateApiKey(serviceId: string, permissions: string[], expiresAt?: Date): Promise<{ apiKey: string; expiresAt?: Date }> {
    try {
      const config = this.config.getConfig().apiKey;
      
      if (!config.enabled) {
        throw new Error('API key generation is disabled');
      }

      if (!config.allowedServices.includes(serviceId)) {
        throw new Error('Service not allowed to generate API keys');
      }

      const apiKey = this.generateSecureApiKey(serviceId, permissions);
      const expirationDate = expiresAt || new Date(Date.now() + config.expirationTime);

      logger.info('API key generated', { serviceId, permissions, expiresAt: expirationDate });

      return {
        apiKey,
        expiresAt: expirationDate
      };
    } catch (error) {
      logger.error('API key generation failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(apiKey: string, reason: string): Promise<{ success: boolean; reason: string }> {
    try {
      // In a real implementation, this would mark the API key as revoked in the database
      // For now, we'll implement a mock revocation
      const isValid = this.validateApiKeyFormat(apiKey);

      logger.info('API key revoked', { apiKey: apiKey.substring(0, 10) + '...', reason });

      return {
        success: isValid,
        reason
      };
    } catch (error) {
      logger.error('API key revocation failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        reason: 'Failed to revoke API key'
      };
    }
  }

  /**
   * Check brute force protection status
   */
  async checkBruteForce(identifier: string, type: 'ip' | 'email' | 'user_id'): Promise<BruteForceResult> {
    try {
      const config = this.config.getConfig().bruteForce;
      
      if (!config.enabled) {
        return {
          isBlocked: false,
          attempts: 0,
          timeUntilReset: 0
        };
      }

      const key = `${type}:${identifier}`;
      const attemptData = this.bruteForceAttempts.get(key);

      if (!attemptData) {
        return {
          isBlocked: false,
          attempts: 0,
          timeUntilReset: 0
        };
      }

      const now = Date.now();
      const timeSinceLastAttempt = now - attemptData.lastAttempt;
      const isBlocked = attemptData.count >= config.maxAttempts && timeSinceLastAttempt < config.lockoutTime;

      return {
        isBlocked,
        attempts: attemptData.count,
        timeUntilReset: isBlocked ? config.lockoutTime - timeSinceLastAttempt : 0
      };
    } catch (error) {
      logger.error('Brute force check failed', error instanceof Error ? error : new Error(String(error)));
      return {
        isBlocked: false,
        attempts: 0,
        timeUntilReset: 0,
        error: 'Failed to check brute force status'
      };
    }
  }

  /**
   * Record failed authentication attempt
   */
  async recordFailure(failureData: {
    identifier: string;
    type: 'ip' | 'email' | 'user_id';
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; attempts: number; reason?: string }> {
    try {
      const config = this.config.getConfig().bruteForce;
      
      if (!config.enabled) {
        return {
          success: false,
          attempts: 0,
          reason: 'Brute force protection is disabled'
        };
      }

      const key = `${failureData.type}:${failureData.identifier}`;
      const now = Date.now();
      const attemptData = this.bruteForceAttempts.get(key);

      let attempts = 1;
      if (attemptData) {
        const timeSinceLastAttempt = now - attemptData.lastAttempt;
        if (timeSinceLastAttempt < config.windowTime) {
          attempts = attemptData.count + 1;
        }
      }

      this.bruteForceAttempts.set(key, {
        count: attempts,
        lastAttempt: now
      });

      logger.warn('Authentication failure recorded', {
        identifier: failureData.identifier,
        type: failureData.type,
        attempts,
        reason: failureData.reason,
        ipAddress: failureData.ipAddress
      });

      return {
        success: true,
        attempts
      };
    } catch (error) {
      logger.error('Failure recording failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        attempts: 0,
        reason: 'Failed to record failure'
      };
    }
  }

  /**
   * Reset brute force protection for identifier
   */
  async resetBruteForce(identifier: string, type: 'ip' | 'email' | 'user_id', adminReason: string): Promise<{ success: boolean; reason: string }> {
    try {
      const key = `${type}:${identifier}`;
      this.bruteForceAttempts.delete(key);

      logger.info('Brute force protection reset', {
        identifier,
        type,
        adminReason
      });

      return {
        success: true,
        reason: adminReason
      };
    } catch (error) {
      logger.error('Brute force reset failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        reason: 'Failed to reset brute force protection'
      };
    }
  }

  /**
   * Track device for user
   */
  async trackDevice(deviceData: {
    userId: string;
    deviceId: string;
    deviceInfo: any;
    isNewDevice: boolean;
  }): Promise<DeviceTrackingResult> {
    try {
      const config = this.config.getConfig().deviceTracking;
      
      if (!config.enabled) {
        throw new Error('Device tracking is disabled');
      }

      const deviceKey = `${deviceData.userId}:${deviceData.deviceId}`;
      const now = Date.now();

      const deviceInfo: DeviceTrackingResult = {
        userId: deviceData.userId,
        deviceId: deviceData.deviceId,
        deviceInfo: deviceData.deviceInfo,
        firstSeen: now,
        lastSeen: now,
        isNewDevice: deviceData.isNewDevice,
        locationHistory: [],
        riskScore: 0
      };

      this.deviceTracking.set(deviceKey, deviceInfo);

      logger.info('Device tracked', {
        userId: deviceData.userId,
        deviceId: deviceData.deviceId,
        isNewDevice: deviceData.isNewDevice
      });

      return deviceInfo;
    } catch (error) {
      logger.error('Device tracking failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get device history for user
   */
  async getDeviceHistory(userId: string, limit: number = 10, offset: number = 0): Promise<{ devices: DeviceTrackingResult[]; total: number; error?: string }> {
    try {
      const devices = Array.from(this.deviceTracking.values())
        .filter(device => device.userId === userId)
        .sort((a, b) => b.lastSeen - a.lastSeen)
        .slice(offset, offset + limit);

      return {
        devices,
        total: devices.length
      };
    } catch (error) {
      logger.error('Device history retrieval failed', error instanceof Error ? error : new Error(String(error)));
      return {
        devices: [],
        total: 0,
        error: 'Failed to retrieve device history'
      };
    }
  }

  /**
   * Remove device from user's trusted devices
   */
  async removeDevice(deviceId: string, userId: string, reason?: string): Promise<{ success: boolean; reason?: string }> {
    try {
      const deviceKey = `${userId}:${deviceId}`;
      const removed = this.deviceTracking.delete(deviceKey);

      logger.info('Device removed', {
        userId,
        deviceId,
        reason
      });

      return {
        success: removed,
        reason: removed ? reason : 'Device not found'
      };
    } catch (error) {
      logger.error('Device removal failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        reason: 'Failed to remove device'
      };
    }
  }

  /**
   * Extend session
   */
  async extendSession(sessionId: string, userId: string): Promise<SessionResult> {
    try {
      const config = this.config.getConfig().session;
      
      if (!config.enabled) {
        throw new Error('Session management is disabled');
      }

      const sessionKey = `${userId}:${sessionId}`;
      const now = Date.now();
      const sessionData = this.sessions.get(sessionKey);

      if (!sessionData) {
        throw new Error('Session not found');
      }

      const newExpirationTime = now + config.expirationTime;
      sessionData.lastActivity = now;
      sessionData.expiresAt = newExpirationTime;

      this.sessions.set(sessionKey, sessionData);

      logger.info('Session extended', {
        sessionId,
        userId,
        newExpirationTime
      });

      return sessionData;
    } catch (error) {
      logger.error('Session extension failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get session info
   */
  async getSessionInfo(sessionId: string): Promise<SessionResult> {
    try {
      const sessionData = Array.from(this.sessions.values())
        .find(session => session.sessionId === sessionId);

      if (!sessionData) {
        throw new Error('Session not found');
      }

      return sessionData;
    } catch (error) {
      logger.error('Session info retrieval failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string, userId: string, reason: string): Promise<{ success: boolean; reason: string }> {
    try {
      const sessionKey = `${userId}:${sessionId}`;
      const removed = this.sessions.delete(sessionKey);

      logger.info('Session invalidated', {
        sessionId,
        userId,
        reason
      });

      return {
        success: removed,
        reason
      };
    } catch (error) {
      logger.error('Session invalidation failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        reason: 'Failed to invalidate session'
      };
    }
  }

  /**
   * Authentication middleware health check
   */
  async healthCheck(): Promise<{ status: string; services: any }> {
    try {
      const config = this.config.getConfig();
      const services = {
        jwt: { enabled: true, status: 'healthy' },
        tokenBlacklisting: { enabled: config.tokenBlacklisting.enabled, status: 'healthy' },
        apiKey: { enabled: config.apiKey.enabled, status: 'healthy' },
        bruteForce: { enabled: config.bruteForce.enabled, status: 'healthy' },
        deviceTracking: { enabled: config.deviceTracking.enabled, status: 'healthy' },
        session: { enabled: config.session.enabled, status: 'healthy' }
      };

      return {
        status: 'healthy',
        services
      };
    } catch (error) {
      logger.error('Health check failed', error instanceof Error ? error : new Error(String(error)));
      return {
        status: 'unhealthy',
        services: {}
      };
    }
  }

  /**
   * Get authentication metrics
   */
  async getMetrics(): Promise<MetricsResult> {
    try {
      const config = this.config.getConfig();
      const now = Date.now();

      // Calculate metrics
      const totalBlacklistedTokens = this.tokenBlacklist.size;
      const activeSessions = Array.from(this.sessions.values())
        .filter(session => session.expiresAt > now).length;
      const totalDevices = this.deviceTracking.size;
      const totalBruteForceAttempts = Array.from(this.bruteForceAttempts.values())
        .reduce((sum, attempt) => sum + attempt.count, 0);

      return {
        timestamp: now,
        totalBlacklistedTokens,
        activeSessions,
        totalDevices,
        totalBruteForceAttempts,
        services: {
          jwt: { enabled: true },
          tokenBlacklisting: { enabled: config.tokenBlacklisting.enabled, count: totalBlacklistedTokens },
          apiKey: { enabled: config.apiKey.enabled },
          bruteForce: { enabled: config.bruteForce.enabled, totalAttempts: totalBruteForceAttempts },
          deviceTracking: { enabled: config.deviceTracking.enabled, totalDevices },
          session: { enabled: config.session.enabled, activeSessions }
        }
      };
    } catch (error) {
      logger.error('Metrics retrieval failed', error instanceof Error ? error : new Error(String(error)));
      return {
        timestamp: Date.now(),
        error: 'Failed to retrieve metrics'
      };
    }
  }

  // =====================================================================================
  // PRIVATE HELPER METHODS
  // =====================================================================================

  private validateTokenFormat(token: string): boolean {
    // Mock token validation - in real implementation, use JWT library
    return token.length > 20 && token.includes('.');
  }

  private decodeTokenPayload(token: string): any {
    // Mock token decoding - in real implementation, use JWT library
    return {
      userId: 'user-123',
      email: 'user@example.com',
      roles: ['user'],
      permissions: ['read'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900 // 15 minutes
    };
  }

  private isTokenBlacklisted(token: string): boolean {
    const blacklistedAt = this.tokenBlacklist.get(token);
    if (!blacklistedAt) return false;

    // Check if token is still within blacklist period
    const now = Date.now();
    return blacklistedAt > now;
  }

  private validateApiKeyFormat(apiKey: string): boolean {
    // Mock API key validation
    return apiKey.length >= 16;
  }

  private extractServiceId(apiKey: string): string | undefined {
    // Mock service ID extraction
    return apiKey.length >= 8 ? apiKey.substring(0, 8) : undefined;
  }

  private generateSecureApiKey(serviceId: string, permissions: string[]): string {
    // Mock API key generation - in real implementation, use crypto library
    const crypto = require('crypto');
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `${serviceId}-${randomBytes}`;
  }

  private startCleanupTasks(): void {
    const config = this.config.getConfig();

    // Cleanup blacklisted tokens
    if (config.tokenBlacklisting.enabled) {
      setInterval(() => {
        const now = Date.now();
        for (const [token, expirationTime] of this.tokenBlacklist.entries()) {
          if (expirationTime <= now) {
            this.tokenBlacklist.delete(token);
          }
        }
      }, config.tokenBlacklisting.cleanupInterval);
    }

    // Cleanup device tracking data
    if (config.deviceTracking.enabled) {
      setInterval(() => {
        const now = Date.now();
        const cutoffTime = now - config.deviceTracking.cleanupInterval;
        for (const [deviceKey, deviceInfo] of this.deviceTracking.entries()) {
          if (deviceInfo.lastSeen < cutoffTime) {
            this.deviceTracking.delete(deviceKey);
          }
        }
      }, config.deviceTracking.cleanupInterval);
    }
  }
}