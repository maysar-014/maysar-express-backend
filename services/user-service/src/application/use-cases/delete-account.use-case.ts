import { IUserRepository } from '../../domain/repositories';
import { sagaEventHandler } from '../sagas/saga-event-handler';
import { logger } from '../../infrastructure/services/logger.service';
import { EmailService } from '../../infrastructure/services/email.service';
import { NotificationServiceClient } from '../sagas/service-clients';

export interface AccountDeletionEvent {
  eventId: string;
  aggregateId: string;
  userId: string;
  reason: string;
  deletedBy: string;
  timestamp: Date;
  userData: {
    email: string;
    role: string;
    status: string;
    registeredAt: Date;
    lastLoginAt: Date | null;
  };
}

export interface DeleteAccountInput {
  userId: string;
  deletedBy: string;
  reason: string;
  verificationToken?: string | undefined;
}

export interface DeleteAccountOutput {
  success: boolean;
  message: string;
  deletionScheduledAt?: Date;
}

export class DeleteAccountUseCase {
  constructor(
    private userRepository: IUserRepository,
    private emailService: EmailService,
    private notificationClient: NotificationServiceClient
  ) { }

  async execute(input: DeleteAccountInput): Promise<DeleteAccountOutput> {
    try {
      logger.logBusiness('Starting account deletion', input.deletedBy, { targetUserId: input.userId });

      const user = await this.userRepository.findById(input.userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Authorization: user can delete own account or admin can delete any
      const isOwner = input.userId === input.deletedBy;
      const isAdmin = (await this.userRepository.findById(input.deletedBy))?.role === 'system';

      if (!isOwner && !isAdmin) {
        return { success: false, message: 'Insufficient permissions' };
      }

      // Mark user as deleted (if method exists)
      if ('markAsDeleted' in this.userRepository) {
        await (this.userRepository as any).markAsDeleted(input.userId);
      }

      // Publish deletion event to trigger saga
      const event: AccountDeletionEvent = {
        eventId: `account-deletion-${input.userId}-${Date.now()}`,
        aggregateId: input.userId,
        userId: input.userId,
        reason: input.reason,
        deletedBy: input.deletedBy,
        timestamp: new Date(),
        userData: {
          email: user.email.toString(),
          role: user.role,
          status: user.status,
          registeredAt: user.createdAt,
          lastLoginAt: user.lastLoginAt ?? null
        }
      };

      await sagaEventHandler.handleAccountDeletionEvent(event, this.emailService, this.notificationClient);

      logger.logBusiness('Account deletion initiated', input.deletedBy, {
        userId: input.userId,
        reason: input.reason
      });

      return {
        success: true,
        message: 'Account deletion initiated. Data will be anonymized within 24 hours.',
        deletionScheduledAt: new Date()
      };

    } catch (error) {
      logger.error('Failed to delete account', { userId: input.userId, deletedBy: input.deletedBy, error });
      return { success: false, message: 'Failed to delete account' };
    }
  }
}
