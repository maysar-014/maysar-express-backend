import { NotificationEngine } from '../notification.engine';

describe('NotificationEngine', () => {
    let engine: NotificationEngine;

    beforeEach(() => {
        engine = new NotificationEngine();
    });

    it('should select optimal channel', () => {
        const channel = engine.selectChannel({ userId: 'u1', type: 'transactional' });

        expect(['email', 'sms', 'push']).toContain(channel);
    });

    it('should batch notifications', () => {
        const notifications = [
            { id: 'n1', userId: 'u1', type: 'email' },
            { id: 'n2', userId: 'u1', type: 'email' }
        ];

        const batches = engine.batchNotifications(notifications as any);

        expect(batches.length).toBeGreaterThan(0);
    });

    it('should calculate send time', () => {
        const sendTime = engine.calculateOptimalSendTime('u1', 'marketing');

        expect(sendTime).toBeInstanceOf(Date);
    });
});
