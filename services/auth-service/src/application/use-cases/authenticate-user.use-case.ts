import { AuthUser, UserStatus } from '../../domain/entities/user.types';
import { IUserRepository } from '../../domain/repositories';
import { UserServiceRepository } from '../../infrastructure/repositories/user-service.repository';
import { getUserServiceClient } from '../../infrastructure/services/service-discovery';
import { logger } from '../../infrastructure/services/logger.service';
import { AuthEventPublisher } from '../../infrastructure/messaging/auth-event-publisher';
import * as speakeasy from 'speakeasy';
import jwt from 'jsonwebtoken';

/**
 * Authenticate User Use Case
 * Orchestrates the user authentication process
 * Now uses User Service for user data instead of direct database access
 */
export class AuthenticateUserUseCase {
  private userRepository: IUserRepository;

  constructor(
    userRepository?: IUserRepository,
    private readonly eventPublisher?: AuthEventPublisher
  ) {
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

      // Find user by email. Treat repository upstream failures as authentication failures
      // to avoid leaking infrastructure errors through the login API.
      let user: AuthUser | null = null;
      try {
        user = await this.userRepository.findByEmail(input.email);
      } catch (error: any) {
        logger.error('Authentication user lookup failed', {
          email: input.email,
          message: error?.message
        });
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      if (!user) {
        logger.warn('Authentication failed: user not found', { email: input.email });
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Resolve effective status.
      //
      // LOCKED is a time-bounded state written by the brute-force guard.  If
      // the lockout window has already expired the account should be treated as
      // ACTIVE for the purpose of the status gate below.  The User Service
      // repository will restore the persisted status to ACTIVE once the login
      // succeeds (via recordSuccessfulLogin).
      const now = new Date();
      const lockoutExpired =
        user.status === UserStatus.LOCKED &&
        (!user.lockoutUntil || user.lockoutUntil <= now);

      const effectiveStatus: UserStatus = lockoutExpired ? UserStatus.ACTIVE : user.status;

      // Gate: only ACTIVE and PENDING_VERIFICATION accounts may authenticate.
      const allowedStatuses = new Set<UserStatus>([
        UserStatus.ACTIVE,
        UserStatus.PENDING_VERIFICATION
      ]);
      if (!allowedStatuses.has(effectiveStatus)) {
        logger.warn('Authentication denied by policy', { userId: user.id, status: user.status });
        return {
          success: false,
          message: 'Authentication not allowed for this account'
        };
      }

      // Check if the active lockout window is still in effect.
      if (user.lockoutUntil && user.lockoutUntil > now) {
        logger.warn('Authentication failed: account locked', { userId: user.id, lockoutUntil: user.lockoutUntil });
        return {
          success: false,
          locked: true,
          message: 'Account is temporarily locked due to too many failed attempts'
        };
      }

      // Simplified password verification (in production, use proper password hashing)
      // This would normally delegate to AuthenticationEngine
      let passwordValid = false;
      try {
        passwordValid = await this.verifyPassword(input.password, user);
      } catch (error: any) {
        logger.error('Password verification failed', {
          userId: user.id,
          message: error?.message
        });
        return {
          success: false,
          message: 'Authentication unavailable'
        };
      }

      if (!passwordValid) {
        // Record failed attempt
        user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

        // Lock account after 5 failed attempts
        if (user.failedLoginAttempts >= 5) {
          user.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        }

        await this.persistUserState(user, 'invalid-password');
        await this.publishAuthLoginFailed(user, 'invalid-password');

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
          await this.persistUserState(user, 'invalid-2fa');
          await this.publishAuthLoginFailed(user, 'invalid-2fa');

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

      await this.persistUserState(user, 'successful-login');
      await this.publishAuthLoginSuccess(user);

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
        message: 'Invalid email or password'
      };
    }
  }

  /**
   * Best-effort persistence of auth-related user state.
   * Authentication should not fail solely because state sync failed.
   */
  private async persistUserState(user: AuthUser, stage: string): Promise<void> {
    try {
      await this.userRepository.save(user);
    } catch (error: any) {
      logger.error('Failed to persist auth user state', {
        userId: user.id,
        stage,
        message: error?.message
      });
    }
  }

  private async publishAuthLoginFailed(user: AuthUser, reason: string): Promise<void> {
    if (!this.eventPublisher) return;
    await this.eventPublisher.publish('AuthLoginFailed', {
      userId: user.id,
      failedLoginAttempts: user.failedLoginAttempts ?? 0,
      lockoutUntil: user.lockoutUntil ? user.lockoutUntil.toISOString() : null,
      reason
    });
  }

  private async publishAuthLoginSuccess(user: AuthUser): Promise<void> {
    if (!this.eventPublisher) return;
    await this.eventPublisher.publish('AuthLoginSuccess', {
      userId: user.id,
      lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : new Date().toISOString(),
      failedLoginAttempts: 0,
      lockoutUntil: null
    });
  }

  /**
   * Simplified password verification (placeholder)
   * In production, this would use proper password hashing from User Service
   */
  private async verifyPassword(_password: string, _user: AuthUser): Promise<boolean> {
    const user = _user as AuthUser & {
      password?: string;
      passwordHash?: { verifyPassword?: (password: string) => Promise<boolean> | boolean };
    };

    if (typeof user.password === 'string') {
      return user.password === _password;
    }

    if (user.passwordHash && typeof user.passwordHash.verifyPassword === 'function') {
      return await user.passwordHash.verifyPassword(_password);
    }

    throw new Error('Password verification is not configured. Provide a real credential validation flow.');
  }

  /**
   * Verifies the TOTP code using Speakeasy
   */
  private verifyTotpCode(secret: string, code: string): boolean {
    try {
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
    const roles = this.resolveUserRoles(user);
    const payload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      roles,
      iat: Math.floor(Date.now() / 1000)
    };

    const issuer = process.env.JWT_ISSUER || 'maysar-auth-service';
    const audience = process.env.JWT_AUDIENCE;
    const algorithm = (process.env.JWT_ALGORITHM || 'HS256') as jwt.Algorithm;
    const usesAsymmetricSigning = algorithm.startsWith('RS') || algorithm.startsWith('ES');
    const jwtSecret = usesAsymmetricSigning ? process.env.JWT_PRIVATE_KEY : process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error(
        usesAsymmetricSigning
          ? 'JWT_PRIVATE_KEY is required when JWT_ALGORITHM uses asymmetric signing.'
          : 'JWT_SECRET is required to issue tokens.'
      );
    }

    const accessToken = jwt.sign(payload, jwtSecret, {
      expiresIn: (process.env.JWT_ACCESS_TOKEN_EXPIRY || '1d') as jwt.SignOptions['expiresIn'],
      algorithm,
      issuer,
      ...(audience ? { audience } : {})
    });

    const refreshToken = jwt.sign(
      {
        userId: user.id,
        type: 'refresh'
      },
      jwtSecret,
      {
        expiresIn: '7d',
        algorithm,
        issuer,
        ...(audience ? { audience } : {})
      }
    );

    return { accessToken, refreshToken };
  }

  private resolveUserRoles(user: AuthUser): string[] {
    const metadataRoles = user.metadata?.roles;
    const candidateRoles = Array.isArray(metadataRoles)
      ? metadataRoles
      : typeof metadataRoles === 'string'
        ? metadataRoles.split(',')
        : [];
    const normalizedRoles = candidateRoles
      .map((role) => String(role).trim().toLowerCase())
      .filter(Boolean);

    const fallbackRole = String(user.role || '').trim().toLowerCase();

    if (normalizedRoles.length > 0) {
      // Always ensure 'admin'+'system' are present for system users
      let roles = normalizedRoles;
      if (fallbackRole === 'system' && !normalizedRoles.includes('admin')) {
        roles = Array.from(new Set(['admin', 'system', ...normalizedRoles]));
      } else {
        roles = Array.from(new Set(normalizedRoles));
      }
      // Each account carries only its explicitly assigned roles.
      // Buyer injection removed — a seller account should not carry BUYER unless explicitly configured.
      return roles;
    }

    // Fallback: derive from user.role
    if (fallbackRole === 'system') {
      return ['admin', 'system'];
    }

    // Return only the single primary role — no implicit buyer injection
    return [fallbackRole].filter(Boolean);
  }
}
