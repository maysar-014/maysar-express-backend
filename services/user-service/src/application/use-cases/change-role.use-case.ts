import { IUserRepository } from '../../domain/repositories';
import { RoleChangeEvent } from '../sagas/role-change.saga';
import { sagaEventHandler } from '../sagas/saga-event-handler';
import { logger } from '../../infrastructure/services/logger.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from '../sagas/service-clients';

export interface ChangeRoleInput {
  userId: string;
  newRole: string;
  changedBy: string;
  promotionReason?: string | undefined;
}

export interface ChangeRoleOutput {
  success: boolean;
  message: string;
  oldRole?: string;
  newRole?: string;
}

export class ChangeRoleUseCase {
  constructor(
    private userRepository: IUserRepository,
    private emailService: EmailService,
    private notificationClient: NotificationServiceClient
  ) { }

  async execute(input: ChangeRoleInput): Promise<ChangeRoleOutput> {
    try {
      logger.logBusiness('Starting role change', input.changedBy, { userId: input.userId, newRole: input.newRole });

      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Only admins can change roles
      const admin = await this.userRepository.findById(input.changedBy);
      if (admin?.role !== 'system') {
        return { success: false, message: 'Only administrators can change user roles' };
      }

      // Validate role
      const validRoles = ['buyer', 'seller', 'supplier', 'courier', 'enabler', 'system'];
      if (!validRoles.includes(input.newRole)) {
        return { success: false, message: 'Invalid role' };
      }

      const oldRole = user.role;
      if (oldRole === input.newRole) {
        return { success: false, message: 'User already has this role' };
      }

      // Update user role
      await this.userRepository.updateRole(input.userId, input.newRole as any);

      // Publish role change event to trigger saga
      const event: RoleChangeEvent = {
        eventId: `role-change-${input.userId}-${Date.now()}`,
        aggregateId: input.userId,
        userId: input.userId,
        oldRole,
        newRole: input.newRole,
        changedBy: input.changedBy,
        timestamp: new Date()
      };

      await sagaEventHandler.handleRoleChangeEvent(event, this.emailService, this.notificationClient);

      logger.logBusiness('Role changed successfully', input.changedBy, {
        userId: input.userId,
        oldRole,
        newRole: input.newRole
      });

      return {
        success: true,
        message: 'Role changed successfully',
        oldRole,
        newRole: input.newRole
      };

    } catch (error) {
      logger.error('Failed to change role', { userId: input.userId, changedBy: input.changedBy, error });
      return { success: false, message: 'Failed to change role' };
    }
  }
}
