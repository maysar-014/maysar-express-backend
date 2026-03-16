import { NotificationPriorityPolicy } from '../notification-priority.policy';

describe('NotificationPriorityPolicy', () => {
    let policy: NotificationPriorityPolicy;

    beforeEach(() => {
        policy = new NotificationPriorityPolicy();
    });

    it('should score priority', () => {
        const score = policy.getPriority({ priority: 'high' } as any);
        expect(score).toBeGreaterThan(0);
    });

    it('should determine quiet hours bypass', () => {
        expect(policy.shouldBypassQuietHours({ priority: 'urgent' } as any)).toBe(true);
        expect(policy.shouldBypassQuietHours({ priority: 'low' } as any)).toBe(false);
    });

    it('should return delivery window', () => {
        expect(policy.getDeliveryWindow('medium')).toBeGreaterThan(0);
    });
});
