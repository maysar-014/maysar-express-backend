import { RetryPolicy } from '../retry.policy';
import { SmsMessage, SmsStatus } from '../../entities/sms-message.entity';

const createFailedMessage = (retryCount: number, failedAt?: Date): SmsMessage => {
    const message = SmsMessage.reconstitute({
        id: 'msg-1',
        phoneNumber: '+254712345678',
        content: 'Test',
        status: SmsStatus.FAILED,
        retryCount,
        maxRetries: 3,
        failedAt: failedAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    });
    return message;
};

describe('RetryPolicy', () => {
    let policy: RetryPolicy;

    beforeEach(() => {
        policy = new RetryPolicy();
    });

    describe('canRetry', () => {
        it('should allow retry for failed message below max retries', () => {
            const message = createFailedMessage(1);
            expect(policy.canRetry(message)).toBe(true);
        });

        it('should not allow retry when max retries exceeded', () => {
            const message = createFailedMessage(3);
            expect(policy.canRetry(message)).toBe(false);
        });

        it('should not allow retry for non-failed message', () => {
            const message = SmsMessage.reconstitute({
                id: 'msg-1',
                phoneNumber: '+254712345678',
                content: 'Test',
                status: SmsStatus.SENT,
                retryCount: 0,
                maxRetries: 3,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            expect(policy.canRetry(message)).toBe(false);
        });
    });

    describe('calculateRetryDelay', () => {
        it('should calculate exponential backoff', () => {
            expect(policy.calculateRetryDelay(0)).toBe(1000);
            expect(policy.calculateRetryDelay(1)).toBe(2000);
            expect(policy.calculateRetryDelay(2)).toBe(4000);
        });

        it('should cap at max delay', () => {
            const delay = policy.calculateRetryDelay(20);
            expect(delay).toBeLessThanOrEqual(300000);
        });
    });

    describe('calculateNextRetryAt', () => {
        it('should calculate next retry time', () => {
            const message = createFailedMessage(1);
            const nextRetry = policy.calculateNextRetryAt(message);
            
            expect(nextRetry.getTime()).toBeGreaterThan(Date.now());
        });
    });

    describe('getRetryDelayDescription', () => {
        it('should return seconds for short delays', () => {
            const desc = policy.getRetryDelayDescription(0);
            expect(desc).toContain('second');
        });

        it('should return minutes for long delays', () => {
            const desc = policy.getRetryDelayDescription(10);
            expect(desc).toContain('minute');
        });
    });

    describe('isRetryDue', () => {
        it('should return true when retry time has passed', () => {
            const pastTime = new Date(Date.now() - 10000);
            const message = createFailedMessage(0, pastTime);
            const currentTime = new Date();
            
            expect(policy.isRetryDue(message, currentTime)).toBe(true);
        });

        it('should return false when retry time has not passed', () => {
            const message = createFailedMessage(0, new Date());
            const currentTime = new Date(Date.now() + 100);
            
            expect(policy.isRetryDue(message, currentTime)).toBe(false);
        });

        it('should return false when cannot retry', () => {
            const message = createFailedMessage(3);
            expect(policy.isRetryDue(message)).toBe(false);
        });
    });

    describe('getRemainingRetries', () => {
        it('should calculate remaining retries', () => {
            const message = createFailedMessage(1);
            expect(policy.getRemainingRetries(message)).toBe(2);
        });

        it('should return 0 when no retries left', () => {
            const message = createFailedMessage(3);
            expect(policy.getRemainingRetries(message)).toBe(0);
        });
    });

    describe('isFinalRetry', () => {
        it('should return true on final retry', () => {
            const message = createFailedMessage(2);
            expect(policy.isFinalRetry(message)).toBe(true);
        });

        it('should return false when retries remain', () => {
            const message = createFailedMessage(1);
            expect(policy.isFinalRetry(message)).toBe(false);
        });
    });

    describe('getMaxRetries', () => {
        it('should return max retries', () => {
            expect(policy.getMaxRetries()).toBe(3);
        });
    });

    describe('getConfig', () => {
        it('should return config copy', () => {
            const config = policy.getConfig();
            expect(config.maxRetries).toBe(3);
            expect(config.baseDelayMs).toBe(1000);
        });
    });
});
