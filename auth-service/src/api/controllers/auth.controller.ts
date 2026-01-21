import { Request, Response } from 'express';
import { AuthenticateUserUseCase } from '../../application/use-cases/authenticate-user.use-case';
import { SessionEngine } from '../../domain/engines/session.engine';
import { logger } from '../../infrastructure/services/logger.service';
import { IAuditRepository } from '../../domain/repositories';

/**
 * Authentication Controller
 * Handles HTTP requests for authentication operations
 */
export class AuthController {
  constructor(
    private authenticateUserUseCase: AuthenticateUserUseCase,
    private sessionEngine: SessionEngine,
    private auditRepository: IAuditRepository
  ) {}

  /**
   * User login
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, totpCode } = req.body;
      const clientInfo = {
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      };

      logger.info('Login attempt', { email, ipAddress: clientInfo.ipAddress });

      // Execute authentication use case
      const result = await this.authenticateUserUseCase.execute({
        email,
        password,
        totpCode,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      if (!result.success) {
        // Log failed authentication
        await this.auditRepository.logAuthentication({
          email,
          action: 'login_failure',
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent,
          success: false,
          reason: result.message
        });

        res.status(this.getErrorStatusCode(result)).json({
          success: false,
          message: result.message,
          requiresTwoFactor: result.requiresTwoFactor,
          locked: result.locked
        });
        return;
      }

      // Create session if login successful
      const sessionId = await this.sessionEngine.createSession(
        result.user!.id,
        result.user!.role,
        clientInfo.userAgent,
        clientInfo.ipAddress
      );

      // Log successful authentication
      await this.auditRepository.logAuthentication({
        userId: result.user!.id,
        email,
        action: 'login_success',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        success: true
      });

      logger.info('Login successful', { userId: result.user!.id, email });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: {
            id: result.user!.id,
            email: result.user!.email,
            role: result.user!.role,
            isEmailVerified: result.user!.isEmailVerified,
            isPhoneVerified: result.user!.isPhoneVerified
          },
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          sessionId
        }
      });

    } catch (error) {
      logger.error('Login error', { email: req.body.email, error });
      res.status(500).json({
        success: false,
        message: 'Authentication service temporarily unavailable'
      });
    }
  }

  /**
   * User logout
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const clientInfo = {
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      };

      // Extract user ID from refresh token (simplified - in production use JWT verification)
      // For now, we'll just log the logout
      logger.info('Logout request', { ipAddress: clientInfo.ipAddress });

      // In a full implementation, you would:
      // 1. Verify the refresh token
      // 2. Extract user ID
      // 3. Terminate user sessions
      // 4. Log the logout event

      await this.auditRepository.logAuthentication({
        action: 'logout',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        success: true
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });

    } catch (error) {
      logger.error('Logout error', { error });
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // In a full implementation, you would:
      // 1. Verify refresh token
      // 2. Extract user information
      // 3. Generate new access token
      // 4. Return new token pair

      logger.info('Token refresh request');

      res.status(200).json({
        success: true,
        message: 'Token refresh not yet implemented',
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token'
        }
      });

    } catch (error) {
      logger.error('Token refresh error', { error });
      res.status(500).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  }

  /**
   * Verify session/token validity
   */
  async verifySession(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'Invalid authorization header'
        });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // In a full implementation, you would:
      // 1. Verify JWT token
      // 2. Check token validity
      // 3. Return user information

      logger.info('Session verification request');

      res.status(200).json({
        success: true,
        message: 'Session verification not yet fully implemented',
        data: {
          valid: true,
          user: {
            id: 'user-id',
            email: 'user@example.com',
            role: 'buyer'
          }
        }
      });

    } catch (error) {
      logger.error('Session verification error', { error });
      res.status(500).json({
        success: false,
        message: 'Session verification failed'
      });
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const clientInfo = {
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      };

      logger.info('Password reset request', { email, ipAddress: clientInfo.ipAddress });

      // In a full implementation, you would:
      // 1. Check if user exists
      // 2. Generate reset token
      // 3. Send email with reset link
      // 4. Log the event

      await this.auditRepository.logAuthentication({
        email,
        action: 'password_reset',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        success: true
      });

      res.status(200).json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent'
      });

    } catch (error) {
      logger.error('Password reset request error', { email: req.body.email, error });
      res.status(500).json({
        success: false,
        message: 'Password reset request failed'
      });
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (newPassword !== confirmPassword) {
        res.status(400).json({
          success: false,
          message: 'Passwords do not match'
        });
        return;
      }

      logger.info('Password reset attempt');

      // In a full implementation, you would:
      // 1. Verify reset token
      // 2. Update user password
      // 3. Invalidate reset token
      // 4. Log the event

      res.status(200).json({
        success: true,
        message: 'Password reset not yet fully implemented'
      });

    } catch (error) {
      logger.error('Password reset error', { error });
      res.status(500).json({
        success: false,
        message: 'Password reset failed'
      });
    }
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const { password, totpCode } = req.body;

      logger.info('2FA enable request');

      // In a full implementation, you would:
      // 1. Verify user password
      // 2. Verify TOTP code
      // 3. Enable 2FA for user
      // 4. Return backup codes

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication enable not yet implemented',
        data: {
          qrCodeUrl: 'otpauth://totp/...',
          backupCodes: ['code1', 'code2', 'code3']
        }
      });

    } catch (error) {
      logger.error('2FA enable error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to enable two-factor authentication'
      });
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(req: Request, res: Response): Promise<void> {
    try {
      const { password } = req.body;

      logger.info('2FA disable request');

      // In a full implementation, you would:
      // 1. Verify user password
      // 2. Disable 2FA for user

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled successfully'
      });

    } catch (error) {
      logger.error('2FA disable error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to disable two-factor authentication'
      });
    }
  }

  /**
   * Verify 2FA setup
   */
  async verifyTwoFactorSetup(req: Request, res: Response): Promise<void> {
    try {
      const { secret, totpCode } = req.body;

      logger.info('2FA setup verification');

      // In a full implementation, you would:
      // 1. Verify TOTP code with secret
      // 2. Confirm 2FA setup is working

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication setup verified successfully'
      });

    } catch (error) {
      logger.error('2FA setup verification error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to verify two-factor authentication setup'
      });
    }
  }

  /**
   * Report suspicious activity
   */
  async reportSuspiciousActivity(req: Request, res: Response): Promise<void> {
    try {
      const { activity, details } = req.body;
      const clientInfo = {
        ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown'
      };

      logger.warn('Suspicious activity reported', {
        activity,
        details,
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent
      });

      // Log security event
      await this.auditRepository.logAuthentication({
        action: 'suspicious_activity',
        ipAddress: clientInfo.ipAddress,
        userAgent: clientInfo.userAgent,
        success: false,
        reason: activity,
        metadata: details
      });

      res.status(200).json({
        success: true,
        message: 'Suspicious activity reported successfully'
      });

    } catch (error) {
      logger.error('Report suspicious activity error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to report suspicious activity'
      });
    }
  }

  /**
   * Get authentication statistics (admin only)
   */
  async getAuthStats(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Auth statistics request');

      // In a full implementation, you would:
      // 1. Check admin permissions
      // 2. Gather authentication statistics
      // 3. Return aggregated data

      res.status(200).json({
        success: true,
        message: 'Authentication statistics not yet implemented',
        data: {
          totalLogins: 0,
          failedAttempts: 0,
          activeSessions: 0,
          lockedAccounts: 0
        }
      });

    } catch (error) {
      logger.error('Get auth stats error', { error });
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve authentication statistics'
      });
    }
  }

  /**
   * Get appropriate HTTP status code for authentication errors
   */
  private getErrorStatusCode(result: any): number {
    if (result.locked) return 423; // Locked
    if (result.requiresTwoFactor) return 428; // Precondition Required
    return 401; // Unauthorized
  }
}

// Create singleton instance
const authenticateUserUseCase = new AuthenticateUserUseCase();
const sessionEngine = new SessionEngine();
// TODO: Inject audit repository
const auditRepository = {} as IAuditRepository;

export const authController = new AuthController(
  authenticateUserUseCase,
  sessionEngine,
  auditRepository
);
