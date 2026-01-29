import { IUserRepository } from '../../domain/repositories';
import { UserPasswordChangedEvent } from '../../domain/events';
import { sagaEventHandler } from '../sagas/saga-event-handler';
import { logger } from '../../infrastructure/services/logger.service';

export interface ChangePasswordInput {
  userId: string;
  currentPassword?: string | undefined;
  newPassword: string;
  changedBy: string;
  reason?: 'user_initiated' | 'admin_reset' | 'security_policy' | undefined;
}

export interface ChangePasswordOutput {
  success: boolean;
  message: string;
}

export class ChangePasswordUseCase {
  constructor(
    private userRepository: IUserRepository
  ) {}

  async execute(input: ChangePasswordInput): Promise<ChangePasswordOutput> {
    try {
      logger.logBusiness('Starting password change', input.changedBy, { userId: input.userId });

      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Authorization: user can change own password or admin can reset
      const isOwner = input.userId === input.changedBy;
      const isAdmin = (await this.userRepository.findById(input.changedBy))?.role === 'system';
      
      if (!isOwner && !isAdmin) {
        return { success: false, message: 'Insufficient permissions' };
      }

      // Validate new password
      if (!input.newPassword || input.newPassword.length < 8) {
        return { success: false, message: 'Password must be at least 8 characters' };
      }

      // Update password
      await this.userRepository.updatePassword(input.userId, input.newPassword);

      // Publish password changed event to trigger saga
      const reason = input.reason || (isOwner ? 'user_initiated' : 'admin_reset');
      const event = new UserPasswordChangedEvent(
        input.userId,
        input.changedBy,
        reason as 'user_initiated' | 'admin_reset' | 'security_policy'
      );

      await sagaEventHandler.handleUserPasswordChangedEvent(event);

      logger.logBusiness('Password changed successfully', input.changedBy, {
        userId: input.userId,
        reason
      });

      return { success: true, message: 'Password changed successfully. All sessions have been invalidated.' };

    } catch (error) {
      logger.error('Failed to change password', { userId: input.userId, changedBy: input.changedBy, error });
      return { success: false, message: 'Failed to change password' };
    }
  }
}
