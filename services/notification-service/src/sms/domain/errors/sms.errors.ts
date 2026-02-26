/**
 * Domain-specific errors for SMS service
 */

export class SmsError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class InvalidPhoneNumberError extends SmsError {
    constructor(phoneNumber: string, reason?: string) {
        super(
            reason
                ? `Invalid phone number "${phoneNumber}": ${reason}`
                : `Invalid phone number: ${phoneNumber}`
        );
    }
}

export class MessageTooLongError extends SmsError {
    constructor(length: number, maxLength: number) {
        super(`Message too long: ${length} characters. Maximum allowed is ${maxLength} characters`);
    }
}

export class ProviderError extends SmsError {
    public readonly providerName: string;
    public readonly statusCode?: string;
    public readonly isRetryable: boolean;

    constructor(
        providerName: string,
        message: string,
        statusCode?: string,
        isRetryable: boolean = false
    ) {
        super(`${providerName} error: ${message}`);
        this.providerName = providerName;
        this.statusCode = statusCode;
        this.isRetryable = isRetryable;
    }
}

export class RateLimitExceededError extends SmsError {
    public readonly limit: number;
    public readonly windowMs: number;
    public readonly retryAfter?: Date;

    constructor(limit: number, windowMs: number, retryAfter?: Date) {
        const windowSeconds = Math.floor(windowMs / 1000);
        super(
            `Rate limit exceeded: ${limit} messages per ${windowSeconds} seconds. ${retryAfter ? `Retry after ${retryAfter.toISOString()}` : ''
            }`
        );
        this.limit = limit;
        this.windowMs = windowMs;
        this.retryAfter = retryAfter;
    }
}

export class MessageNotFoundError extends SmsError {
    constructor(messageId: string) {
        super(`SMS message not found: ${messageId}`);
    }
}

export class InvalidStateTransitionError extends SmsError {
    constructor(from: string, to: string, reason?: string) {
        super(
            `Invalid state transition from ${from} to ${to}${reason ? `: ${reason}` : ''}`
        );
    }
}

export class MaxRetriesExceededError extends SmsError {
    public readonly messageId: string;
    public readonly retryCount: number;

    constructor(messageId: string, retryCount: number) {
        super(`Maximum retries exceeded for message ${messageId}: ${retryCount} attempts`);
        this.messageId = messageId;
        this.retryCount = retryCount;
    }
}

export class ProviderNotAvailableError extends SmsError {
    public readonly providerName: string;

    constructor(providerName: string, reason?: string) {
        super(`Provider ${providerName} is not available${reason ? `: ${reason}` : ''}`);
        this.providerName = providerName;
    }
}
