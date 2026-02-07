import { UUID } from './types';

export namespace NotificationService {
    export namespace Events {
        export interface NotificationSent {
            notificationId: UUID;
            recipient: string;
            channel: 'email' | 'sms' | 'push';
            sentAt: Date;
        }

        export interface NotificationFailed {
            notificationId: UUID;
            recipient: string;
            reason: string;
            failedAt: Date;
        }
    }

    export namespace Commands {
        export interface SendNotification {
            recipient: string;
            channel: 'email' | 'sms' | 'push';
            templateId: string;
            data: any;
        }
    }
}
