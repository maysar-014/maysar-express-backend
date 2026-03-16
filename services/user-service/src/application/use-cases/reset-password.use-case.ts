import { ChangePasswordUseCase } from './change-password.use-case';
import { PrismaPasswordResetTokenRepository } from '../../infrastructure/repositories/prisma-password-reset-token.repository';

export interface ResetPasswordInput {
  userId: string;
  token: string;
  newPassword: string;
}

export interface ResetPasswordOutput {
  success: boolean;
  message: string;
}

export class ResetPasswordUseCase {
  constructor(
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly passwordResetTokens: PrismaPasswordResetTokenRepository
  ) {}

  async execute(input: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const record = await this.passwordResetTokens.findByToken(input.token);
    if (!record || record.used || record.expiresAt < new Date()) {
      return {
        success: false,
        message: 'Invalid or expired password reset token'
      };
    }

    if (record.userId !== input.userId) {
      return {
        success: false,
        message: 'Invalid password reset token'
      };
    }

    const result = await this.changePasswordUseCase.execute({
      userId: input.userId,
      newPassword: input.newPassword,
      changedBy: input.userId,
      currentPassword: '',
      reason: 'user_initiated'
    });

    if (!result.success) {
      return { success: false, message: result.message };
    }

    await this.passwordResetTokens.markAsUsed(record.id);

    return {
      success: true,
      message: 'Password reset successfully'
    };
  }
}
