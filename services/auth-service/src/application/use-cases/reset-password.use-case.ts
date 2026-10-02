import { IPasswordResetUserReader, IPasswordResetRepository } from '../../domain/repositories';
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
    private readonly userRepository: IPasswordResetUserReader,
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

      // `user` here is the AuthUser DTO (domain/entities/user.types.ts), NOT the
      // User domain entity, so it has no changePassword() and no passwordHash.
      // Calling it threw "user.changePassword is not a function", so password
      // reset failed on every attempt. The aggregate-mutation rule belongs to the
      // domain entity (which User does implement, and which registration uses);
      // on this path the authoritative write is the dedicated update below.
      // Persist the new password hash via the dedicated update path.
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
