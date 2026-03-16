import { NotificationDeliveryPolicy } from '../notification-delivery.policy';
import { Notification } from '../../entities/notification.entity';
import { NotificationContent } from '../../value-objects/notification-content.value-object';
import { NotificationPreference } from '../../entities/notification-preference.entity';

describe('NotificationDeliveryPolicy', () => {
    let policy: NotificationDeliveryPolicy;

    beforeEach(() => {
        policy = new NotificationDeliveryPolicy();
    });

    it('should allow delivery when preference enabled and under rate limit', () => {
        const notification = Notification.create({
            id: 'n1',
            userId: 'u1',
            type: 'email',
            channel: 'email',
            subject: 'Test',
            content: NotificationContent.create('Test content')
        });
        const preference = NotificationPreference.create({
            id: 'p1',
            userId: 'u1',
            channel: 'email',
            enabled: true
        });

        const result = policy.canSendNotification({ id: 'u1' }, notification, preference, 0);
        expect(result.allowed).toBe(true);
    });

    it('should block when rate limit exceeded', () => {
        const notification = Notification.create({
            id: 'n1',
            userId: 'u1',
            type: 'email',
            channel: 'email',
            subject: 'Test',
            content: NotificationContent.create('Test content')
        });
        const preference = NotificationPreference.create({
            id: 'p1',
            userId: 'u1',
            channel: 'email',
            enabled: true
        });

        const result = policy.canSendNotification({ id: 'u1' }, notification, preference, 100);
        expect(result.allowed).toBe(false);
    });

    it('should calculate retry delay', () => {
        const delay = policy.getRetryDelay(2);
        expect(delay).toBeGreaterThan(0);
    });
});
