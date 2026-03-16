import { logger } from '../services/logger.service';
import { eventBus } from '@shared/events/eventBus';

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
 * Notification Adapter
 * Publishes wallet notification events for downstream services (SMS/Email/etc).
 */
export class NotificationAdapter implements INotificationAdapter {
    async sendWalletNotification(userId: string, type: WalletNotificationType, data: WalletNotificationData): Promise<void> {
        logger.info(`Sending wallet notification to user ${userId}`, {
            notificationType: type,
            data
        });

        await eventBus.publish('WalletNotificationRequested', {
            userId,
            type,
            data
        }, data.correlationId ? { correlationId: data.correlationId } : undefined);
    }
}
