import { NotificationEngine } from '../notification.engine';

describe('NotificationEngine', () => {
    let engine: NotificationEngine;

    beforeEach(() => {
        engine = new NotificationEngine();
    });

    it('should process notification request', async () => {
        const result = await engine.processNotificationRequest({
            recipientId: 'u1',
            recipientType: 'customer',
            channels: [
                { type: 'sms', address: '+255712345678', preferred: true, verified: true }
            ],
            templateId: 'order_confirmed',
            data: { orderId: 'o1', totalAmount: '100', currency: 'TZS' },
            priority: 'high'
        });

        expect(result.success).toBe(true);
        expect(result.notificationId).toBeTruthy();
    });
});
