import { IUserRepository, IPasswordResetRepository } from '../../domain/repositories';
import { PasswordHash } from '../../domain/value-objects/password-hash.value-object';
import { UserServiceClient } from '../../infrastructure/clients/user-service.client';
import { logger } from '../../infrastructure/services/logger.service';

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordOutput {
  success: boolean;
  message: string;
}

export class ResetPasswordUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordResetRepository: IPasswordResetRepository,
    private readonly userServiceClient: UserServiceClient
  ) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const token = (input.token || '').trim();
    const newPassword = input.newPassword || '';
    const confirmPassword = input.confirmPassword || '';

    if (!token) {
      return { success: false, message: 'Password reset token is required' };
    }

    if (!PasswordHash.isValidPassword(newPassword)) {
      return { success: false, message: 'Password must be at least 8 characters long' };
    }

    if (newPassword !== confirmPassword) {
      return { success: false, message: 'Passwords do not match' };
    }

    try {
      const resetRecord = await this.passwordResetRepository.findByToken(token);
      if (!resetRecord) {
        return { success: false, message: 'Invalid or unrecognized reset token' };
      }

      if (resetRecord.used) {
        return { success: false, message: 'This reset token has already been used' };
      }

      if (resetRecord.expiresAt < new Date()) {
        return { success: false, message: 'This reset token has expired' };
      }

      const user = await this.userRepository.findById(resetRecord.userId);
      if (!user) {
        return { success: false, message: 'Associated user account not found' };
      }

      const passwordHash = await PasswordHash.fromPlainPassword(newPassword);

      // Use the domain method — do NOT raw-mutate (user as any).passwordHash
      user.changePassword(passwordHash);

      // Persist the new password hash directly via the dedicated update path.
      // userRepository.save() only syncs login-tracking fields (failedLoginAttempts,
      // lockoutUntil, lastLoginAt) and would silently discard the passwordHash.
      await this.userServiceClient.updatePassword(user.id, passwordHash.toString());
      await this.passwordResetRepository.markAsUsed(resetRecord.id);

      logger.info('[AuthService] Password reset successful', {
        userId: user.id,
        email: user.email
      });

      return {
        success: true,
        message: 'Your password has been successfully reset. You may now log in.'
      };
    } catch (error: any) {
      logger.error('[AuthService] Error executing reset password use case', {
        token,
        error: error?.message || error
      });
      return {
        success: false,
        message: 'An unexpected error occurred while resetting your password'
      };
    }
  }
}
