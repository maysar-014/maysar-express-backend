import { SmsMessage } from '../entities/sms-message.entity';

/**
 * Retry Policy
 * Determines retry eligibility and backoff strategy for failed SMS messages
 */

export interface RetryConfig {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
}

export class RetryPolicy {
    private readonly config: RetryConfig;

    constructor(config?: Partial<RetryConfig>) {
        this.config = {
            maxRetries: config?.maxRetries ?? 3,
            baseDelayMs: config?.baseDelayMs ?? 1000, // 1 second
            maxDelayMs: config?.maxDelayMs ?? 300000, // 5 minutes
            backoffMultiplier: config?.backoffMultiplier ?? 2
        };
    }

    /**
     * Check if a message is eligible for retry
     */
    canRetry(message: SmsMessage): boolean {
        // Must be in FAILED status
        if (!message.isFailed()) {
            return false;
        }

        // Must not have exceeded max retries
        if (message.getRetryCount() >= this.config.maxRetries) {
            return false;
        }

        return true;
    }

    /**
     * Calculate the next retry delay using exponential backoff
     */
    calculateRetryDelay(retryCount: number): number {
        const delay = this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, retryCount);
        return Math.min(delay, this.config.maxDelayMs);
    }

    /**
     * Calculate when the next retry should occur
     */
    calculateNextRetryAt(message: SmsMessage): Date {
        const delay = this.calculateRetryDelay(message.getRetryCount());
        return new Date(Date.now() + delay);
    }

    /**
     * Get retry delay in human-readable format
     */
    getRetryDelayDescription(retryCount: number): string {
        const delayMs = this.calculateRetryDelay(retryCount);
        const seconds = Math.floor(delayMs / 1000);
        const minutes = Math.floor(seconds / 60);

        if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''}`;
        }
        return `${seconds} second${seconds > 1 ? 's' : ''}`;
    }

    /**
     * Check if enough time has passed for a retry
     */
    isRetryDue(message: SmsMessage, currentTime: Date = new Date()): boolean {
        if (!this.canRetry(message)) {
            return false;
        }

        const failedAt = message.getFailedAt();
        if (!failedAt) {
            return false;
        }

        const nextRetryAt = this.calculateNextRetryAt(message);
        return currentTime >= nextRetryAt;
    }

    /**
     * Get the maximum number of retries allowed
     */
    getMaxRetries(): number {
        return this.config.maxRetries;
    }

    /**
     * Get retry attempts remaining for a message
     */
    getRemainingRetries(message: SmsMessage): number {
        return Math.max(0, this.config.maxRetries - message.getRetryCount());
    }

    /**
     * Check if this is the final retry attempt
     */
    isFinalRetry(message: SmsMessage): boolean {
        return message.getRetryCount() === this.config.maxRetries - 1;
    }

    /**
     * Get retry configuration
     */
    getConfig(): Readonly<RetryConfig> {
        return { ...this.config };
    }
}
