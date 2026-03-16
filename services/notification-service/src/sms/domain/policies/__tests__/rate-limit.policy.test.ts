import { RateLimitPolicy } from '../rate-limit.policy';

describe('RateLimitPolicy', () => {
    let policy: RateLimitPolicy;

    beforeEach(() => {
        policy = new RateLimitPolicy();
    });

    describe('isRateLimitExceeded', () => {
        it('should not exceed when count is below limit', () => {
            const start = new Date('2024-01-01T10:00:00Z');
            const end = new Date('2024-01-01T10:01:00Z');
            const current = new Date('2024-01-01T10:00:30Z');

            const result = policy.isRateLimitExceeded(5, start, end, current);

            expect(result.exceeded).toBe(false);
        });

        it('should exceed per-minute limit', () => {
            const start = new Date('2024-01-01T10:00:00Z');
            const end = new Date('2024-01-01T10:01:00Z');
            const current = new Date('2024-01-01T10:00:30Z');

            const result = policy.isRateLimitExceeded(10, start, end, current);

            expect(result.exceeded).toBe(true);
            expect(result.reason).toContain('10 messages per minute');
            expect(result.retryAfter).toEqual(end);
        });

        it('should exceed per-hour limit', () => {
            const start = new Date('2024-01-01T10:00:00Z');
            const end = new Date('2024-01-01T11:00:00Z');
            const current = new Date('2024-01-01T10:30:00Z');

            const result = policy.isRateLimitExceeded(100, start, end, current);

            expect(result.exceeded).toBe(true);
            expect(result.reason).toContain('100 messages per hour');
        });

        it('should exceed per-day limit', () => {
            const start = new Date('2024-01-01T00:00:00Z');
            const end = new Date('2024-01-02T00:00:00Z');
            const current = new Date('2024-01-01T12:00:00Z');

            const result = policy.isRateLimitExceeded(1000, start, end, current);

            expect(result.exceeded).toBe(true);
            expect(result.reason).toContain('1000 messages per day');
        });

        it('should not exceed when outside time window', () => {
            const start = new Date('2024-01-01T10:00:00Z');
            const end = new Date('2024-01-01T10:01:00Z');
            const current = new Date('2024-01-01T11:00:00Z');

            const result = policy.isRateLimitExceeded(100, start, end, current);

            expect(result.exceeded).toBe(false);
        });
    });

    describe('isUserRateLimitExceeded', () => {
        it('should exceed user limit', () => {
            const result = policy.isUserRateLimitExceeded(20);

            expect(result.exceeded).toBe(true);
            expect(result.reason).toContain('20 messages per hour per user');
        });

        it('should not exceed when below limit', () => {
            const result = policy.isUserRateLimitExceeded(10);

            expect(result.exceeded).toBe(false);
        });
    });

    describe('isPhoneNumberRateLimitExceeded', () => {
        it('should exceed phone number limit', () => {
            const result = policy.isPhoneNumberRateLimitExceeded(5);

            expect(result.exceeded).toBe(true);
            expect(result.reason).toContain('5 messages per day per number');
        });

        it('should not exceed when below limit', () => {
            const result = policy.isPhoneNumberRateLimitExceeded(3);

            expect(result.exceeded).toBe(false);
        });
    });

    describe('getTimeWindows', () => {
        it('should calculate time windows correctly', () => {
            const current = new Date('2024-01-01T10:30:45Z');
            const windows = policy.getTimeWindows(current);

            const expectedMinuteStart = new Date(current);
            expectedMinuteStart.setSeconds(0, 0);
            const expectedHourStart = new Date(current);
            expectedHourStart.setMinutes(0, 0, 0);
            const expectedDayStart = new Date(current);
            expectedDayStart.setHours(0, 0, 0, 0);

            expect(windows.minute.windowStart).toEqual(expectedMinuteStart);
            expect(windows.hour.windowStart).toEqual(expectedHourStart);
            expect(windows.day.windowStart).toEqual(expectedDayStart);
        });
    });

    describe('getRemainingQuota', () => {
        it('should calculate remaining quota', () => {
            expect(policy.getRemainingQuota('minute', 5)).toBe(5);
            expect(policy.getRemainingQuota('hour', 80)).toBe(20);
            expect(policy.getRemainingQuota('day', 900)).toBe(100);
        });

        it('should return 0 when quota exceeded', () => {
            expect(policy.getRemainingQuota('minute', 15)).toBe(0);
        });
    });

    describe('calculateThrottleDelay', () => {
        it('should return 60s when at limit', () => {
            expect(policy.calculateThrottleDelay(10)).toBe(60000);
        });

        it('should calculate spacing when below limit', () => {
            const delay = policy.calculateThrottleDelay(5);
            expect(delay).toBeGreaterThan(0);
        });
    });

    describe('shouldThrottle', () => {
        it('should throttle at 80% threshold', () => {
            expect(policy.shouldThrottle(8)).toBe(true);
        });

        it('should not throttle below threshold', () => {
            expect(policy.shouldThrottle(5)).toBe(false);
        });
    });

    describe('getRateLimitDescription', () => {
        it('should return human-readable description', () => {
            const desc = policy.getRateLimitDescription();
            expect(desc).toContain('10/min');
            expect(desc).toContain('100/hour');
            expect(desc).toContain('1000/day');
        });
    });
});
