import { NotificationDeliveryPolicy } from '../notification-delivery.policy';

describe('NotificationDeliveryPolicy', () => {
    let policy: NotificationDeliveryPolicy;

    beforeEach(() => {
        policy = new NotificationDeliveryPolicy();
    });

    it('should allow delivery within quiet hours', () => {
        const canDeliver = policy.canDeliverNow('email', new Date('2024-01-01T10:00:00'));

        expect(canDeliver).toBe(true);
    });

    it('should respect quiet hours', () => {
        const canDeliver = policy.canDeliverNow('push', new Date('2024-01-01T02:00:00'));

        expect(canDeliver).toBe(false);
    });

    it('should calculate retry delay', () => {
        const delay = policy.calculateRetryDelay(2);

        expect(delay).toBeGreaterThan(0);
    });
});
