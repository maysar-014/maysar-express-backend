import { logger } from '../services/logger.service';

/**
 * Notification Adapter Interface
 */
export interface INotificationAdapter {
    sendWalletNotification(userId: string, type: string, data: any): Promise<void>;
}

/**
 * Mock Notification Adapter
 * Usually this would interact with a Notification Service or external provider (SMS/Email)
 */
export class NotificationAdapter implements INotificationAdapter {
    async sendWalletNotification(userId: string, type: string, data: any): Promise<void> {
        logger.info(`Sending wallet notification to user ${userId}`, {
            notificationType: type,
            data
        });

        // In a real implementation:
        // await this.notificationServiceClient.send({
        //     userId,
        //     message: `Your wallet was ${type} with ${data.amount}`,
        //     channel: 'SMS'
        // });

        return Promise.resolve();
    }
}
