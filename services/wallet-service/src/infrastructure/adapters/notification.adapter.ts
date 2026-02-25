import { logger } from '../services/logger.service';

type WalletNotificationType = 'wallet_credited' | 'wallet_debited' | 'wallet_frozen' | 'wallet_unfrozen' | 'hold_created' | 'hold_released' | 'topup_initiated' | 'payout_initiated';

interface WalletNotificationData {
    amount?: number;
    currency?: string;
    description?: string;
    correlationId?: string;
}

/**
 * Notification Adapter Interface
 */
export interface INotificationAdapter {
    sendWalletNotification(userId: string, type: WalletNotificationType, data: WalletNotificationData): Promise<void>;
}

/**
 * Mock Notification Adapter
 * Usually this would interact with a Notification Service or external provider (SMS/Email)
 */
export class NotificationAdapter implements INotificationAdapter {
    async sendWalletNotification(userId: string, type: WalletNotificationType, data: WalletNotificationData): Promise<void> {
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
