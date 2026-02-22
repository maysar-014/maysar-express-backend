import { NotificationPriorityPolicy } from '../notification-priority.policy';

describe('NotificationPriorityPolicy', () => {
    let policy: NotificationPriorityPolicy;

    beforeEach(() => {
        policy = new NotificationPriorityPolicy();
    });

    it('should determine priority', () => {
        const priority = policy.determinePriority({ type: 'security_alert' });

        expect(priority).toBe('critical');
    });

    it('should calculate delay', () => {
        const delay = policy.calculateDelay('low');

        expect(delay).toBeGreaterThan(0);
    });

    it('should prioritize critical over normal', () => {
        expect(policy.shouldSendImmediately('critical')).toBe(true);
        expect(policy.shouldSendImmediately('low')).toBe(false);
    });
});
