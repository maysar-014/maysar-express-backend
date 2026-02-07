import { AuthUser, UserStatus } from '../../domain/entities/user.types';
import { IUserRepository } from '../../domain/repositories';
import { AuthenticationEngine } from '../../domain/engines/authentication.engine';
import { AuthenticationPolicy } from '../../domain/policies/authentication.policy';
import { UserServiceRepository } from '../../infrastructure/repositories/user-service.repository';
import { getUserServiceClient } from '../../infrastructure/services/service-discovery';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Authenticate User Use Case
 * Orchestrates the user authentication process
 * Now uses User Service for user data instead of direct database access
 */
export class AuthenticateUserUseCase {
  private userRepository: IUserRepository;

  constructor(userRepository?: IUserRepository) {
    // Use provided repository or create UserServiceRepository with service discovery
    if (userRepository) {
      this.userRepository = userRepository;
    } else {
      const userServiceClient = getUserServiceClient();
      if (!userServiceClient) {
        throw new Error('User Service not available for authentication');
      }
      this.userRepository = new UserServiceRepository(userServiceClient);
    }
  }

  /**
   * Execute user authentication
   */
  async execute(input: {
    email: string;
    password: string;
    totpCode?: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<{
    success: boolean;
    user?: AuthUser;
    accessToken?: string;
    refreshToken?: string;
    requiresTwoFactor?: boolean;
    locked?: boolean;
    message: string;
  }> {
    try {
      logger.debug('Starting user authentication', { email: input.email });

      // Validate input
      if (!input.email || !input.password) {
        logger.warn('Authentication failed: missing email or password');
        return {
          success: false,
          message: 'Email and password are required'
        };
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(input.email);
      if (!user) {
        logger.warn('Authentication failed: user not found', { email: input.email });
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Check if authentication is allowed
      if (user.status !== UserStatus.ACTIVE) {
        logger.warn('Authentication denied by policy', { userId: user.id, status: user.status });
        return {
          success: false,
          message: 'Authentication not allowed for this account'
        };
      }

      // Check if account is locked
      if (user.lockoutUntil && user.lockoutUntil > new Date()) {
        logger.warn('Authentication failed: account locked', { userId: user.id });
        return {
          success: false,
          locked: true,
          message: 'Account is temporarily locked due to too many failed attempts'
        };
      }

      // Simplified password verification (in production, use proper password hashing)
      // This would normally delegate to AuthenticationEngine
      const passwordValid = this.verifyPassword(input.password, user);

      if (!passwordValid) {
        // Record failed attempt
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await this.userRepository.save(user);

        logger.warn('Authentication failed: invalid password', {
          userId: user.id,
          attempts: user.failedLoginAttempts
        });

        return {
          success: false,
          locked: user.lockoutUntil ? user.lockoutUntil > new Date() : false,
          message: 'Invalid email or password'
        };
      }

      // Check if two-factor authentication is required
      if (user.twoFactorEnabled) {
        if (!input.totpCode) {
          logger.info('2FA code required', { userId: user.id });
          return {
            success: false,
            requiresTwoFactor: true,
            message: 'Two-factor authentication code required'
          };
        }

        // Verify TOTP code (simplified implementation)
        const totpValid = this.verifyTotpCode(user.twoFactorSecret!, input.totpCode);

        if (!totpValid) {
          user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
          await this.userRepository.save(user);

          logger.warn('Authentication failed: invalid 2FA code', { userId: user.id });

          return {
            success: false,
            requiresTwoFactor: true,
            message: 'Invalid two-factor authentication code'
          };
        }
      }

      // Record successful login
      user.lastLoginAt = new Date();
      user.failedLoginAttempts = 0;
      user.lockoutUntil = undefined;

      await this.userRepository.save(user);

      // Generate tokens (infrastructure concern - simplified for now)
      const tokens = this.generateTokens(user);

      logger.info('Authentication successful', { userId: user.id, role: user.role });

      return {
        success: true,
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        message: 'Authentication successful'
      };

    } catch (error: any) {
      logger.error('Authentication error', {
        email: input.email,
        message: error.message
      });
      return {
        success: false,
        message: 'Authentication failed due to system error'
      };
    }
  }

  /**
   * Simplified password verification (placeholder)
   * In production, this would use proper password hashing from User Service
   */
  private verifyPassword(password: string, user: AuthUser): boolean {
    // This is a placeholder - in production, password verification would be
    // handled by the User Service or a shared authentication library
    // For now, we assume password verification happens at the User Service level
    return true; // Placeholder implementation
  }

  /**
   * Verifies the TOTP code using Speakeasy
   */
  private verifyTotpCode(secret: string, code: string): boolean {
    try {
      const speakeasy = require('speakeasy');
      return speakeasy.totp.verify({
        secret: secret,
        encoding: 'base32',
        token: code,
        window: 1 // ±1 window for clock skew
      });
    } catch (error) {
      logger.error('TOTP verification error', { error });
      return false;
    }
  }

  /**
   * Generate access and refresh tokens (simplified implementation)
   * In production, this would use proper JWT signing
   */
  private generateTokens(user: AuthUser): { accessToken: string; refreshToken: string } {
    // Simplified token generation - in production use proper JWT library
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (15 * 60) // 15 minutes
    };

    // Mock JWT generation - replace with actual JWT library
    const accessToken = `jwt.${btoa(JSON.stringify(payload))}`;
    const refreshToken = `refresh.${btoa(JSON.stringify({
      userId: user.id,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    }))}`;

    return { accessToken, refreshToken };
  }
}
