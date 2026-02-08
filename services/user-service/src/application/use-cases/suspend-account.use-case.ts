import { IUserRepository } from '../../domain/repositories';
import { AccountSuspensionEvent } from '../sagas/account-suspension.saga';
import { sagaEventHandler } from '../sagas/saga-event-handler';
import { logger } from '../../infrastructure/services/logger.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from '../sagas/service-clients';

export interface SuspendAccountInput {
  userId: string;
  suspendedBy: string;
  reason: string;
  duration?: number | undefined;
}

export interface SuspendAccountOutput {
  success: boolean;
  message: string;
  suspensionEndDate?: Date | undefined;
}

export class SuspendAccountUseCase {
  constructor(
    private userRepository: IUserRepository,
    private emailService: EmailService,
    private notificationClient: NotificationServiceClient
  ) { }

  async execute(input: SuspendAccountInput): Promise<SuspendAccountOutput> {
    try {
      logger.logBusiness('Starting account suspension', input.suspendedBy, { userId: input.userId });

      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Only admins can suspend accounts
      const admin = await this.userRepository.findById(input.suspendedBy);
      if (admin?.role !== 'system') {
        return { success: false, message: 'Only administrators can suspend accounts' };
      }

      // Update user status to suspended
      await this.userRepository.updateStatus(input.userId, 'suspended' as any);

      // Publish suspension event to trigger saga
      const event: AccountSuspensionEvent = {
        eventId: `account-suspension-${input.userId}-${Date.now()}`,
        aggregateId: input.userId,
        userId: input.userId,
        reason: input.reason,
        suspendedBy: input.suspendedBy,
        ...(input.duration && { duration: input.duration }),
        timestamp: new Date()
      };

      await sagaEventHandler.handleAccountSuspensionEvent(event, this.emailService, this.notificationClient);

      const suspensionEndDate = input.duration
        ? new Date(Date.now() + input.duration)
        : undefined;

      logger.logBusiness('Account suspended successfully', input.suspendedBy, {
        userId: input.userId,
        reason: input.reason,
        duration: input.duration
      });

      return {
        success: true,
        message: 'Account suspended successfully',
        suspensionEndDate
      };

    } catch (error) {
      logger.error('Failed to suspend account', { userId: input.userId, suspendedBy: input.suspendedBy, error });
      return { success: false, message: 'Failed to suspend account' };
    }
  }
}
