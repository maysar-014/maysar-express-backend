/**
 * Data Transfer Objects for SMS Service
 * DTOs for API communication and data transfer across layers
 */

// ==================== Request DTOs ====================

export interface SendSmsDto {
    phoneNumber: string;
    message: string;
    userId?: string;
    scheduledAt?: Date;
    metadata?: Record<string, any>;
}

export interface BatchSendSmsDto {
    messages: SendSmsDto[];
}

export interface RetrySmsDto {
    messageId: string;
}

export interface RetryFailedMessagesDto {
    maxRetries?: number;
    limit?: number;
}

export interface GetSmsStatusDto {
    messageId: string;
}

export interface QuerySmsDto {
    userId?: string;
    phoneNumber?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
}

// ==================== Response DTOs ====================

export interface SmsResponseDto {
    id: string;
    phoneNumber: string;
    message: string;
    status: string;
    userId?: string;
    providerId?: string;
    providerMessageId?: string;
    retryCount: number;
    maxRetries: number;
    segmentCount: number;
    encoding: string;
    scheduledAt?: string;
    sentAt?: string;
    deliveredAt?: string;
    failedAt?: string;
    lastError?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface SendSmsResponseDto {
    success: boolean;
    messageId: string;
    status: string;
    segmentCount: number;
    estimatedCost?: number;
    message?: string;
}

export interface BatchSendSmsResponseDto {
    success: boolean;
    results: SendSmsResponseDto[];
    totalAccepted: number;
    totalRejected: number;
}

export interface SmsStatusDto {
    messageId: string;
    status: string;
    phoneNumber: string;
    sentAt?: string;
    deliveredAt?: string;
    failedAt?: string;
    lastError?: string;
    retryCount: number;
    canRetry: boolean;
}

export interface RetryResultDto {
    messageId: string;
    success: boolean;
    newStatus: string;
    retryCount: number;
    message?: string;
}

export interface RetryFailedMessagesResponseDto {
    totalProcessed: number;
    totalRetried: number;
    totalFailed: number;
    results: RetryResultDto[];
}

export interface SmsStatisticsDto {
    total: number;
    queued: number;
    sending: number;
    sent: number;
    delivered: number;
    failed: number;
    cancelled: number;
    undelivered: number;
    deliveryRate: number;
    failureRate: number;
}

export interface RateLimitInfoDto {
    remainingMinute: number;
    remainingHour: number;
    remainingDay: number;
    resetAtMinute: string;
    resetAtHour: string;
    resetAtDay: string;
}

// ==================== Provider DTOs ====================

export interface ProviderConfigDto {
    providerId: string;
    providerName: string;
    isActive: boolean;
    priority: number;
    rateLimits: {
        messagesPerSecond: number;
        messagesPerMinute: number;
    };
}

export interface DeliveryCallbackDto {
    providerMessageId: string;
    status: 'delivered' | 'undelivered' | 'failed';
    errorCode?: string;
    errorMessage?: string;
    timestamp: string;
    providerId: string;
}

// ==================== Error Response DTOs ====================

export interface ErrorResponseDto {
    success: false;
    error: {
        code: string;
        message: string;
        details?: any;
    };
    timestamp: string;
}

// ==================== Validation Schemas ====================

export const SendSmsDtoSchema = {
    phoneNumber: {
        type: 'string',
        required: true,
        pattern: /^\+[1-9]\d{7,14}$/,
        message: 'Must be a valid phone number in E.164 format (e.g., +255712345678)'
    },
    message: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: 1530,
        message: 'Message must be between 1 and 1530 characters'
    },
    userId: {
        type: 'string',
        required: false
    },
    scheduledAt: {
        type: 'date',
        required: false
    },
    metadata: {
        type: 'object',
        required: false
    }
};
