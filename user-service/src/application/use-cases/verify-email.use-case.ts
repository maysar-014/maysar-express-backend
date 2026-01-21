import { IUserRepository } from '../../domain/repositories';
import { UserPolicies } from '../../domain/policies/user-policies';
import { UserEmailVerifiedEvent, IDomainEventPublisher } from '../../domain/events';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Input for verifying user email
 */
export interface VerifyEmailInput {
  userId: string;
  verificationToken: string;
  verifiedBy?: string; // Admin user ID if verified by admin
}

/**
 * Output from verifying user email
 */
export interface VerifyEmailOutput {
  success: boolean;
  message: string;
  emailVerified: boolean;
  verificationMethod: 'token' | 'admin';
}

/**
 * Use case for verifying user email addresses
 * Handles both token-based and admin verification
 */
export class VerifyEmailUseCase {
  constructor(
    private userRepository: IUserRepository,
    private eventPublisher: IDomainEventPublisher
  ) {}

  /**
   * Execute the verify email use case
   */
  async execute(input: VerifyEmailInput): Promise<VerifyEmailOutput> {
    try {
      logger.logBusiness('Starting email verification', input.verifiedBy || 'system', {
        userId: input.userId,
        method: input.verifiedBy ? 'admin' : 'token'
      });

      // Find the user
      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          emailVerified: false,
          verificationMethod: 'token'
        };
      }

      // Check business rules for verification
      const canVerify = UserPolicies.canVerifyUser(user, 'email');
      if (!canVerify.allowed) {
        return {
          success: false,
          message: canVerify.reason || 'Email verification not allowed',
          emailVerified: false,
          verificationMethod: 'token'
        };
      }

      // If already verified, return success
      if (user.isEmailVerified) {
        return {
          success: true,
          message: 'Email already verified',
          emailVerified: true,
          verificationMethod: 'token'
        };
      }

      const verificationMethod: 'token' | 'admin' = input.verifiedBy ? 'admin' : 'token';

      // For token-based verification, validate the token
      if (verificationMethod === 'token') {
        const tokenValid = await this.validateVerificationToken(user.id, input.verificationToken);
        if (!tokenValid) {
          // Record failed verification attempt
          await this.recordVerificationAttempt(user.id, false, 'invalid_token');

          return {
            success: false,
            message: 'Invalid or expired verification token',
            emailVerified: false,
            verificationMethod: 'token'
          };
        }

        // Mark token as used
        await this.markTokenAsUsed(user.id, input.verificationToken);
      }

      // Update user email verification status
      await this.userRepository.updateEmailVerification(user.id, true);

      // Record successful verification attempt
      await this.recordVerificationAttempt(user.id, true, verificationMethod);

      // Publish domain event
      const emailVerifiedEvent = new UserEmailVerifiedEvent(
        user.id,
        user.email.toString(),
        verificationMethod
      );

      await this.eventPublisher.publish(emailVerifiedEvent);

      logger.logBusiness('Email verified successfully', input.verifiedBy || 'system', {
        userId: input.userId,
        email: user.email.toString(),
        method: verificationMethod
      });

      return {
        success: true,
        message: 'Email verified successfully',
        emailVerified: true,
        verificationMethod
      };

    } catch (error) {
      logger.error('Failed to verify email', {
        userId: input.userId,
        verifiedBy: input.verifiedBy,
        error
      });

      return {
        success: false,
        message: 'Failed to verify email',
        emailVerified: false,
        verificationMethod: 'token'
      };
    }
  }

  /**
   * Validate email verification token
   */
  private async validateVerificationToken(userId: string, token: string): Promise<boolean> {
    try {
      // In a real implementation, this would be a repository method
      // For now, we'll assume token validation logic
      // This should be implemented in the repository with proper token management
      logger.debug('Validating verification token', { userId, tokenLength: token.length });
      return true; // Simplified for now
    } catch (error) {
      logger.error('Error validating verification token', { userId, error });
      return false;
    }
  }

  /**
   * Mark verification token as used
   */
  private async markTokenAsUsed(userId: string, token: string): Promise<void> {
    try {
      // In a real implementation, this would be a repository method
      logger.debug('Marking verification token as used', { userId });
      // Token cleanup would happen here
    } catch (error) {
      logger.error('Error marking token as used', { userId, error });
      // Don't throw - verification succeeded even if cleanup fails
    }
  }

  /**
   * Record verification attempt for auditing
   */
  private async recordVerificationAttempt(
    userId: string,
    success: boolean,
    method: string
  ): Promise<void> {
    try {
      await this.userRepository.recordSecurityEvent(userId, {
        action: 'email_verification',
        success,
        metadata: {
          method,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error recording verification attempt', { userId, error });
      // Don't throw - verification succeeded even if audit fails
    }
  }
}
