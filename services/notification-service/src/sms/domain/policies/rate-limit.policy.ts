/**
 * Rate Limit Policy
 * Enforces rate limiting for SMS sending to prevent abuse and comply with provider limits
 */

export interface RateLimitConfig {
    maxMessagesPerMinute: number;
    maxMessagesPerHour: number;
    maxMessagesPerDay: number;
    perUserLimitPerHour?: number;
    perPhoneNumberLimitPerDay?: number;
}

export interface RateLimitWindow {
    count: number;
    windowStart: Date;
    windowEnd: Date;
}

export class RateLimitPolicy {
    private readonly config: RateLimitConfig;

    constructor(config?: Partial<RateLimitConfig>) {
        this.config = {
            maxMessagesPerMinute: config?.maxMessagesPerMinute ?? 10,
            maxMessagesPerHour: config?.maxMessagesPerHour ?? 100,
            maxMessagesPerDay: config?.maxMessagesPerDay ?? 1000,
            perUserLimitPerHour: config?.perUserLimitPerHour ?? 20,
            perPhoneNumberLimitPerDay: config?.perPhoneNumberLimitPerDay ?? 5
        };
    }

    /**
     * Check if rate limit is exceeded based on message count in time window
     */
    isRateLimitExceeded(
        messageCount: number,
        windowStart: Date,
        windowEnd: Date,
        currentTime: Date = new Date()
    ): { exceeded: boolean; reason?: string; retryAfter?: Date } {
        // Check if we're still in the time window
        if (currentTime < windowStart || currentTime > windowEnd) {
            return { exceeded: false };
        }

        const windowDurationMs = windowEnd.getTime() - windowStart.getTime();
        const oneMinute = 60 * 1000;
        const oneHour = 60 * oneMinute;
        const oneDay = 24 * oneHour;

        // Determine which limit applies
        if (windowDurationMs <= oneMinute) {
            if (messageCount >= this.config.maxMessagesPerMinute) {
                return {
                    exceeded: true,
                    reason: `Rate limit exceeded: ${this.config.maxMessagesPerMinute} messages per minute`,
                    retryAfter: windowEnd
                };
            }
        } else if (windowDurationMs <= oneHour) {
            if (messageCount >= this.config.maxMessagesPerHour) {
                return {
                    exceeded: true,
                    reason: `Rate limit exceeded: ${this.config.maxMessagesPerHour} messages per hour`,
                    retryAfter: windowEnd
                };
            }
        } else if (windowDurationMs <= oneDay) {
            if (messageCount >= this.config.maxMessagesPerDay) {
                return {
                    exceeded: true,
                    reason: `Rate limit exceeded: ${this.config.maxMessagesPerDay} messages per day`,
                    retryAfter: windowEnd
                };
            }
        }

        return { exceeded: false };
    }

    /**
     * Check if per-user rate limit is exceeded
     */
    isUserRateLimitExceeded(messageCount: number): { exceeded: boolean; reason?: string } {
        if (this.config.perUserLimitPerHour && messageCount >= this.config.perUserLimitPerHour) {
            return {
                exceeded: true,
                reason: `User rate limit exceeded: ${this.config.perUserLimitPerHour} messages per hour per user`
            };
        }
        return { exceeded: false };
    }

    /**
     * Check if per-phone-number rate limit is exceeded
     */
    isPhoneNumberRateLimitExceeded(messageCount: number): { exceeded: boolean; reason?: string } {
        if (
            this.config.perPhoneNumberLimitPerDay &&
            messageCount >= this.config.perPhoneNumberLimitPerDay
        ) {
            return {
                exceeded: true,
                reason: `Phone number rate limit exceeded: ${this.config.perPhoneNumberLimitPerDay} messages per day per number`
            };
        }
        return { exceeded: false };
    }

    /**
     * Calculate rate limit windows for current time
     */
    getTimeWindows(currentTime: Date = new Date()): {
        minute: RateLimitWindow;
        hour: RateLimitWindow;
        day: RateLimitWindow;
    } {
        const minuteStart = new Date(currentTime);
        minuteStart.setSeconds(0, 0);
        const minuteEnd = new Date(minuteStart.getTime() + 60 * 1000);

        const hourStart = new Date(currentTime);
        hourStart.setMinutes(0, 0, 0);
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

        const dayStart = new Date(currentTime);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        return {
            minute: {
                count: 0,
                windowStart: minuteStart,
                windowEnd: minuteEnd
            },
            hour: {
                count: 0,
                windowStart: hourStart,
                windowEnd: hourEnd
            },
            day: {
                count: 0,
                windowStart: dayStart,
                windowEnd: dayEnd
            }
        };
    }

    /**
     * Get remaining quota for a time window
     */
    getRemainingQuota(
        windowType: 'minute' | 'hour' | 'day',
        currentCount: number
    ): number {
        const limits = {
            minute: this.config.maxMessagesPerMinute,
            hour: this.config.maxMessagesPerHour,
            day: this.config.maxMessagesPerDay
        };

        const limit = limits[windowType];
        return Math.max(0, limit - currentCount);
    }

    /**
     * Get rate limit configuration
     */
    getConfig(): Readonly<RateLimitConfig> {
        return { ...this.config };
    }

    /**
     * Calculate throttle delay based on current rate
     */
    calculateThrottleDelay(messagesInLastMinute: number): number {
        if (messagesInLastMinute >= this.config.maxMessagesPerMinute) {
            // Need to wait until next minute window
            return 60000; // 1 minute
        }

        // Calculate spacing to stay under rate limit
        const desiredGapMs = 60000 / this.config.maxMessagesPerMinute;
        return Math.max(0, desiredGapMs);
    }

    /**
     * Check if sending should be throttled
     */
    shouldThrottle(messagesInLastMinute: number): boolean {
        return messagesInLastMinute >= this.config.maxMessagesPerMinute * 0.8; // 80% threshold
    }

    /**
     * Get human-readable rate limit description
     */
    getRateLimitDescription(): string {
        return `${this.config.maxMessagesPerMinute}/min, ${this.config.maxMessagesPerHour}/hour, ${this.config.maxMessagesPerDay}/day`;
    }
}
