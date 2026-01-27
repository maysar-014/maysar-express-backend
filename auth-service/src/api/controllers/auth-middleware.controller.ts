import { Request, Response } from 'express';
import { logger } from '../../infrastructure/services/logger.service';
import { AuthMiddlewareService } from '../../application/services/auth-middleware.service';
import { AuthMiddlewareConfig } from '../../config/auth-middleware.config';

/**
 * Authentication Middleware Controller
 * Handles API endpoints for authentication middleware functionality
 */
export class AuthMiddlewareController {
  private authMiddlewareService: AuthMiddlewareService;
  private config: AuthMiddlewareConfig;

  constructor() {
    this.config = new AuthMiddlewareConfig();
    this.authMiddlewareService = new AuthMiddlewareService(this.config);
  }

  /**
   * Validate JWT token
   * POST /api/v1/auth/validate-token
   */
  async validateToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      const result = await this.authMiddlewareService.validateToken(token);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Token validation error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'TOKEN_VALIDATION_ERROR',
          message: 'Failed to validate token'
        }
      });
    }
  }

  /**
   * Check token blacklist status
   * POST /api/v1/auth/check-blacklist
   */
  async checkTokenBlacklist(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      const result = await this.authMiddlewareService.checkTokenBlacklist(token);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Token blacklist check error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'BLACKLIST_CHECK_ERROR',
          message: 'Failed to check token blacklist status'
        }
      });
    }
  }

  /**
   * Blacklist token (logout functionality)
   * POST /api/v1/auth/blacklist-token
   */
  async blacklistToken(req: Request, res: Response): Promise<void> {
    try {
      const { token, reason } = req.body;

      const result = await this.authMiddlewareService.blacklistToken(token, reason || 'logout');

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Token blacklisting error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'TOKEN_BLACKLIST_ERROR',
          message: 'Failed to blacklist token'
        }
      });
    }
  }

  /**
   * Validate API key for service-to-service authentication
   * POST /api/v1/auth/validate-api-key
   */
  async validateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey } = req.body;

      const result = await this.authMiddlewareService.validateApiKey(apiKey);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('API key validation error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'API_KEY_VALIDATION_ERROR',
          message: 'Failed to validate API key'
        }
      });
    }
  }

  /**
   * Generate new API key for service
   * POST /api/v1/auth/generate-api-key
   */
  async generateApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { serviceId, permissions, expiresAt } = req.body;

      const result = await this.authMiddlewareService.generateApiKey(
        serviceId,
        permissions,
        expiresAt ? new Date(expiresAt) : undefined
      );

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('API key generation error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'API_KEY_GENERATION_ERROR',
          message: 'Failed to generate API key'
        }
      });
    }
  }

  /**
   * Revoke API key
   * POST /api/v1/auth/revoke-api-key
   */
  async revokeApiKey(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey, reason } = req.body;

      const result = await this.authMiddlewareService.revokeApiKey(apiKey, reason || 'admin');

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('API key revocation error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'API_KEY_REVOCATION_ERROR',
          message: 'Failed to revoke API key'
        }
      });
    }
  }

  /**
   * Check brute force protection status
   * POST /api/v1/auth/check-brute-force
   */
  async checkBruteForce(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, type } = req.body;

      const result = await this.authMiddlewareService.checkBruteForce(identifier, type);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Brute force check error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'BRUTE_FORCE_CHECK_ERROR',
          message: 'Failed to check brute force protection status'
        }
      });
    }
  }

  /**
   * Record failed authentication attempt
   * POST /api/v1/auth/record-failure
   */
  async recordFailure(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, type, reason, ipAddress, userAgent } = req.body;

      const result = await this.authMiddlewareService.recordFailure({
        identifier,
        type,
        reason,
        ipAddress,
        userAgent
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Failure recording error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'FAILURE_RECORDING_ERROR',
          message: 'Failed to record authentication failure'
        }
      });
    }
  }

  /**
   * Reset brute force protection for identifier
   * POST /api/v1/auth/reset-brute-force
   */
  async resetBruteForce(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, type, adminReason } = req.body;

      const result = await this.authMiddlewareService.resetBruteForce(identifier, type, adminReason);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Brute force reset error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'BRUTE_FORCE_RESET_ERROR',
          message: 'Failed to reset brute force protection'
        }
      });
    }
  }

  /**
   * Track device for user
   * POST /api/v1/auth/track-device
   */
  async trackDevice(req: Request, res: Response): Promise<void> {
    try {
      const { userId, deviceId, deviceInfo, isNewDevice } = req.body;

      const result = await this.authMiddlewareService.trackDevice({
        userId,
        deviceId,
        deviceInfo,
        isNewDevice: isNewDevice || false
      });

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Device tracking error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'DEVICE_TRACKING_ERROR',
          message: 'Failed to track device'
        }
      });
    }
  }

  /**
   * Get device history for user
   * GET /api/v1/auth/device-history/:userId
   */
  async getDeviceHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 10, offset = 0 } = req.query;

      const result = await this.authMiddlewareService.getDeviceHistory(
        userId,
        typeof limit === 'string' ? parseInt(limit, 10) : (limit as number),
        typeof offset === 'string' ? parseInt(offset, 10) : (offset as number)
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Device history retrieval error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'DEVICE_HISTORY_ERROR',
          message: 'Failed to retrieve device history'
        }
      });
    }
  }

  /**
   * Remove device from user's trusted devices
   * DELETE /api/v1/auth/device/:deviceId
   */
  async removeDevice(req: Request, res: Response): Promise<void> {
    try {
      const { deviceId } = req.params;
      const { userId, reason } = req.body;

      const result = await this.authMiddlewareService.removeDevice(deviceId, userId, reason);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Device removal error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'DEVICE_REMOVAL_ERROR',
          message: 'Failed to remove device'
        }
      });
    }
  }

  /**
   * Extend session
   * POST /api/v1/auth/extend-session
   */
  async extendSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, userId } = req.body;

      const result = await this.authMiddlewareService.extendSession(sessionId, userId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Session extension error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'SESSION_EXTENSION_ERROR',
          message: 'Failed to extend session'
        }
      });
    }
  }

  /**
   * Get session info
   * GET /api/v1/auth/session/:sessionId
   */
  async getSessionInfo(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId } = req.params;

      const result = await this.authMiddlewareService.getSessionInfo(sessionId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Session info retrieval error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'SESSION_INFO_ERROR',
          message: 'Failed to retrieve session information'
        }
      });
    }
  }

  /**
   * Invalidate session
   * POST /api/v1/auth/invalidate-session
   */
  async invalidateSession(req: Request, res: Response): Promise<void> {
    try {
      const { sessionId, userId, reason } = req.body;

      const result = await this.authMiddlewareService.invalidateSession(sessionId, userId, reason || 'logout');

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Session invalidation error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'SESSION_INVALIDATION_ERROR',
          message: 'Failed to invalidate session'
        }
      });
    }
  }

  /**
   * Authentication middleware health check
   * GET /api/v1/auth/middleware/health
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authMiddlewareService.healthCheck();

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Health check error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Health check failed'
        }
      });
    }
  }

  /**
   * Get authentication metrics
   * GET /api/v1/auth/metrics
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.authMiddlewareService.getMetrics();

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Metrics retrieval error', error instanceof Error ? error : new Error(String(error)));
      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to retrieve authentication metrics'
        }
      });
    }
  }
}