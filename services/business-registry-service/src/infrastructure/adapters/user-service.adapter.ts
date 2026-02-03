import { IUserServiceAdapter } from '../../domain/ports/user-service.port';
import { INotificationAdapter } from '../../domain/ports';
import { logger } from '../services/logger.service';

/**
 * User Service Adapter - Notifies user service when business is registered
 * Uses notification adapter to send in-app notification to owner
 */
export class UserServiceAdapter implements IUserServiceAdapter {
  constructor(private readonly notificationAdapter?: INotificationAdapter) {}

  async notifyBusinessRegistered(params: {
    ownerId: string;
    businessId: string;
    businessName: string;
    correlationId: string;
  }): Promise<void> {
    if (this.notificationAdapter) {
      await this.notificationAdapter.sendNotification({
        userId: params.ownerId,
        channel: 'in-app',
        subject: 'Business Registered',
        content: `Your business "${params.businessName}" has been registered. Business ID: ${params.businessId}`,
        metadata: {
          businessId: params.businessId,
          type: 'business_registered',
          correlationId: params.correlationId
        }
      });
    } else {
      logger.info('UserServiceAdapter: notifyBusinessRegistered (no notification adapter)', {
        ownerId: params.ownerId,
        businessId: params.businessId
      });
    }
  }
}
